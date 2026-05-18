import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, Clock, User as UserIcon, Scissors, Play, ChevronLeft, ChevronRight, Calendar, Bell, Edit2, XCircle, Keyboard, ExternalLink } from 'lucide-react';
import PageTransition from './PageTransition';
import EmptyState from './EmptyState';
import FormDialog from './FormDialog';

const MERIDA_TZ = 'America/Merida';

function meridaNowMinutes() {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: MERIDA_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = f.format(new Date()).split(':').map(Number);
  return h * 60 + m;
}

function meridaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MERIDA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (_) {}
}

const badgeStyles = {
  pendiente: {
    background: 'rgba(217,119,6,0.15)',
    color: '#f59e0b',
    dot: '#f59e0b',
    label: 'En espera',
  },
  en_turno: {
    background: 'rgba(22,163,74,0.15)',
    color: '#16a34a',
    dot: '#16a34a',
    label: 'En turno',
  },
  completada: {
    background: 'rgba(107,114,128,0.15)',
    color: '#6b7280',
    dot: '#6b7280',
    label: 'Completada',
  },
};

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function GestionCitas() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewMonth, setCalViewMonth] = useState(() => {
    const parts = meridaToday().split('-');
    return parseInt(parts[1], 10) - 1;
  });
  const [calViewYear, setCalViewYear] = useState(() => {
    const parts = meridaToday().split('-');
    return parseInt(parts[0], 10);
  });
  const [agendaDate, setAgendaDate] = useState(meridaToday());
  const [selectedStatsDate, setSelectedStatsDate] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [catalogos, setCatalogos] = useState({ barberos: [], servicios: [] });
  const [inventario, setInventario] = useState([]);
  const [completarModalData, setCompletarModalData] = useState(null);
  const [searchProd, setSearchProd] = useState('');
  const [editCitaId, setEditCitaId] = useState(null);
  const [editForm, setEditForm] = useState({ cliente_nombre: '', fecha: '', hora: '', barbero_id: '', servicio_id: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  const notifiedRef = useRef(new Set());
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPrivileged = user.rol === 'admin' || user.rol === 'recepcionista';

  const checkProximas = useCallback(() => {
    const nowMin = meridaNowMinutes();

    citas.forEach((c) => {
      if (c.estado !== 'pendiente') return;
      if (notifiedRef.current.has(c.id)) return;

      const [h, m] = c.hora.split(':').map(Number);
      const citaMin = h * 60 + m;
      const diff = citaMin - nowMin;

      if (diff >= 0 && diff <= 10) {
        notifiedRef.current.add(c.id);
        playNotifSound();
        toast(
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b' }}>
                Cita próxima
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.1rem' }}>
                {c.cliente_nombre}
              </div>
            </div>
          </div>,
          { duration: 6000 }
        );
      }
    });
  }, [citas]);

  useEffect(() => {
    fetchCitas(agendaDate);
    fetchCatalogos();
  }, []);

  const fetchCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/ventas/catalogos', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCatalogos(data);

      const resInv = await fetch('http://localhost:3000/api/inventario', { headers: { Authorization: `Bearer ${token}` } });
      const dataInv = await resInv.json();
      if (resInv.ok) setInventario(dataInv);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (citas.length === 0 || agendaDate !== meridaToday()) return;
    checkProximas();
    const interval = setInterval(checkProximas, 30000);
    return () => clearInterval(interval);
  }, [checkProximas, citas, agendaDate]);

  const fetchCitasRef = useRef();
  const agendaDateRef = useRef();

  useEffect(() => {
    fetchCitasRef.current = fetchCitas;
    agendaDateRef.current = agendaDate;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        navigate('/dashboard/registrar-cita');
      }
      if (e.ctrlKey && e.key === 'r') {
        if (!showCalendar) {
          e.preventDefault();
          if (fetchCitasRef.current) fetchCitasRef.current(agendaDateRef.current);
        }
      }
      if (e.key === 'Escape') {
        if (editCitaId) setEditCitaId(null);
        else if (completarModalData) setCompletarModalData(null);
        else if (showShortcuts) setShowShortcuts(false);
      }
      if (e.key === '?' && e.shiftKey) {
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showCalendar, editCitaId, completarModalData, showShortcuts]);

  const fetchCitas = async (fecha = agendaDate) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/hoy?fecha=${fecha}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setCitas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (citaId) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/${citaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Cita cancelada');
        fetchCitas(agendaDate);
      } else {
        toast.error('Error al cancelar');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleUpdateCita = async () => {
    if (!editForm.cliente_nombre || !editForm.fecha || !editForm.hora || !editForm.barbero_id || !editForm.servicio_id) {
      toast.error('Llena todos los campos');
      return;
    }
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/${editCitaId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Cita actualizada');
        setEditCitaId(null);
        fetchCitas(agendaDate);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchStats = async (fecha) => {
    setLoadingStats(true);
    setSelectedStatsDate(fecha);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/estadisticas?fecha=${fecha}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setStatsData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleIniciar = async (cita) => {
    setAccionando(cita.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/${cita.id}/iniciar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`${cita.cliente_nombre} ahora está en turno`);
        fetchCitas();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al iniciar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setAccionando(null);
    }
  };

  const handleOpenCompletar = (cita) => {
    setCompletarModalData({ cita, productos: [] });
    setSearchProd('');
  };

  const toggleProductoCompletar = (prod) => {
    setCompletarModalData(prev => {
      if (!prev) return prev;
      const exists = prev.productos.find(p => p.id === prod.id);
      if (exists) {
        return { ...prev, productos: prev.productos.filter(p => p.id !== prod.id) };
      }
      return { ...prev, productos: [...prev.productos, { ...prod, cantidad: 1 }] };
    });
  };

  const updateProductoCantidadCompletar = (id, cantidad) => {
    setCompletarModalData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        productos: prev.productos.map(p => p.id === id ? { ...p, cantidad } : p)
      };
    });
  };

  const handleCompletarSubmit = async () => {
    if (!completarModalData) return;
    const { cita, productos } = completarModalData;
    setAccionando(cita.id);
    setCompletarModalData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/${cita.id}/completar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Cita de ${cita.cliente_nombre} completada`);
        navigate('/dashboard/caja', {
          state: {
            venta: data.venta,
            servicio: data.servicio,
            productos: productos.map(p => ({
              nombre: p.nombre,
              cantidad: p.cantidad,
              subtotal: p.precio_venta * p.cantidad
            })),
            cliente_nombre: cita.cliente_nombre,
            barbero_nombre: cita.barbero_nombre,
          },
        });
      } else {
        toast.error(data.error || 'Error al completar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setAccionando(null);
      fetchCitas(agendaDate);
    }
  };

  const toMin = (hora) => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  };

  const ahoraMin = meridaNowMinutes();

  const isLate = (hora) => {
    const citaMin = toMin(hora);
    return citaMin < ahoraMin;
  };

  const esProxima = (hora) => {
    const citaMin = toMin(hora);
    const diff = citaMin - ahoraMin;
    return diff >= -15 && diff <= 60;
  };

  const isOverdue = (hora) => {
    const citaMin = toMin(hora);
    return ahoraMin - citaMin > 15;
  };

  // Separate citas by estado and order
  const enTurno = citas.filter(c => c.estado === 'en_turno');
  const pendientes = citas.filter(c => c.estado === 'pendiente');
  const completadas = citas.filter(c => c.estado === 'completada');

  // Active cards are all `en_turno`. If empty, it's just the first pending.
  const citasActivas = enTurno.length > 0 ? enTurno : (pendientes.length > 0 ? [pendientes[0]] : []);
  
  // The rest are pending, excluding the ones we show as active
  const siguientes = enTurno.length > 0 ? pendientes : pendientes.slice(1);

  // When viewing another day, we might want to just show all pending instead of filtering by "próximas"
  // Here we let `siguientes` be all pending if it's not today.
  
  const [añoStr, mesStr, diaStr] = agendaDate.split('-');
  const dateObj = new Date(parseInt(añoStr), parseInt(mesStr) - 1, parseInt(diaStr));
  const dateStr = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj);
  const totalPendientes = pendientes.length;

  const renderBadge = (estado) => {
    const s = badgeStyles[estado] || badgeStyles.pendiente;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.2rem 0.6rem', borderRadius: '6px',
        background: s.background, color: s.color,
        fontSize: '0.75rem', fontWeight: 600,
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
        {s.label}
      </span>
    );
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          {showCalendar ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCalendar(false)}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)', color: 'var(--text-main)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                <ChevronLeft size={16} /> Volver
              </motion.button>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Calendario</h2>
            </div>
          ) : (
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {agendaDate === meridaToday() ? 'Agenda del día' : 'Agenda'}
                <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  — <strong style={{ color: 'var(--accent-primary)' }}>{totalPendientes}</strong> pendiente{totalPendientes !== 1 ? 's' : ''}
                  {completadas.length > 0 && (
                    <span>, <strong style={{ color: '#16a34a' }}>{completadas.length}</strong> completada{completadas.length !== 1 ? 's' : ''}
                  </span>)}
                </span>
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                {dateStr}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!showCalendar && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCalendar(true);
                  const td = meridaToday().split('-');
                  setCalViewMonth(parseInt(td[1], 10) - 1);
                  setCalViewYear(parseInt(td[0], 10));
                  setSelectedStatsDate(null);
                  setStatsData(null);
                }}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)', color: 'var(--text-main)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                <Calendar size={14} /> Calendario
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fetchCitas(agendaDate)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                background: 'var(--surface-color)', color: 'var(--text-main)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <Clock size={14} /> Actualizar
            </motion.button>
          </div>
        </div>
      </div>

      {showCalendar ? (
        <motion.div
          key="calendar-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bento-grid" style={{ marginBottom: '1rem' }}>
            {/* Calendar - 80% */}
            <div className="bento-col-10">
              <div className="bento-card" style={{ gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {meses[calViewMonth]} {calViewYear}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => { if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(v => v - 1); } else setCalViewMonth(m => m - 1); }}
                      style={{ background: 'rgba(111,78,55,0.1)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', padding: '0.3rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <ChevronLeft size={16} /> Mes
                    </motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => { if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(v => v + 1); } else setCalViewMonth(m => m + 1); }}
                      style={{ background: 'rgba(111,78,55,0.1)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', padding: '0.3rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      Mes <ChevronRight size={16} />
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                  {diasSemana.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.3rem 0', letterSpacing: '0.03em' }}>{d}</div>
                  ))}
                  {(() => {
                    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
                    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`pad-${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateObj = new Date(calViewYear, calViewMonth, d);
                      const dateStr = dateObj.toISOString().split('T')[0];
                      const isToday = dateStr === meridaToday();
                      const isSelected = dateStr === selectedStatsDate;
                      cells.push(
                        <motion.button key={d} type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            fetchStats(dateStr);
                          }}
                          style={{
                            padding: '0.55rem 0', borderRadius: '10px',
                            border: dateStr === selectedStatsDate ? '2px solid var(--accent-primary)' : isToday ? '2px solid rgba(111,78,55,0.4)' : 'none',
                            background: dateStr === selectedStatsDate ? 'linear-gradient(135deg, #6f4e37, #8a6344)' : isToday ? 'rgba(111,78,55,0.12)' : 'transparent',
                            color: dateStr === selectedStatsDate ? '#fff' : isToday ? 'var(--accent-primary)' : 'var(--text-main)',
                            fontWeight: dateStr === selectedStatsDate || isToday ? 700 : 500,
                            fontSize: '0.85rem', cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >{d}</motion.button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            </div>

            {/* Client list sidebar - 20% */}
            <div className="bento-col-2">
              <div className="bento-card" style={{ gap: '0.75rem', justifyContent: 'flex-start' }}>
                {!selectedStatsDate ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <Calendar size={24} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                    <div>Selecciona un día</div>
                  </div>
                ) : loadingStats ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cargando...</div>
                ) : statsData ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {new Date(selectedStatsDate + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAgendaDate(selectedStatsDate);
                          fetchCitas(selectedStatsDate);
                          setShowCalendar(false);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                          background: 'var(--surface-color)', color: 'var(--accent-primary)',
                          cursor: 'pointer', fontSize: '0.6rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                        }}
                        title="Ver agenda del día"
                      >
                        <ExternalLink size={10} /> Agenda
                      </motion.button>
                    </div>
                    {statsData.clientes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Sin clientes</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                        {statsData.clientes.map((cl, i) => {
                          const isCompletada = cl.estado === 'completada';
                          return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.35rem 0.4rem', borderRadius: '8px',
                            background: i % 2 === 0 ? 'rgba(111,78,55,0.04)' : 'transparent',
                            fontSize: '0.7rem',
                          }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '5px',
                              background: isCompletada ? 'rgba(22,163,74,0.15)' : 'rgba(107,114,128,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <CheckCircle size={10} color={isCompletada ? '#16a34a' : '#9ca3af'} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600, color: isCompletada ? '#16a34a' : 'var(--text-muted)' }}>{cl.cliente_nombre}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '0.2rem' }}>· {cl.servicio_nombre}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: isCompletada ? '#16a34a' : 'var(--text-muted)', flexShrink: 0 }}>
                              {isCompletada ? `$${cl.precio}` : '—'}
                            </span>
                          </div>
                        );})}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Bottom row: Cortes + Ganancias cards */}
          {selectedStatsDate && statsData && !loadingStats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                  padding: '1.25rem 1.5rem', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.03))',
                  border: '1px solid rgba(22,163,74,0.2)',
                  boxShadow: 'var(--shadow-soft)',
                }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
                  }}>
                    <Scissors size={24} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Cortes</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#16a34a', lineHeight: 1.1, marginTop: '0.1rem' }}>{statsData.total_cortes}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {statsData.clientes.length > 0 ? `${statsData.clientes.length} atención(es)` : 'Sin actividad'}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                  padding: '1.25rem 1.5rem', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(111,78,55,0.08), rgba(111,78,55,0.03))',
                  border: '1px solid rgba(111,78,55,0.2)',
                  boxShadow: 'var(--shadow-soft)',
                }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(111,78,55,0.25)',
                  }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>$</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ganancias</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.1, marginTop: '0.1rem' }}>${statsData.total_ganancias}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {statsData.total_cortes > 0 ? `Promedio $${(statsData.total_ganancias / statsData.total_cortes).toFixed(0)}/corte` : ''}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bento-card" style={{ flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="skeleton" style={{ width: '40%', height: '1rem' }} />
                <div className="skeleton" style={{ width: '60%', height: '0.85rem' }} />
              </div>
              <div className="skeleton" style={{ width: '80px', height: '2rem', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      ) : citas.length === 0 ? (
        <div className="bento-card">
          <EmptyState message="No hay citas agendadas para hoy." />
        </div>
      ) : (
        <div className="bento-grid">
          {/* Left column - Main content */}
          <div className="bento-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Active cards (en_turno or first pendiente) */}
            {citasActivas.map(citaActiva => (
              <motion.div
                key={citaActiva.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                style={{
                  background: citaActiva.estado === 'en_turno'
                    ? 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.03))'
                    : 'var(--surface-color)',
                  border: `1px solid ${
                    citaActiva.estado === 'en_turno'
                      ? 'rgba(22,163,74,0.3)'
                      : isLate(citaActiva.hora)
                        ? 'rgba(239,68,68,0.3)'
                        : 'var(--accent-primary)'
                  }`,
                  borderRadius: '1.25rem', padding: '1.5rem',
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                  boxShadow: citaActiva.estado === 'en_turno'
                    ? '0 4px 20px rgba(22,163,74,0.15)'
                    : 'var(--shadow-soft)',
                }}
              >
                <div style={{
                  width: '60px', height: '60px', borderRadius: '16px',
                  background: citaActiva.estado === 'en_turno'
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #6f4e37, #8a6344)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: citaActiva.estado === 'en_turno'
                    ? '0 4px 12px rgba(22,163,74,0.3)'
                    : '0 4px 12px rgba(111,78,55,0.3)',
                }}>
                  <UserIcon size={28} color="#fff" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {citaActiva.cliente_nombre}
                    </span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                    }}>
                      <Scissors size={13} /> {citaActiva.servicio_nombre}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {renderBadge(citaActiva.estado)}
                    <span style={{
                      fontSize: '0.75rem', color: isLate(citaActiva.hora) ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: 500,
                    }}>
                      {citaActiva.barbero_nombre}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '2rem', fontWeight: 700,
                    color: citaActiva.estado === 'en_turno' ? '#16a34a' : 'var(--accent-primary)',
                    lineHeight: 1,
                  }}>
                    {citaActiva.hora?.substring(0, 5)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                    Hora
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexDirection: 'column' }}>
                  {citaActiva.estado === 'pendiente' ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleIniciar(citaActiva)}
                      disabled={accionando === citaActiva.id}
                      style={{
                        padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
                        background: accionando === citaActiva.id ? 'var(--text-muted)' : 'linear-gradient(135deg, #6f4e37, #8a6344)',
                        color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                        cursor: accionando === citaActiva.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(111,78,55,0.3)',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Play size={18} />
                      {accionando === citaActiva.id ? '...' : 'Empezar'}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenCompletar(citaActiva)}
                      disabled={accionando === citaActiva.id}
                      style={{
                        padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
                        background: accionando === citaActiva.id ? 'var(--text-muted)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                        cursor: accionando === citaActiva.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle size={18} />
                      {accionando === citaActiva.id ? '...' : 'Completar'}
                    </motion.button>
                  )}
                  {citaActiva.estado === 'pendiente' && isPrivileged && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditForm({
                            cliente_nombre: citaActiva.cliente_nombre, fecha: citaActiva.fecha,
                            hora: citaActiva.hora, barbero_id: citaActiva.barbero_id, servicio_id: citaActiva.servicio_id
                          });
                          setEditCitaId(citaActiva.id);
                        }}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                          background: 'transparent', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                        }}
                      >
                        <Edit2 size={14} /> Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCancelar(citaActiva.id)}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                        }}
                      >
                        <XCircle size={14} /> Cancelar
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Upcoming small cards (only within ~1hr) */}
            {siguientes.length > 0 && (
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                  <Clock size={12} /> Próximos ({siguientes.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <AnimatePresence>
                    {siguientes.map((cita, idx) => {
                      const overdue = isOverdue(cita.hora);
                      return (
                        <motion.div
                          key={cita.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.2 }}
                          layout
                          className="cita-card-small"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            background: overdue
                              ? 'rgba(239,68,68,0.06)'
                              : 'rgba(111,78,55,0.06)',
                            border: `1px solid ${
                              overdue ? 'rgba(239,68,68,0.2)' : 'rgba(111,78,55,0.12)'
                            }`,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleIniciar(cita)}
                        >
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            background: overdue
                              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                              : 'linear-gradient(135deg, #6f4e37, #8a6344)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <UserIcon size={14} color="#fff" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                            }}>
                              {cita.cliente_nombre}
                              {overdue && (
                                <span style={{
                                  fontSize: '0.6rem', fontWeight: 600, color: '#ef4444',
                                  background: 'rgba(239,68,68,0.12)',
                                  padding: '0.1rem 0.35rem', borderRadius: '4px',
                                }}>
                                  Atrasado
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '0.7rem', color: 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                            }}>
                              <Scissors size={10} /> {cita.servicio_nombre}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#d0c5af' }}>
                              {cita.hora?.substring(0, 5)}
                            </div>
                            {isPrivileged && (
                              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditForm({
                                      cliente_nombre: cita.cliente_nombre, fecha: cita.fecha,
                                      hora: cita.hora, barbero_id: cita.barbero_id, servicio_id: cita.servicio_id
                                    });
                                    setEditCitaId(cita.id);
                                  }}
                                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Editar"
                                >
                                  <Edit2 size={12} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelar(cita.id);
                                  }}
                                  style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                  title="Cancelar"
                                >
                                  <XCircle size={12} />
                                </motion.button>
                              </div>
                            )}
                          </div>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIniciar(cita);
                            }}
                            disabled={accionando === cita.id}
                            title={overdue ? "Saltar cita anterior y empezar esta" : "Empezar cita"}
                            style={{
                              padding: '0.35rem 0.7rem', borderRadius: '6px', border: 'none',
                              background: accionando === cita.id
                                ? 'var(--text-muted)'
                                : 'linear-gradient(135deg, #6f4e37, #8a6344)',
                              color: '#fff', fontWeight: 700, fontSize: '0.65rem',
                              cursor: accionando === cita.id ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap', flexShrink: 0,
                              opacity: 0.7,
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                          >
                            {accionando === cita.id ? '...' : (overdue ? 'Saltar' : 'Empezar')}
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Completed appointments (below próximos, above sidebar end) */}
            {completadas.length > 0 && (
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
                  display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem',
                  paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)',
                }}>
                  <CheckCircle size={12} /> Completadas ({completadas.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {completadas.map((cita, idx) => (
                    <motion.div
                      key={cita.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem 1rem', borderRadius: '8px',
                        opacity: 0.6, fontSize: '0.8rem',
                      }}
                    >
                      <CheckCircle size={14} color="#6b7280" />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>
                        {cita.cliente_nombre}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {cita.servicio_nombre}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {cita.hora?.substring(0, 5)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — Próximos restantes */}
          <div className="bento-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="bento-card" style={{ gap: '1rem', justifyContent: 'flex-start' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Próximos <strong style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{totalPendientes}</strong> restantes hoy
                </span>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
              }}>
                {pendientes.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '1rem 0',
                    color: 'var(--text-muted)', fontSize: '0.8rem',
                  }}>
                    {enTurno.length > 0 ? 'Cliente en atención' : 'No hay citas pendientes'}
                  </div>
                ) : (
                  pendientes.map((cita, idx) => {
                    const isActive = citasActivas.some(ca => ca.id === cita.id);
                    const overdue = isOverdue(cita.hora);
                    const prox = esProxima(cita.hora);
                    return (
                      <motion.div
                        key={cita.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: isActive ? '0.5rem 0.65rem' : '0.35rem 0.65rem',
                          borderRadius: '8px',
                          background: isActive
                            ? 'rgba(111,78,55,0.12)'
                            : overdue
                              ? 'rgba(239,68,68,0.06)'
                              : 'transparent',
                          border: isActive
                            ? '1px solid rgba(111,78,55,0.25)'
                            : overdue
                              ? '1px solid rgba(239,68,68,0.15)'
                              : '1px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: isActive
                            ? 'linear-gradient(135deg, #6f4e37, #8a6344)'
                            : overdue
                              ? 'rgba(239,68,68,0.2)'
                              : prox
                                ? 'rgba(111,78,55,0.2)'
                                : 'rgba(111,78,55,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 700,
                            color: isActive ? '#fff' : overdue ? '#ef4444' : prox ? 'var(--accent-primary)' : 'var(--text-muted)',
                          }}>
                            {idx + 1}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                            color: overdue ? '#ef4444' : 'var(--text-main)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                          }}>
                            {cita.cliente_nombre}
                            {overdue && (
                              <span style={{
                                fontSize: '0.5rem', color: '#ef4444',
                                background: 'rgba(239,68,68,0.12)',
                                padding: '0.05rem 0.25rem', borderRadius: '3px',
                              }}>
                                Atrasado
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '0.6rem', color: 'var(--text-muted)',
                          }}>
                            {cita.servicio_nombre}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive || prox ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                            {cita.hora?.substring(0, 5)}
                          </div>
                          {!isActive && isPrivileged && (
                            <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.1rem' }}>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditForm({
                                    cliente_nombre: cita.cliente_nombre, fecha: cita.fecha,
                                    hora: cita.hora, barbero_id: cita.barbero_id, servicio_id: cita.servicio_id
                                  });
                                  setEditCitaId(cita.id);
                                }}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}
                              >
                                <Edit2 size={12} />
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelar(cita.id);
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.1rem' }}
                              >
                                <XCircle size={12} />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Mini stats */}
              <div style={{
                display: 'flex', justifyContent: 'space-around', paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)', marginTop: 'auto',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {totalPendientes}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pendientes
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#16a34a' }}>
                    {completadas.length}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Completadas
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>
                    {enTurno.length}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    En turno
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cita */}
      <FormDialog isOpen={!!editCitaId} onClose={() => setEditCitaId(null)} title="Editar Cita">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label-sm">Cliente</label>
            <input type="text" value={editForm.cliente_nombre} onChange={(e) => setEditForm({ ...editForm, cliente_nombre: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label-sm">Fecha</label>
              <input type="date" value={editForm.fecha} onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label className="label-sm">Hora</label>
              <input type="time" value={editForm.hora} onChange={(e) => setEditForm({ ...editForm, hora: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label className="label-sm">Barbero</label>
            <select value={editForm.barbero_id} onChange={(e) => setEditForm({ ...editForm, barbero_id: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
              <option value="">Seleccionar...</option>
              {catalogos.barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Servicio</label>
            <select value={editForm.servicio_id} onChange={(e) => setEditForm({ ...editForm, servicio_id: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
              <option value="">Seleccionar...</option>
              {catalogos.servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} (${s.precio})</option>)}
            </select>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleUpdateCita} disabled={savingEdit}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: savingEdit ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
            {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
          </motion.button>
        </div>
      </FormDialog>

      {completarModalData && (
        <FormDialog
          isOpen={true}
          onClose={() => setCompletarModalData(null)}
          title="Completar Cita"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px' }}>
              <strong>Cliente:</strong> {completarModalData.cita.cliente_nombre}<br/>
              <strong>Servicio:</strong> {completarModalData.cita.servicio_nombre} (${completarModalData.cita.servicio_precio})
            </div>
            
            <h4 style={{ margin: '0', fontSize: '1rem' }}>Agregar Productos Extra</h4>
            <input 
              className="input-field" 
              placeholder="Buscar producto..." 
              value={searchProd} 
              onChange={(e) => setSearchProd(e.target.value)} 
            />
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem' }}>
              {inventario.filter(p => p.nombre.toLowerCase().includes(searchProd.toLowerCase())).length === 0 && (
                <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No se encontraron productos.</div>
              )}
              {inventario.filter(p => p.nombre.toLowerCase().includes(searchProd.toLowerCase())).map(p => {
                const sel = completarModalData.productos.find(sp => sp.id === p.id);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: sel ? 'rgba(111,78,55,0.1)' : 'transparent', borderRadius: '6px', cursor: 'pointer' }} onClick={() => toggleProductoCompletar(p)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock: {p.stock} | ${p.precio_venta}</div>
                    </div>
                    {sel ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => updateProductoCantidadCompletar(p.id, Math.max(1, sel.cantidad - 1))} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', color: 'var(--text-main)' }}>-</button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{sel.cantidad}</span>
                        <button type="button" onClick={() => updateProductoCantidadCompletar(p.id, Math.min(p.stock, sel.cantidad + 1))} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', color: 'var(--text-main)' }}>+</button>
                      </div>
                    ) : (
                      <button type="button" style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Agregar</button>
                    )}
                  </div>
                );
              })}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleCompletarSubmit} disabled={accionando === completarModalData.cita.id}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: accionando === completarModalData.cita.id ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
              {accionando === completarModalData.cita.id ? 'Finalizando...' : 'Finalizar y Cobrar'}
            </motion.button>
          </div>
        </FormDialog>
      )}
      {/* Keyboard shortcut hint */}
      <div className="shortcut-hint">
        <motion.button
          className="shortcut-hint-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowShortcuts(s => !s)}
          title="Atajos de teclado (Shift+?)"
        >
          <Keyboard size={18} />
        </motion.button>
        {showShortcuts && (
          <motion.div
            className="shortcut-hint-panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <h4>Atajos de teclado</h4>
            <div className="shortcut-row">
              <span>Nueva cita</span>
              <span className="shortcut-key"><span>Ctrl</span> + <span>N</span></span>
            </div>
            <div className="shortcut-row">
              <span>Actualizar agenda</span>
              <span className="shortcut-key"><span>Ctrl</span> + <span>R</span></span>
            </div>
            <div className="shortcut-row">
              <span>Cerrar ventana</span>
              <span className="shortcut-key"><span>Esc</span></span>
            </div>
            <div className="shortcut-row">
              <span>Este panel</span>
              <span className="shortcut-key"><span>Shift</span> + <span>?</span></span>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
