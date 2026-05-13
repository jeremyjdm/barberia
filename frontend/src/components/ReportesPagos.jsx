import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Percent, Calendar, CheckCircle, XCircle, History, User as UserIcon, Wallet } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import PageTransition from "./PageTransition";

const BASE = 'http://localhost:3000';

const WEEK_DAYS = 7;

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt) => dt.toISOString().slice(0, 10);
  return { desde: fmt(monday), hasta: fmt(sunday) };
}

export default function ReportesPagos() {
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const isAdmin = user?.rol === "admin";
  const isRecepcionista = user?.rol === "recepcionista";

  const [barberos, setBarberos] = useState([]);
  const [ganancias, setGanancias] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editPorcentaje, setEditPorcentaje] = useState("");

  const week = getWeekRange();
  const [desde, setDesde] = useState(week.desde);
  const [hasta, setHasta] = useState(week.hasta);

  const [form, setForm] = useState({ barbero_id: "", monto: "", notas: "" });

  useEffect(() => {
    if (isAdmin) fetchBarberos();
    fetchGanancias();
    if (isAdmin) fetchPagos();
  }, []);

  const fetchBarberos = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/barberos/comision`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBarberos(await res.json());
    } catch { }
  };

  const fetchGanancias = async (d, h) => {
    const des = d || desde;
    const has = h || hasta;
    try {
      const res = await fetch(`${BASE}/api/admin/barberos/ganancias?desde=${des}&hasta=${has}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGanancias(await res.json());
    } catch { }
  };

  const fetchPagos = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/pagos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPagos(await res.json());
    } catch { }
  };

  const handleSaveComision = async (barberoId) => {
    try {
      const res = await fetch(`${BASE}/api/admin/barberos/${barberoId}/comision`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ porcentaje: parseFloat(editPorcentaje) }),
      });
      if (res.ok) {
        toast("Comisión actualizada", "success");
        setEditingId(null);
        fetchBarberos();
        fetchGanancias();
      } else {
        const data = await res.json();
        toast(data.error || "Error al actualizar", "error");
      }
    } catch {
      toast("Error de conexión", "error");
    }
  };

  const handleRegistrarPago = async () => {
    if (!form.barbero_id || !form.monto) {
      toast("Selecciona un barbero y escribe el monto", "error");
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/admin/pagos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          barbero_id: parseInt(form.barbero_id),
          monto: parseFloat(form.monto),
          semana_inicio: desde,
          semana_fin: hasta,
          notas: form.notas,
        }),
      });
      if (res.ok) {
        toast("Pago registrado", "success");
        setForm({ barbero_id: "", monto: "", notas: "" });
        fetchGanancias(desde, hasta);
        if (isAdmin) fetchPagos();
      } else {
        const data = await res.json();
        toast(data.error || "Error al registrar", "error");
      }
    } catch {
      toast("Error de conexión", "error");
    }
  };

  const handleCancelPago = async (pagoId) => {
    try {
      const res = await fetch(`${BASE}/api/admin/pagos/${pagoId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      });
      if (res.ok) {
        toast("Pago cancelado", "success");
        fetchPagos();
      }
    } catch {
      toast("Error de conexión", "error");
    }
  };

  const semanaAnterior = () => {
    const d = new Date(desde);
    d.setDate(d.getDate() - 7);
    const range = getWeekRange(d);
    setDesde(range.desde);
    setHasta(range.hasta);
    fetchGanancias(range.desde, range.hasta);
  };

  const semanaSiguiente = () => {
    const d = new Date(desde);
    d.setDate(d.getDate() + 7);
    const range = getWeekRange(d);
    setDesde(range.desde);
    setHasta(range.hasta);
    fetchGanancias(range.desde, range.hasta);
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Pagos y Comisiones</h2>
        <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
          {isAdmin ? "Administra comisiones y pagos de barberos" : "Registra pagos a barberos"}
        </p>
      </div>

      <div className="bento-grid">
        {/* SECCIÓN 1: Configurar Comisiones (solo admin) */}
        {isAdmin && (
          <div className="bento-card bento-col-12" style={{ gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Percent size={18} /> Configurar Comisiones
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Barbero</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Teléfono</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Comisión</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {barberos.map((b) => (
                    <tr key={b.id}>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>{b.nombre}</td>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>{b.telefono || "—"}</td>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                        {editingId === b.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editPorcentaje}
                              onChange={(e) => setEditPorcentaje(e.target.value)}
                              style={{ width: "70px", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)" }}
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{b.porcentaje}%</span>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                        {editingId === b.id ? (
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => handleSaveComision(b.id)}
                              style={{ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "none", background: "var(--accent-primary)", color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}
                            >
                              <CheckCircle size={14} />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingId(null)}
                              style={{ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}
                            >
                              <XCircle size={14} />
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => { setEditingId(b.id); setEditPorcentaje(String(b.porcentaje)); }}
                            style={{ padding: "0.3rem 0.7rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontSize: "0.8rem" }}
                          >
                            Editar
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {barberos.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay barberos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: Ganancias del Período */}
        <div className="bento-card bento-col-12" style={{ gap: "1rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wallet size={18} /> Ganancias del Período
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={semanaAnterior}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem" }}>
              ← Semana Ant.
            </motion.button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={14} color="var(--text-muted)" />
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.85rem" }} />
              <span style={{ color: "var(--text-muted)" }}>a</span>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.85rem" }} />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={semanaSiguiente}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem" }}>
              Semana Sig. →
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchGanancias()}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "none", background: "var(--accent-primary)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              Calcular
            </motion.button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Barbero</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Servicios</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Total Ventas</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Comisión</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Pagado</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {ganancias.map((g) => (
                  <tr key={g.id}>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>{g.nombre}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>{g.servicios}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>${g.total_ventas.toFixed(2)}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>${g.comision.toFixed(2)}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", color: "var(--accent-success)" }}>${g.total_pagado.toFixed(2)}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", color: g.pendiente > 0 ? "var(--accent-warning)" : "inherit", fontWeight: g.pendiente > 0 ? 600 : 400 }}>
                      ${g.pendiente.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {ganancias.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay datos en este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 3: Registrar Pago */}
        <div className="bento-card bento-col-6" style={{ gap: "1rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DollarSign size={18} /> Registrar Pago
          </h3>

          <div>
            <label className="label-sm">Barbero</label>
            <select value={form.barbero_id} onChange={(e) => {
              const selectedId = e.target.value;
              const barberoData = ganancias.find(g => g.id.toString() === selectedId);
              setForm({ 
                ...form, 
                barbero_id: selectedId,
                monto: barberoData && barberoData.pendiente > 0 ? barberoData.pendiente.toFixed(2) : ""
              });
            }}
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.9rem" }}>
              <option value="">Seleccionar barbero...</option>
              {ganancias.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre} (Pendiente: ${g.pendiente.toFixed(2)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-sm">Monto a pagar</label>
            <input type="number" step="0.01" min="0" value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="Ej: 2500.00"
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.9rem", boxSizing: "border-box" }} />
          </div>

          <div>
            <label className="label-sm">Notas (opcional)</label>
            <input type="text" value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Semana del {desde} al {hasta}"
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-main)", fontSize: "0.9rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={14} />
            Período: {desde} a {hasta}
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleRegistrarPago}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
            }}>
            <DollarSign size={18} />
            Registrar Pago
          </motion.button>
        </div>

        {/* SECCIÓN 4: Historial de Pagos (solo admin) */}
        {isAdmin && (
          <div className="bento-card bento-col-6" style={{ gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={18} /> Historial de Pagos
            </h3>

            <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Barbero</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Monto</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Semana</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Estado</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Fecha</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.85rem" }}>{p.barbero_nombre}</td>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.85rem", fontWeight: 600 }}>${p.monto.toFixed(2)}</td>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>{p.semana_inicio} a {p.semana_fin}</td>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{
                          padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                          background: p.estado === "pagado" ? "rgba(22,163,74,0.15)" : p.estado === "cancelado" ? "rgba(220,38,38,0.15)" : "rgba(234,179,8,0.15)",
                          color: p.estado === "pagado" ? "#16a34a" : p.estado === "cancelado" ? "#dc2626" : "#eab308",
                        }}>
                          {p.estado}
                        </span>
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem" }}>{p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                        {p.estado !== "cancelado" && (
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancelPago(p.id)}
                            title="Cancelar pago"
                            style={{ padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid rgba(220,38,38,0.3)", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }}>
                            Cancelar
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pagos.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>Sin pagos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}