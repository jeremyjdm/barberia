export default function LoadingSkeleton({ count = 3, type = "card" }) {
  const skeletons = Array.from({ length: count });

  if (type === "table") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {skeletons.map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.75rem 0" }}>
            <div className="skeleton" style={{ width: "20%", height: "1rem" }} />
            <div className="skeleton" style={{ width: "25%", height: "1rem" }} />
            <div className="skeleton" style={{ width: "15%", height: "1rem" }} />
            <div className="skeleton" style={{ width: "20%", height: "1rem" }} />
            <div className="skeleton" style={{ width: "10%", height: "1rem" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
      {skeletons.map((_, i) => (
        <div key={i} className="bento-card" style={{ gap: "0.75rem" }}>
          <div className="skeleton" style={{ width: "60%", height: "1.1rem" }} />
          <div className="skeleton" style={{ width: "40%", height: "2.5rem" }} />
          <div className="skeleton" style={{ width: "30%", height: "0.85rem" }} />
        </div>
      ))}
    </div>
  );
}
