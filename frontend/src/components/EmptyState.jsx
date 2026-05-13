export default function EmptyState({ message = "No hay datos disponibles.", action }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <svg
        width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: "var(--text-muted)", opacity: 0.4, margin: "0 auto 1rem" }}
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
      <p style={{ color: "var(--text-muted)", margin: 0 }}>{message}</p>
      {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
    </div>
  );
}
