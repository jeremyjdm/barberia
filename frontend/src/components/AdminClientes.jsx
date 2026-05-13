import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Search, Phone, Mail, Calendar } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import FormDialog from "./FormDialog";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import PageTransition from "./PageTransition";

const BASE = 'http://localhost:3000';

export default function AdminClientes() {
  const toast = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ id: null, nombre: "", telefono: "", email: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchClientes = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setClientes(data);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono && c.telefono.includes(search))
  );

  const handleEdit = (c) => {
    setFormData({ id: c.id, nombre: c.nombre, telefono: c.telefono || "", email: c.email || "" });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setFormData({ id: null, nombre: "", telefono: "", email: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({ id: null, nombre: "", telefono: "", email: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast("El nombre es obligatorio.", "error"); return;
    }
    try {
      const token = localStorage.getItem("token");
      const url = isEditing ? `${BASE}/api/clientes/${formData.id}` : `${BASE}/api/clientes`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          telefono: formData.telefono || null,
          email: formData.email || null,
        }),
      });
      if (res.ok) {
        toast(isEditing ? "Cliente actualizado" : "Cliente creado", "success");
        await fetchClientes();
        handleCloseModal();
      } else {
        const data = await res.json();
        toast(data.error || "Error al guardar", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error de conexión", "error");
    }
  };

  const handleDeleteRequest = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/clientes/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClientes(clientes.filter((c) => c.id !== deleteTarget));
        toast("Cliente eliminado", "success");
        setDeleteTarget(null);
      } else if (res.status === 409) {
        const data = await res.json();
        toast(data.error || "No se puede eliminar", "error");
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        toast(data.error || "Error al eliminar", "error");
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error(error);
      toast("Error de conexión", "error");
      setDeleteTarget(null);
    }
  };

  return (
    <PageTransition>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Clientes</h2>
          <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateNew}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: "999px", border: "none",
            background: "linear-gradient(135deg, #6f4e37, #8a6344)",
            color: "#fff", fontWeight: 600, fontSize: "0.9rem",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
            boxShadow: "0 4px 14px rgba(111,78,55,0.3)",
          }}
        >
          + Nuevo Cliente
        </motion.button>
      </div>

      <div style={{ marginBottom: "1rem", position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..."
          className="input-field"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : clientes.length === 0 ? (
        <div className="bento-card">
          <EmptyState message="Aún no hay clientes registrados." action={
            <button onClick={handleCreateNew} style={{ padding: "0.6rem 1.2rem", borderRadius: "999px", border: "none", background: "var(--accent-primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Registrar Primer Cliente
            </button>
          } />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card">
          <EmptyState message="No se encontraron clientes con ese criterio de búsqueda." />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {filtered.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              style={{
                background: "var(--surface-color)", border: "1px solid var(--border-color)",
                borderRadius: "1.25rem", padding: "1.25rem",
                boxShadow: "var(--shadow-soft)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-soft)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #6f4e37, #8a6344)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
                  }}>
                    {c.nombre?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.2rem" }}>
                      {c.telefono && <span><Phone size={11} style={{ verticalAlign: "middle", marginRight: "0.2rem" }} />{c.telefono}</span>}
                      {c.email && <span><Mail size={11} style={{ verticalAlign: "middle", marginRight: "0.2rem" }} />{c.email}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(c)}
                    style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-muted)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(111,78,55,0.1)"; e.currentTarget.style.borderColor = "#6f4e37"; e.currentTarget.style.color = "#6f4e37"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteRequest(c.id)}
                    style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-muted)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.1)"; e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.color = "#dc2626"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>
              {c.ultima_visita && (
                <div style={{ paddingTop: "0.75rem", marginTop: "0.75rem", borderTop: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Calendar size={12} /> Última visita: {new Date(c.ultima_visita).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <FormDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label-sm">Nombre Completo</label>
            <input className="input-field" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label-sm">Teléfono <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(opcional)</span></label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="input-field" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} placeholder="Ej: 55-1234-5678" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>
          <div>
            <label className="label-sm">Email <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(opcional)</span></label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="input-field" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ejemplo@correo.com" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={handleCloseModal}
              style={{ padding: "0.65rem 1.25rem", borderRadius: "999px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: "0.65rem 1.25rem", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #6f4e37, #8a6344)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(111,78,55,0.3)" }}
            >
              {isEditing ? "Guardar Cambios" : "Crear Cliente"}
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Cliente?"
        message="Esta acción no se puede deshacer. El cliente será eliminado permanentemente del sistema."
        confirmText="Eliminar"
        destructive={true}
      />
    </PageTransition>
  );
}
