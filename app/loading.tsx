export default function Loading() {
  return <main className="permission-denied" role="status" aria-live="polite">
    <span className="kicker">Opening the ledger</span>
    <h1>Loading this workbench…</h1>
    <p>Fetching the requested page state. No action has been submitted.</p>
  </main>;
}
