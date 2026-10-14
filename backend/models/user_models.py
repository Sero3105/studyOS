"""SQLAlchemy model for the application users.

Questo modulo descrive la tabella `users` che rappresenta l'entità principale
per l'autenticazione e il profilo utente dell'applicazione StudyOS.

Regole di dominio importanti:
- `username` e `email` devono essere unici, perché vengono usati per
  identificare in modo univoco l'account del singolo utente.
- `password_hash` non deve mai contenere la password in chiaro: va salvato
  il valore hash ottenuto da un algoritmo di hashing sicuro.
- `full_name` è opzionale perché non tutti gli utenti hanno necessariamente
  un nome completo definito al momento della registrazione.

Questo modello è il punto di partenza per tutte le query di lettura/scrittura
relative agli utenti, e viene usato insieme a SQLAlchemy per creare la tabella
nel database configurato dal progetto.
"""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """Rappresenta un utente registrato nel sistema.

    La classe eredita da `Base`, ovvero dalla base declarativa di SQLAlchemy,
    che permette di mappare questa classe direttamente su una tabella del DB.
    Ogni attributo della classe corrisponde a una colonna della tabella `users`.
    """

    __tablename__ = "users"

    # Identificatore primario univoco della riga. In SQLAlchemy, `Integer`
    # con `primary_key=True` produce una colonna autoincrementale in genere.
    id = Column(Integer, primary_key=True)

    # Nome completo dell'utente. È opzionale perché la registrazione può
    # avvenire anche senza completare completamente il profilo.
    full_name = Column(String)

    # Username utilizzato per identificare l'utente. Deve essere unico, poiché
    # spesso viene usato per login o per query di ricerca.
    username = Column(String, unique=True, nullable=False)

    # Email dell'utente. Anche questa colonna deve essere unica per evitare
    # duplicati e permettere eventuali procedure di reset password o contatto.
    email = Column(String, unique=True, nullable=False)

    # Password già trasformata in hash. Non memorizziamo mai la password in chiaro.
    # L'hashing avviene prima del salvataggio tramite il service di creazione utente.
    password_hash = Column(String, nullable=False)

    auth_sessions = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )
    exams = relationship("Exam", back_populates="user", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
