import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Eliminar", destructive = true }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed", inset: 0, display: "grid", placeItems: "center",
            padding: "1rem", zIndex: 51,
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 420px)",
              background: "var(--surface-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "1.25rem",
              padding: "2rem",
              boxShadow: "0 25px 80px rgba(0,0,0,0.15)",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ marginBottom: "0.75rem", color: destructive ? "#dc2626" : "var(--accent-primary)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: 700 }}>{title}</h3>
            <p style={{ color: "var(--text-muted)", margin: "0 0 1.5rem 0", lineHeight: 1.5 }}>{message}</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "0.65rem 1rem", borderRadius: "999px", border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.9rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, padding: "0.65rem 1rem", borderRadius: "999px", border: "none",
                  background: destructive ? "#dc2626" : "var(--accent-primary)", color: "#fff", fontWeight: 600, fontSize: "0.9rem",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: destructive ? "0 4px 12px rgba(220,38,38,0.3)" : "0 4px 12px rgba(111,78,55,0.3)",
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
