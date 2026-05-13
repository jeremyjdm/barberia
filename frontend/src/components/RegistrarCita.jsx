import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CalendarPlus, User, Scissors, Check, ChevronRight } from "lucide-react";
import PageTransition from "./PageTransition";
import Calendar2Weeks from "./Calendar2Weeks";

const steps = [
  { key: "cliente", label: "Cliente", icon: User },
  { key: "barbero", label: "Barbero", icon: Scissors },
  { key: "servicio", label: "Servicio", icon: Scissors },
  { key: "fecha", label: "Fecha", icon: CalendarPlus },
  { key: "hora", label: "Hora", icon: CalendarPlus },
];

export default function RegistrarCita() {
  const [catalogos, setCatalogos] = useState({ barberos: [], servicios: [] });
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteId, setClienteId] = useState(null);
  const [clienteSearchResults, setClienteSearchResults] = useState([]);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [searchingCliente, setSearchingCliente] = useState(false);
  const clienteInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [barberoId, setBarberoId] = useState(null);
  const [servicioId, setServicioId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dayAppointments, setDayAppointments] = useState([]);

  useEffect(() => {
    fetchCatalogos();
  }, []);

  const fetchCatalogos = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/ventas/catalogos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const barberos = data.barberos.filter((b) => b.rol !== "admin");
        setCatalogos({ barberos, servicios: data.servicios });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!selectedDate || !barberoId) {
      setDayAppointments([]);
      return;
    }
    const fetchCitasDelDia = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:3000/api/citas?fecha=${selectedDate}&barbero_id=${barberoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setDayAppointments(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCitasDelDia();
  }, [selectedDate, barberoId]);

  const searchClientes = useCallback(async (q) => {
    if (q.length < 4) {
      setClienteSearchResults([]);
      setShowClienteDropdown(false);
      return;
    }
    setSearchingCliente(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/api/clientes/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setClienteSearchResults(data);
        setShowClienteDropdown(data.length > 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearchingCliente(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (clienteNombre.length >= 4) {
      searchTimeoutRef.current = setTimeout(() => searchClientes(clienteNombre), 300);
    } else {
      setClienteSearchResults([]);
      setShowClienteDropdown(false);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [clienteNombre, searchClientes]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          clienteInputRef.current && !clienteInputRef.current.contains(e.target)) {
        setShowClienteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCliente = (cl) => {
    setClienteNombre(cl.nombre);
    setClienteId(cl.id);
    setShowClienteDropdown(false);
    setClienteSearchResults([]);
  };

  const handleClienteChange = (val) => {
    setClienteNombre(val);
    if (clienteId) setClienteId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !clienteNombre ||
      !barberoId ||
      !servicioId ||
      !selectedDate ||
      !selectedHour
    ) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      let finalNombre = clienteNombre.trim();
      if (!clienteId) {
        const createRes = await fetch("http://localhost:3000/api/clientes", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: finalNombre }),
        });
        if (createRes.ok) {
          const newCliente = await createRes.json();
          setClienteId(newCliente.id);
        }
      }
      const res = await fetch("http://localhost:3000/api/citas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cliente_nombre: finalNombre,
          barbero_id: barberoId,
          servicio_id: servicioId,
          fecha: selectedDate,
          hora: selectedHour,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cita agendada con éxito");
        setClienteNombre("");
        setClienteId(null);
        setBarberoId(null);
        setServicioId(null);
        setSelectedDate(null);
        setSelectedHour(null);
      } else {
        toast.error(data.error || "Error al agendar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const selectedService = catalogos.servicios.find((s) => s.id === servicioId);
  const selectedBarbero = catalogos.barberos.find((b) => b.id === barberoId);

  const currentStepIndex = (() => {
    if (!clienteNombre) return 0;
    if (!barberoId) return 1;
    if (!servicioId) return 2;
    if (!selectedDate) return 3;
    if (!selectedHour) return 4;
    return 5;
  })();

  const dayProgress = (() => {
    if (!selectedDate || !barberoId || !selectedService) return null;
    const totalSlots = 20;
    const occupied = dayAppointments.length;
    return Math.min(Math.round((occupied / totalSlots) * 100), 100);
  })();

  return (
    <PageTransition>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Registrar Cita</h2>
        <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
          Agenda una nueva cita para la barbería
        </p>
      </div>

      {/* Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        {steps.map((s, idx) => {
          const done = idx < currentStepIndex;
          const active = idx === currentStepIndex;
          const Icon = s.icon;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <motion.div
                animate={{ scale: active ? 1.05 : 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.65rem', borderRadius: '8px',
                  background: done
                    ? 'rgba(111,78,55,0.2)'
                    : active
                      ? 'rgba(111,78,55,0.12)'
                      : 'transparent',
                  border: `1px solid ${
                    done ? 'var(--accent-primary)' : active ? 'var(--accent-primary)' : 'var(--border-color)'
                  }`,
                  opacity: done || active ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                {done ? (
                  <Check size={12} color="var(--accent-primary)" />
                ) : (
                  <Icon size={12} color={active ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                )}
                <span style={{
                  fontSize: '0.7rem', fontWeight: active ? 700 : 500,
                  color: done || active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </motion.div>
              {idx < steps.length - 1 && (
                <ChevronRight size={12} color="var(--text-muted)" style={{ opacity: 0.4 }} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bento-grid">
          <div className="bento-card bento-col-8" style={{ gap: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User size={18} /> Datos de la Cita
            </h3>

            <div>
              <label style={{
                display: "block", fontSize: "0.85rem", fontWeight: 600,
                color: "var(--text-main)", marginBottom: "0.4rem",
              }}>
                Nombre del Cliente
                {clienteId && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "#16a34a", fontWeight: 500 }}>
                    (seleccionado)
                  </span>
                )}
              </label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{
                  position: "absolute", left: "12px", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-muted)",
                  pointerEvents: "none", zIndex: 1,
                }} />
                <input
                  required
                  ref={clienteInputRef}
                  value={clienteNombre}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  placeholder="Ej. Juan Pérez (escribe 4+ caracteres para buscar)"
                  style={{
                    width: "100%", padding: "0.7rem 2.5rem 0.7rem 2.5rem",
                    fontSize: "0.95rem", color: "var(--text-main)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px", background: "var(--bg-color)",
                    outline: "none", transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6f4e37";
                    e.target.style.boxShadow = "0 0 0 3px rgba(111,78,55,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {searchingCliente && (
                  <div style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px", height: "16px",
                    border: "2px solid var(--text-muted)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }} />
                )}
                {showClienteDropdown && clienteSearchResults.length > 0 && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", top: "100%", left: 0, right: 0,
                      marginTop: "4px", zIndex: 20,
                      background: "var(--surface-color)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      boxShadow: "var(--shadow-elevated)",
                      overflow: "hidden",
                    }}
                  >
                    {clienteSearchResults.map((cl) => (
                      <div
                        key={cl.id}
                        onClick={() => handleSelectCliente(cl)}
                        style={{
                          padding: "0.6rem 0.75rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.9rem",
                          color: "var(--text-main)",
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(111,78,55,0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <User size={14} color="var(--text-muted)" />
                        <span style={{ fontWeight: 500 }}>{cl.nombre}</span>
                        {cl.telefono && (
                          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {cl.telefono}
                          </span>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
              {clienteNombre.length >= 4 && clienteSearchResults.length === 0 && !searchingCliente && !clienteId && (
                <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No encontrado — se registrará automáticamente al agendar
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "0.85rem", fontWeight: 600,
                color: "var(--text-main)", marginBottom: "0.5rem",
              }}>
                Barberos Disponibles
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "0.5rem",
              }}>
                {catalogos.barberos.map((b) => {
                  const sel = barberoId === b.id;
                  return (
                    <motion.div
                      key={b.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setBarberoId(b.id);
                        setSelectedDate(null);
                        setSelectedHour(null);
                      }}
                      style={{
                        padding: "0.65rem 0.5rem", borderRadius: "10px",
                        border: `2px solid ${sel ? "var(--accent-primary)" : "var(--border-color)"}`,
                        background: sel
                          ? "rgba(111,78,55,0.15)"
                          : "var(--surface-color)",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <Scissors size={18} style={{
                        color: sel ? "var(--accent-primary)" : "var(--text-muted)",
                        margin: "0 auto 0.25rem",
                      }} />
                      <div style={{
                        fontSize: "0.85rem", fontWeight: sel ? 700 : 500,
                        color: sel ? "var(--accent-primary)" : "var(--text-main)",
                      }}>
                        {b.nombre}
                      </div>
                    </motion.div>
                  );
                })}
                {catalogos.barberos.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", gridColumn: "1/-1" }}>
                    No hay barberos disponibles
                  </p>
                )}
              </div>
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "0.85rem", fontWeight: 600,
                color: "var(--text-main)", marginBottom: "0.5rem",
              }}>
                Servicios
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "0.5rem",
              }}>
                {catalogos.servicios.map((s) => {
                  const sel = servicioId === s.id;
                  return (
                    <motion.div
                      key={s.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setServicioId(s.id);
                        setSelectedHour(null);
                      }}
                      style={{
                        padding: "0.6rem 0.5rem", borderRadius: "10px",
                        border: `2px solid ${sel ? "var(--accent-primary)" : "var(--border-color)"}`,
                        background: sel
                          ? "rgba(111,78,55,0.15)"
                          : "var(--surface-color)",
                        cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{
                        fontSize: "0.85rem", fontWeight: sel ? 700 : 500,
                        color: sel ? "var(--accent-primary)" : "var(--text-main)",
                      }}>
                        {s.nombre}
                      </div>
                      <div style={{
                        fontSize: "0.85rem", fontWeight: 700,
                        color: "var(--accent-primary)", marginTop: "0.15rem",
                      }}>
                        ${s.precio}
                      </div>
                    </motion.div>
                  );
                })}
                {catalogos.servicios.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", gridColumn: "1/-1" }}>
                    No hay servicios disponibles
                  </p>
                )}
              </div>
            </div>

            <div style={{
              borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem",
            }}>
              <Calendar2Weeks
                compact
                sideBySide
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                selectedHour={selectedHour}
                onSelectHour={setSelectedHour}
                barberoId={barberoId}
                servicioId={servicioId}
              />
            </div>
          </div>

          <div className="bento-card bento-col-4" style={{ gap: "1rem", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CalendarPlus size={18} /> Resumen
              </h3>
              <div style={{
                display: "flex", flexDirection: "column", gap: "0.75rem",
                marginTop: "1rem",
              }}>
                <div>
                  <div style={{
                    fontSize: "0.75rem", color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Cliente
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={clienteNombre || "empty"}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {clienteNombre || "—"}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.75rem", color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Barbero
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedBarbero?.nombre || "—"}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.75rem", color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Servicio
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedService?.nombre || "—"}
                  </div>
                  {selectedService && (
                    <div style={{
                      fontSize: "1.3rem", fontWeight: 700,
                      color: "var(--accent-primary)",
                    }}>
                      ${selectedService.precio}
                    </div>
                  )}
                </div>
                {selectedDate && selectedHour && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{
                      fontSize: "0.75rem", color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      Fecha & Hora
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {new Date(selectedDate + "T" + selectedHour).toLocaleDateString("es-ES", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </div>
                    <div style={{
                      fontSize: "1.5rem", fontWeight: 700,
                      color: "var(--accent-primary)",
                    }}>
                      {selectedHour}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Day Progress Bar */}
            {dayProgress !== null && (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  marginBottom: '0.3rem',
                }}>
                  <span>Ocupación del día</span>
                  <span>{dayAppointments.length} citas</span>
                </div>
                <div style={{
                  width: '100%', height: '6px', borderRadius: '3px',
                  background: 'var(--border-color)', overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dayProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: '3px',
                      background: dayProgress > 80
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #6f4e37, #8a6344)',
                    }}
                  />
                </div>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%", padding: "0.9rem", borderRadius: "12px",
                border: "none",
                background: saving
                  ? "var(--text-muted)"
                  : "linear-gradient(135deg, #6f4e37, #8a6344)",
                color: "#fff", fontWeight: 700, fontSize: "1rem",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(111,78,55,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {saving ? "Agendando..." : "Agendar Cita"}
            </motion.button>
          </div>
        </div>
      </form>
    </PageTransition>
  );
}
