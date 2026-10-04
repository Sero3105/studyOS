import Header from '../components/Header'

/**
 * Dashboard principale dell'applicazione.
 *
 * Questa pagina rappresenta la "homepage" della piattaforma. Attualmente mostra
 * un'intestazione personalizzata e un titolo di sezione, ma in futuro qui si
 * potranno aggiungere:
 * - statistiche di studio,
 * - prossimi obiettivi,
 * - attività recenti,
 * - riepiloghi settimanali.
 *
 * Il componente `Header` riceve il nome dell'utente e lo usa per personalizzare
 * il saluto. È un esempio di componente presentazionale che riceve props.
 */
function DashboardPage() {
  return (
    <>
      <Header userName="Matteo" />

      <section className="dashboard-page">
        <h2>Dashboard</h2>
      </section>
    </>
  )
}

export default DashboardPage