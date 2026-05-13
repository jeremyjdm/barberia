import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Calendar2Weeks({
  selectedDate, onSelectDate,
  selectedHour, onSelectHour,
  compact, sideBySide,
  barberoId, servicioId,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [available, setAvailable] = useState([]);
  const [occupied, setOccupied] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isPast = (d) => d < today;

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPad = firstDay.getDay();
    const arr = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      arr.push(new Date(viewYear, viewMonth, d));
    }
    const remaining = (7 - (arr.length % 7)) % 7;
    for (let i = 0; i < remaining; i++) arr.push(null);
    return arr;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  const isToday = (d) => d.toDateString() === today.toDateString();

  const isSelected = (d) => selectedDate && d.toDateString() === new Date(selectedDate + 'T12:00:00').toDateString();

  const fetchDisponibilidad = useCallback(async () => {
    if (!selectedDate || !barberoId || !servicioId) return;
    setLoadingSlots(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/citas/disponibilidad?barbero_id=${barberoId}&fecha=${selectedDate}&servicio_id=${servicioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAvailable(data.available || []);
        setOccupied(data.occupied || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, barberoId, servicioId]);

  useEffect(() => {
    fetchDisponibilidad();
  }, [fetchDisponibilidad]);

  // Clear selected hour if it becomes unavailable
  useEffect(() => {
    if (selectedHour && available.length > 0 && !available.includes(selectedHour)) {
      onSelectHour(null);
    }
  }, [available, selectedHour, onSelectHour]);

  const c = compact
    ? { gap: '0.4rem', labelSize: '0.75rem', datePad: '0.3rem 0', dateSize: '0.7rem', daySize: '0.6rem', hourPad: '0.35rem 0.2rem', hourSize: '0.65rem', hourCols: '3' }
    : { gap: '0.75rem', labelSize: '0.85rem', datePad: '0.45rem 0', dateSize: '0.8rem', daySize: '0.7rem', hourPad: '0.45rem 0.3rem', hourSize: '0.75rem', hourCols: '4' };

  const hourContainerStyle = {
    maxHeight: compact ? '160px' : '220px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'grid',
    gridTemplateColumns: `repeat(${c.hourCols}, 1fr)`,
    gap: compact ? '0.25rem' : '0.35rem',
    paddingRight: '4px',
    scrollBehavior: 'smooth',
  };

  const renderCalendar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: c.gap }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '0.35rem',
      }}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevMonth}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
            borderRadius: '6px', display: 'flex',
          }}
        >
          <ChevronLeft size={compact ? 16 : 20} />
        </motion.button>
        <motion.span
          key={`${viewMonth}-${viewYear}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontWeight: 700, fontSize: c.labelSize,
            color: 'var(--text-main)', cursor: 'pointer',
          }}
          onClick={goToToday}
        >
          {meses[viewMonth]} {viewYear}
        </motion.span>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextMonth}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
            borderRadius: '6px', display: 'flex',
          }}
        >
          <ChevronRight size={compact ? 16 : 20} />
        </motion.button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: compact ? '0.2rem' : '0.3rem',
        }}
      >
        {diasSemana.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center', fontSize: c.daySize, fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              padding: '0.15rem 0',
            }}
          >
            {d}
          </div>
        ))}
        {days.map((d, idx) => {
          if (!d) return <div key={`e-${idx}`} />;
          const past = isPast(d);
          const today_ = isToday(d);
          const sel = isSelected(d);
          const isCurrentMonth = d.getMonth() === viewMonth;
          return (
            <motion.button
              type="button"
              key={idx}
              whileHover={!past && isCurrentMonth ? { scale: 1.1 } : {}}
              whileTap={!past && isCurrentMonth ? { scale: 0.95 } : {}}
              disabled={past || !isCurrentMonth}
              onClick={() => {
                if (!past && isCurrentMonth) {
                  onSelectDate(d.toISOString().split('T')[0]);
                }
              }}
              style={{
                padding: c.datePad,
                borderRadius: '8px',
                border: `1px solid ${sel ? 'var(--accent-primary)' : today_ ? 'var(--accent-primary)' : 'transparent'}`,
                background: sel
                  ? 'linear-gradient(135deg, #6f4e37, #8a6344)'
                  : (today_ ? 'rgba(111,78,55,0.15)' : 'transparent'),
                color: sel
                  ? 'var(--on-primary)'
                  : (past || !isCurrentMonth ? 'var(--text-muted)' : 'var(--text-main)'),
                fontWeight: sel || today_ ? 700 : 400,
                fontSize: c.dateSize,
                cursor: (past || !isCurrentMonth) ? 'not-allowed' : 'pointer',
                opacity: (past || !isCurrentMonth) ? 0.35 : 1,
                transition: 'all 0.15s',
              }}
            >
              {d.getDate()}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderHours = () => {
    if (!selectedDate) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <label style={{
            fontSize: c.labelSize, fontWeight: 600, color: 'var(--text-main)',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            <Clock size={compact ? 14 : 16} /> Horas Disponibles
          </label>
          {loadingSlots && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                border: '2px solid var(--text-muted)',
                borderTopColor: 'transparent', display: 'inline-block',
                animation: 'spin 0.6s linear infinite',
              }} />
              Cargando...
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!loadingSlots && available.length === 0 && occupied.length === 0 ? (
            <motion.div
              key="no-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center', padding: '1.5rem 0',
                color: 'var(--text-muted)', fontSize: '0.8rem',
              }}
            >
              Selecciona un barbero y servicio para ver horarios
            </motion.div>
          ) : !loadingSlots && available.length === 0 ? (
            <motion.div
              key="no-slots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: 'center', padding: '1.5rem 0',
                color: 'var(--text-muted)', fontSize: '0.8rem',
              }}
            >
              No hay horarios disponibles para este día
            </motion.div>
          ) : (
            <div className="hours-scroll-container" style={hourContainerStyle}>
              {[...available, ...occupied].sort((a, b) => toMinutes(a) - toMinutes(b)).map((h, idx) => {
                const isAvail = available.includes(h);
                const sel = selectedHour === h;
                return (
                  <motion.button
                    type="button"
                    key={h}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.5), duration: 0.2 }}
                    whileHover={isAvail ? { scale: 1.05 } : {}}
                    whileTap={isAvail ? { scale: 0.95 } : {}}
                    onClick={() => isAvail && onSelectHour(h)}
                    disabled={!isAvail}
                    className={`hour-slot ${isAvail ? 'hour-slot--available' : 'hour-slot--occupied'} ${sel ? 'hour-slot--selected' : ''}`}
                    style={{
                      padding: c.hourPad,
                      borderRadius: '8px',
                      border: `1px solid ${
                        sel ? 'var(--accent-primary)' : isAvail ? 'var(--border-color)' : 'var(--border-color)'
                      }`,
                      background: sel
                        ? 'linear-gradient(135deg, #6f4e37, #8a6344)'
                        : isAvail
                          ? 'var(--surface-color)'
                          : 'transparent',
                      color: sel
                        ? 'var(--on-primary)'
                        : isAvail
                          ? 'var(--text-main)'
                          : 'var(--text-muted)',
                      fontWeight: sel ? 700 : (isAvail ? 500 : 400),
                      fontSize: c.hourSize,
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      opacity: isAvail ? 1 : 0.4,
                      transition: 'all 0.15s',
                      textDecoration: isAvail ? 'none' : 'line-through',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {h}
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: c.gap }}>
      <label style={{ fontSize: c.labelSize, fontWeight: 600, color: 'var(--text-main)' }}>
        Seleccionar Fecha
      </label>
      {sideBySide ? (
        <div className="calendar-sidebyside" style={{
          display: 'grid',
          gridTemplateColumns: selectedDate ? '1fr 1fr' : '1fr',
          gap: '0.75rem',
        }}>
          {renderCalendar()}
          {renderHours()}
        </div>
      ) : (
        <>
          {renderCalendar()}
          {renderHours()}
        </>
      )}
    </div>
  );
}
