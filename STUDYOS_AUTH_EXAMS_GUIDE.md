# Guida didattica: autenticazione ed Exams in StudyOS

## 1. Cosa è cambiato

In origine StudyOS aveva registrazione/login, ma il login restituiva solo l'utente: dopo il refresh del browser React perdeva lo stato e il backend non poteva identificare con sicurezza il chiamante. Mancava inoltre la persistenza degli esami. L'implementazione aggiunge una sessione completa: JWT breve per le API, refresh token opaco revocabile sul server e Exams legati all'utente autenticato.

I due confini sono intenzionali: il frontend migliora l'esperienza, ma FastAPI decide sempre chi può leggere o creare dati. SQLite conserva utenti, sessioni e esami; SQLAlchemy traduce classi Python in query SQL.

## 2. Architettura e flussi

```
React page -> service TypeScript -> apiClient (Bearer/cookie) -> FastAPI router
     ^                                                        |
     | JSON                                            schema Pydantic
     +------------------------- service <- modello SQLAlchemy <- SQLite
```

`frontend/src/context/AuthProvider.tsx` mantiene solo l'access token in memoria tramite `apiClient.ts`; il refresh token non passa mai a JavaScript. Le pagine chiamano servizi (`authService.ts`, `examService.ts`), non `fetch` direttamente. I router sono il confine HTTP, i service contengono query/regole, gli schema validano/serializzano e i modelli rappresentano tabelle.

```
login -> authenticate_user -> pwdlib.verify -> create JWT + AuthSession
browser <- JWT JSON + CSRF JSON + refresh HttpOnly cookie
GET /exams -> Authorization: Bearer JWT -> get_current_user -> query filtrata
```

## 3. Autenticazione concreta

### Registrazione e password

`backend/services/createUser.py` usa `PasswordHash.recommended()` per produrre `password_hash`; la password non è una colonna del modello e `UserResponse` non restituisce hash. `authenticateUser.py` cerca l'email e usa `password_hasher.verify(password, user.password_hash)`. Entrambi gli errori di credenziali diventano `401` senza rivelare se l'email esiste.

### JWT e accesso alle API

`backend/services/token_service.py:create_access_token(user_id)` firma con PyJWT un payload:

```python
{"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=...)}
```

`sub` è l'identità, `iat` l'emissione, `exp` la scadenza. `decode_access_token` impone quei claim e accetta esclusivamente l'algoritmo configurato, HS256. `SECRET_KEY`, algoritmo e durate vengono da `.env`; `backend/config.py:validate_security_settings()` rifiuta chiavi assenti, corte o prevedibili all'avvio. Un JWT è firmato, non cifrato: non inserire mai password o dati privati nel payload.

`backend/dependencies/auth_dependency.py:get_current_user` legge l'header Bearer, decodifica il JWT, richiede un `sub` intero positivo e carica `User`. Token malformato, scaduto o utente rimosso restituiscono `401`. Usarlo così evita `user_id` client-side:

```python
def action(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service(user.id, db)
```

### Refresh, CSRF e logout

`AuthSession` (`backend/models/auth_session_models.py`) conserva solo hash SHA-256 di refresh e CSRF, scadenza, revoca e sostituzione. `create_refresh_session` genera token casuali con `secrets.token_urlsafe`; il browser riceve il refresh come cookie `HttpOnly`, `SameSite=Lax`, `Secure` in produzione e path `/auth`.

`POST /auth/refresh` richiede cookie e header `X-CSRF-Token`. `rotate_refresh_session` controlla hash/scadenza/CSRF, revoca il record corrente e crea una sessione nuova. Il riuso di un refresh già revocato revoca tutte le sessioni ancora attive dell'utente: è una misura contro il furto del token. `POST /auth/logout` revoca la sessione server-side e cancella il cookie; non basta cancellare React.

`frontend/src/services/apiClient.ts` allega il bearer e il CSRF header, usa `credentials: 'include'`, esegue un refresh al massimo una volta per richiesta e condivide `pendingRefresh` tra richieste contemporanee. Non usa `localStorage`. All'avvio `AuthProvider` chiama `refreshSession`; `ProtectedRoute.tsx` attende `isLoading` e poi reindirizza al login se necessario.

### File auth importanti

| File | Ruolo e quando modificarlo |
|---|---|
| `backend/config.py` | Legge ambiente e valida configurazione. Cambiare qui solo nuove impostazioni globali. |
| `backend/models/auth_session_models.py` | Tabella sessioni revocabili. Modifiche di colonne richiedono migrazione. |
| `backend/services/token_service.py` | Firma/verifica JWT e ciclo refresh. Modificarlo solo con test di rotazione/revoca. |
| `backend/routers/auth_router.py` | HTTP `/auth/login`, `/refresh`, `/logout`, `/me`; imposta cookie. |
| `backend/dependencies/auth_dependency.py` | Dipendenza riusabile per nuove API private. |
| `frontend/src/services/authService.ts` | Tipi/operazioni auth; salva token solo in memoria. |
| `frontend/src/context/AuthProvider.tsx` | Stato UI utente, ripristino e logout. |
| `frontend/src/services/apiClient.ts` | Client condiviso, retry e rete; non creare altri client duplicati. |

## 4. Exams: lettura e creazione

```
/exams -> ExamsPage.useEffect -> getExams -> Bearer JWT
-> exam_router GET -> get_current_user -> list_user_exams(user.id)
-> SELECT WHERE user_id = ? ORDER BY data/ora -> JSON -> ExamList
```

`backend/models/exam_models.py:Exam` contiene `user_id` con foreign key a `users.id`, testo, data/ora, stato e timestamp. La relazione inversa è `User.exams`. Gli indici su `user_id` e `exam_date` aiutano le letture. `ExamCreate` in `backend/schemas/exam_schemas.py` accetta solo campi modificabili, applica limiti e trim; `ExamResponse` espone il record ORM; `ExamStatus` limita gli stati. `exam_service.py:create_exam` fa add/commit/refresh e rollback in caso SQLAlchemy; `list_user_exams` filtra sempre proprietario e ordina data, ora, poi record senza ora.

```
Nuovo esame -> ExamCreateModal -> ExamForm (required, no doppio submit)
-> createExam(payload) -> POST /exams -> Pydantic -> user dal JWT
-> create_exam -> SQLite commit -> ExamResponse -> ExamsPage aggiunge/sorta card
```

Il client è `frontend/src/services/examService.ts`; non invia `user_id`. `ExamsPage.tsx` possiede loading/errore/modal/lista. `ExamForm.tsx` conserva i valori dopo un errore e chiude solo dopo successo. `ExamCreateModal.tsx` espone `role=dialog`, `aria-modal` e titolo. `ExamList.tsx` rende le card e traduce stati/data. Il piano citava `ExamCard.tsx`, ma non è stato creato: la card è attualmente l'`article` dentro `ExamList.tsx`. Gli stili sono in `frontend/src/styles/screens/exams.css` e importati da `styles/index.css`.

## 5. Modifiche future, in ordine

### A. Aggiungere `teacher` a Exam

1. Aggiungi la colonna nullable in `exam_models.py`.
2. Crea una migrazione (vedi sezione database): `create_all` non aggiunge colonne a tabelle già esistenti.
3. Aggiorna `ExamCreate` (input) e `ExamResponse` (output), con limite/trim.
4. Il service usa già `data.model_dump()`, quindi non serve logica ulteriore salvo regole business.
5. Aggiungi `teacher` a `Exam`, `CreateExamPayload`, `ExamForm` e `ExamList`.
6. Aggiorna test API e build/lint.

### B/C. Rendere obbligatorio un campo o aggiungere stato

Per obbligatorietà togli `None/default` e usa `Field(min_length=1)` nello schema; aggiungi `required` nel form per feedback immediato. Il backend resta la fonte di verità. Per uno stato, aggiungi membro a `ExamStatus`, una `<option>` nel form e una voce nella mappa `labels` di `ExamList`; testa valore valido e invalido.

### D/E. Ordinamento ed endpoint

Modifica l'`order_by` in `list_user_exams`, mai la pagina. Per una API (es. `GET /exams/{id}`): schema se serve, funzione service con `WHERE Exam.user_id == user.id`, route con `Depends(get_current_user)`, test 401/altro utente/positivo e metodo in `examService.ts`.

### F/G/K. Nuove aree private

Checklist: modello + migrazione; schema input/output; service filtrato per `user.id`; router con `get_current_user`; service TypeScript con `apiRequest`; pagina dentro `ProtectedRoute` in `main.tsx`; loading/errore/vuoto; CSS; test autorizzazione e persistenza. Non ricevere mai un `user_id` come prova di proprietà.

### H/I/J. Token e profilo

Modifica `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env` e riavvia: nuovi JWT avranno nuova durata. Per refresh cambia `REFRESH_TOKEN_EXPIRE_DAYS`, cookie e test di expiry/rotazione; durate più lunghe aumentano l'impatto di un furto. Un campo User richiede modello, migrazione, `UserResponse`, route/service appropriati, tipo `User` frontend e test.

## 6. Database e migrazioni

`Base.metadata.create_all(engine)` in `backend/database.py` crea tabelle mancanti perché importa i modelli, ma **non altera colonne esistenti**. Non cancellare `database/studyos.db`. Per un cambiamento di schema usare una migrazione SQL/Alembic con backup: aggiungere colonna nullable, popolare dati, poi eventualmente imporre `NOT NULL`. `commit` rende permanente la transazione, `refresh` rilegge ID/default generati, `rollback` annulla la transazione fallita.

## 7. Sicurezza: errori da evitare

- Non committare `.env`, segreti, password, token o log che li contengono; usa `.env.example` solo con placeholder.
- Non usare `AuthContext` come autorizzazione: è UI, l'API deve usare `get_current_user`.
- Non salvare access/refresh token in localStorage; non rimuovere CSRF dall'uso cookie.
- Non usare CORS `*` con credenziali: configura origini esplicite in `FRONTEND_ORIGINS`.
- Non fidarti di `user_id` nel body/query; filtra nel service.
- Ogni API/tipo/schema modificato richiede test e tipi TypeScript aggiornati.

## 8. Avvio, verifica e debugging

```sh
cd backend && source .venv/bin/activate && uvicorn main:app --reload
cd frontend && npm run dev
cd frontend && npm run build && npm run lint
```

Prima configura `.env` dalla struttura di `.env.example`; non copiarne la chiave placeholder in produzione. Swagger è su `http://127.0.0.1:8000/docs`: registra, fai login, copia l'access token nel pulsante Authorize Bearer e prova `POST/GET /exams`. Un 401 è token/sessione; un 422 è Pydantic/formato; un 500 richiede log backend; se il browser non arriva al server controlla `VITE_API_BASE_URL`, CORS e Network tab. La persistenza si verifica riaprendo `/exams` dopo refresh, non con dati locali.

Pytest è dichiarato in `backend/requirements.txt`, ma una suite automatizzata dedicata non è ancora stata aggiunta: creare database temporaneo e testare login, firma/expiry JWT, refresh, logout, isolamento e ordinamento prima di evolvere il codice.

## 9. Glossario

**JWT**: token firmato; **access token**: JWT breve per API; **refresh token**: segreto lungo per ottenere JWT; **claim**: campo del payload; **hashing**: trasformazione non reversibile; **autenticazione**: chi sei; **autorizzazione**: cosa puoi fare; **cookie HttpOnly**: cookie invisibile a JavaScript; **CSRF**: richiesta cross-site indesiderata; **CORS**: origini browser autorizzate; **router**: endpoint HTTP; **service**: regole/query; **schema**: validazione/JSON; **ORM**: classi→SQL; **foreign key**: collegamento referenziale; **migration**: evoluzione schema; **commit/rollback**: conferma/annullamento transazione.

## 10. Stato effettivo

Creati: `.env.example`, dipendenza auth, modello sessioni, `requirements.txt`, schema/token service auth, `ProtectedRoute`, modello/schema/service/router Exams, service/pagina/componenti/CSS Exams. Modificati: config, database, User, main, auth router, contesto e client auth, routing e CSS index.

Commit pubblicati e verificati: `54f709c feat(auth): implement JWT authentication and secure sessions`; `318f487 feat(exams): implement authenticated exam management MVP`, entrambi su `origin/feat-auth-exams-mvp`.

Verificati: compilazione backend, build e lint frontend, integrazione manuale login/endpoint protetto/refresh su SQLite temporaneo. Non verificati: test pytest completi e test UI automatici; sono il prossimo intervento consigliato. La specifica originale prevedeva temporaneamente `user_id` client-side: è stato deliberatamente sostituito dal JWT per sicurezza.
