import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Banknote, CreditCard, Smartphone, AlertCircle, Receipt, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import PageTransition from './PageTransition';
import ConfirmDialog from './ConfirmDialog';

export default function CajeroCorte() {
  const { user } = useOutletContext();
  const toast = useToast();
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [montoReal, setMontoReal] = useState('');
  const [montoInicialForm, setMontoInicialForm] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchResumen();
  }, []);

  const fetchResumen = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/caja/resumen', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setResumen(data);
      } else {
        setResumen(null);
      }
    } catch (error) {
      console.error('Error fetching resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/caja/abrir', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_inicial: parseFloat(montoInicialForm) })
      });
      if (res.ok) {
        fetchResumen();
      } else {
        const data = await res.json();
        toast(data.error, 'error');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmCerrarCaja = async () => {
    setShowConfirm(false);
    setCerrando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/caja/cerrar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_real_efectivo: parseFloat(montoReal) })
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.mensaje, 'success');
        setResumen(null);
        setMontoReal('');
      } else {
        toast(data.error, 'error');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCerrando(false);
    }
  };

  if (user.rol === 'admin') {
    return (
      <PageTransition>
        <div className="bento-card" style={{
          maxWidth: '480px', margin: '4rem auto', textAlign: 'center',
          padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '2px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          </div>
          <h2 style={{ margin: 0 }}>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '320px', margin: 0 }}>
            El administrador no realiza cortes de caja. Ve a "Historial Caja" para ver los registros.
          </p>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="bento-grid">
          <div className="bento-card bento-col-6" style={{ gap: '0.75rem' }}>
            <div className="skeleton" style={{ width: '50%', height: '1rem' }} />
            <div className="skeleton" style={{ width: '80%', height: '2rem' }} />
            <div className="skeleton" style={{ width: '60%', height: '1rem' }} />
          </div>
          <div className="bento-card bento-col-6" style={{ gap: '0.75rem' }}>
            <div className="skeleton" style={{ width: '50%', height: '1rem' }} />
            <div className="skeleton" style={{ width: '80%', height: '2rem' }} />
            <div className="skeleton" style={{ width: '60%', height: '1rem' }} />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!resumen) {
    return (
      <PageTransition>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
            style={{
              maxWidth: '420px', width: '100%', padding: '2.5rem',
              background: 'var(--surface-color)',
              borderRadius: '1.75rem',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-elevated)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 24px rgba(111,78,55,0.3)',
            }}>
              <DollarSign size={28} color="#fff" />
            </div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Caja Cerrada</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              Ingresa el monto inicial para abrir la caja
            </p>
            <form onSubmit={handleAbrirCaja} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Monto Inicial (Fondo de Caja)
                </label>
                <input
                  required type="number" step="0.01"
                  value={montoInicialForm}
                  onChange={e => setMontoInicialForm(e.target.value)}
                  placeholder="$0.00"
                  style={{
                    width: '100%', padding: '0.9rem 1rem', fontSize: '1.8rem', fontWeight: 700,
                    color: 'var(--accent-primary)', textAlign: 'center',
                    border: '2px solid var(--border-color)', borderRadius: '14px',
                    background: 'rgba(111,78,55,0.04)', outline: 'none', boxSizing: 'border-box',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#6f4e37'; e.target.style.boxShadow = '0 0 0 4px rgba(111,78,55,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '0.9rem', borderRadius: '999px', border: 'none',
                  background: 'linear-gradient(135deg, #6f4e37, #965a3e)',
                  color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(111,78,55,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <DollarSign size={18} />
                Abrir Caja
              </motion.button>
            </form>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={24} style={{ color: 'var(--accent-primary)' }} />
          Corte de Caja
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
          Turno actual — caja abierta
        </p>
      </div>

      <div className="bento-grid">
        {/* Left card: Resumen del Sistema */}
        <div className="bento-card" style={{
          gridColumn: 'span 6',
          padding: '1.75rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={18} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Resumen del Sistema</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Row label="Fondo Inicial" value={`$${resumen.monto_inicial}`} />
            <Row label="Ventas Efectivo" value={`+ $${resumen.ventas_efectivo}`} icon={Banknote} color="#16a34a" />
            <Row label="Ventas Tarjeta" value={`$${resumen.ventas_tarjeta}`} icon={CreditCard} />
            <Row label="Ventas Transferencia" value={`$${resumen.ventas_transferencia}`} icon={Smartphone} />
            <Row label="Gastos (Caja Chica)" value={`- $${resumen.gastos}`} color="#dc2626" />
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 0 0', marginTop: 'auto',
            borderTop: '2px solid rgba(111,78,55,0.3)',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
              Efectivo Esperado
            </span>
            <span style={{
              fontWeight: 800, fontSize: '1.4rem',
              color: 'var(--accent-primary)',
              background: 'rgba(111,78,55,0.1)',
              padding: '0.25rem 1rem', borderRadius: '999px',
            }}>
              ${resumen.saldo_esperado_efectivo}
            </span>
          </div>
        </div>

        {/* Right card: Ejecutar Corte Físico */}
        <div className="bento-card" style={{
          gridColumn: 'span 6',
          padding: '1.75rem',
          border: '1px solid rgba(111,78,55,0.35)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            paddingBottom: '0.75rem', borderBottom: '1px solid rgba(111,78,55,0.2)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6f4e37, #965a3e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={18} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>
              Ejecutar Corte Físico
            </h3>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Cuenta el dinero físico en tu cajón y decláralo.
            El sistema calculará la diferencia automáticamente.
          </p>

          <form onSubmit={handleCerrarCaja} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--text-muted)', marginBottom: '0.5rem',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Efectivo Real en Cajón
              </label>
              <input
                required type="number" step="0.01"
                value={montoReal}
                onChange={e => setMontoReal(e.target.value)}
                placeholder="$0.00"
                style={{
                  width: '100%', padding: '1rem', fontSize: '2.2rem', fontWeight: 800,
                  color: 'var(--accent-primary)', textAlign: 'center',
                  border: '2px solid rgba(111,78,55,0.3)', borderRadius: '14px',
                  background: 'rgba(111,78,55,0.04)', outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#6f4e37'; e.target.style.boxShadow = '0 0 0 4px rgba(111,78,55,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(111,78,55,0.3)'; e.target.style.boxShadow = 'none'; }}
                autoFocus
              />
            </div>

            {/* Diferencia preview */}
            {montoReal && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: '10px',
                  background: 'rgba(111,78,55,0.06)', border: '1px solid rgba(111,78,55,0.1)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Diferencia
                </span>
                <span style={{
                  fontWeight: 700, fontSize: '1.1rem',
                  color: parseFloat(montoReal) >= parseFloat(resumen.saldo_esperado_efectivo) ? '#16a34a' : '#dc2626',
                }}>
                  {parseFloat(montoReal) >= parseFloat(resumen.saldo_esperado_efectivo) ? '+' : ''}
                  ${(parseFloat(montoReal || 0) - parseFloat(resumen.saldo_esperado_efectivo)).toFixed(2)}
                </span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={cerrando}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                background: cerrando
                  ? 'var(--border-color)'
                  : 'linear-gradient(135deg, #6f4e37, #965a3e)',
                color: '#fff', fontWeight: 700, fontSize: '1.05rem',
                cursor: cerrando ? 'not-allowed' : 'pointer',
                boxShadow: cerrando ? 'none' : '0 4px 20px rgba(111,78,55,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              {cerrando ? (
                'Cerrando...'
              ) : (
                <>
                  <CheckCircle size={20} />
                  Cerrar Caja Definitivamente
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmCerrarCaja}
        title="¿Cerrar Caja?"
        message="Estás a punto de cerrar la caja actual. Asegúrate de haber contado el efectivo real en tu cajón. Esta acción no se puede deshacer."
        confirmText="Cerrar Caja"
        destructive={false}
      />
    </PageTransition>
  );
}

function Row({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {Icon && <Icon size={15} />}
        {label}
      </span>
      <span style={{ fontWeight: 600, color: color || 'var(--text-main)' }}>
        {value}
      </span>
    </div>
  );
}
