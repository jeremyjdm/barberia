import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Trash2, Plus, Phone, User as UserIcon } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import FormDialog from "./FormDialog";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import PageTransition from "./PageTransition";

function RolBadge({ rol }) {
  const colors = {
    admin: { bg: "rgba(111,78,55,0.1)", color: "#6f4e37" },
    barbero: { bg: "rgba(22,163,74,0.1)", color: "#16a34a" },
    recepcionista: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
  };
  const c = colors[rol] || colors.barbero;
  return (
    <span style={{
      display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "999px",
      background: c.bg, color: c.color, fontSize: "0.8rem", fontWeight: 600,
    }}>
      {rol}
    </span>
  );
}

const BASE = 'http://localhost:3000';

export default function AdminUsuarios() {
  const { user } = useOutletContext();
  const isRecepcionista = user?.rol === 'recepcionista';
  const toast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: null, nombre: "", username: "", password: "", telefono: "", rol: "barbero" });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteForceTarget, setDeleteForceTarget] = useState(null);
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/admin/usuarios", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!isActive) return;
        if (res.ok) setUsuarios(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, []);

  const reloadUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/admin/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setUsuarios(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleEdit = (u) => {
    if (isRecepcionista) {
      setFormData({ id: u.id, nombre: u.nombre, username: "", password: "", telefono: u.telefono || "", rol: "barbero" });
    } else {
      setFormData({ id: u.id, nombre: u.nombre, username: u.username, password: "", telefono: u.telefono || "", rol: u.rol });
    }
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setFormData({ id: null, nombre: "", username: "", password: "", telefono: "", rol: "barbero" });
    setCreatedInfo(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCreatedInfo(null);
    setFormData({ id: null, nombre: "", username: "", password: "", telefono: "", rol: "barbero" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreatedInfo(null);
    try {
      const token = localStorage.getItem("token");
      const body = isRecepcionista
        ? { nombre: formData.nombre, telefono: formData.telefono }
        : { nombre: formData.nombre, username: formData.username, rol: formData.rol, telefono: formData.telefono, ...(formData.password ? { password: formData.password } : {}) };

      if (!isRecepcionista && !isEditing && !formData.password) {
        toast("La contraseña es obligatoria.", "error"); return;
      }
      if (!formData.nombre) { toast("El nombre es obligatorio.", "error"); return; }

      const url = isEditing ? `http://localhost:3000/api/admin/usuarios/${formData.id}` : "http://localhost:3000/api/admin/usuarios";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        await reloadUsuarios();
        if (!isEditing && isRecepcionista && data) {
          setCreatedInfo(data);
        } else {
          handleCloseModal();
        }
        if (!isEditing && !isRecepcionista) handleCloseModal();
      } else {
        const data = await res.json();
        toast(data.error || "Error al guardar", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRequest = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/admin/usuarios/${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setUsuarios(usuarios.filter((u) => u.id !== deleteTarget));
        toast("Usuario eliminado", "success");
        setDeleteTarget(null);
      } else if (res.status === 409) {
        const data = await res.json();
        setDeleteForceTarget({ id: deleteTarget, related: data.related });
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        toast(data.error || "Error al eliminar", "error");
        setDeleteTarget(null);
      }
    } catch (error) {
      toast("Error de conexión", "error");
      setDeleteTarget(null);
    }
  };

  const confirmForceDelete = async () => {
    if (!deleteForceTarget) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/admin/usuarios/${deleteForceTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        setUsuarios(usuarios.filter((u) => u.id !== deleteForceTarget.id));
        toast("Usuario eliminado. Citas y registros reasignados.", "warning");
      } else {
        const data = await res.json();
        toast(data.error || "Error al eliminar", "error");
      }
    } catch (error) {
      toast("Error de conexión", "error");
    } finally {
      setDeleteForceTarget(null);
    }
  };

  const title = isRecepcionista ? "Barberos" : "Empleados";
  const btnLabel = isRecepcionista ? "Añadir Barbero" : "Nuevo Empleado";
  const subtitleLabel = isRecepcionista ? "barbero" : "empleado";

  return (
    <PageTransition>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h2>
          <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
            {usuarios.length} {subtitleLabel}{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}
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
          <Plus size={18} />
          {btnLabel}
        </motion.button>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} />
      ) : usuarios.length === 0 ? (
        <div className="bento-card">
          <EmptyState message={`Aún no hay ${subtitleLabel}s registrados.`} action={
            <button onClick={handleCreateNew} style={{ padding: "0.6rem 1.2rem", borderRadius: "999px", border: "none", background: "var(--accent-primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Crear Primer {isRecepcionista ? "Barbero" : "Empleado"}
            </button>
          } />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {usuarios.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              style={{
                background: "var(--surface-color)", border: "1px solid var(--border-color)",
                borderRadius: "1.25rem", padding: "1.25rem",
                boxShadow: "var(--shadow-soft)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-hover)"; e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-soft)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #6f4e37, #8a6344)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
                  }}>
                    {u.nombre?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nombre}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {isRecepcionista ? (
                        u.telefono ? <span><Phone size={11} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />{u.telefono}</span> : '@' + u.username
                      ) : (
                        '@' + u.username
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEdit(u)}
                    style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-muted)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(111,78,55,0.1)"; e.currentTarget.style.borderColor = "#6f4e37"; e.currentTarget.style.color = "#6f4e37"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </motion.button>
                  {(isRecepcionista || u.id !== 1) && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteRequest(u.id)}
                      style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-muted)", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.1)"; e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  )}
                </div>
              </div>
              <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                <RolBadge rol={u.rol} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <FormDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? (isRecepcionista ? "Editar Barbero" : "Editar Empleado") : (isRecepcionista ? "Añadir Barbero" : "Nuevo Empleado")}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label-sm">Nombre Completo</label>
            <input className="input-field" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          </div>

          <div>
            <label className="label-sm">
              Teléfono <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="input-field" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej: 55-1234-5678"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {!isRecepcionista && (
            <>
              <div>
                <label className="label-sm">Usuario (Login)</label>
                <input className="input-field" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div>
                <label className="label-sm">
                  Contraseña {!isEditing && <span style={{ color: "#dc2626", fontWeight: 500, textTransform: 'none', letterSpacing: 'normal' }}>*</span>}
                  {isEditing && <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(dejar vacío para mantener)</span>}
                </label>
                <input className="input-field" required={!isEditing} type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div>
                <label className="label-sm">Rol</label>
                <select className="input-field" value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
                  <option value="barbero">Barbero</option>
                  <option value="recepcionista">Secretaria/Recepcionista</option>
                </select>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={handleCloseModal}
              style={{ padding: "0.65rem 1.25rem", borderRadius: "999px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: "0.65rem 1.25rem", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #6f4e37, #8a6344)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(111,78,55,0.3)" }}
            >
              {isEditing ? "Guardar Cambios" : (isRecepcionista ? "Crear Barbero" : "Crear Empleado")}
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar?"
        message="Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema."
        confirmText="Eliminar"
        destructive={true}
      />

      <ConfirmDialog
        isOpen={deleteForceTarget !== null}
        onClose={() => setDeleteForceTarget(null)}
        onConfirm={confirmForceDelete}
        title="¿Eliminar de todas formas?"
        message={`Este usuario tiene ${deleteForceTarget?.related?.citas || 0} cita(s), ${deleteForceTarget?.related?.ventas || 0} venta(s) y ${deleteForceTarget?.related?.cajas || 0} caja(s) asociadas. Se eliminarán sus registros de auditoría y las citas quedarán sin barbero asignado.`}
        confirmText="Eliminar de todas formas"
        destructive={true}
      />
    </PageTransition>
  );
}
