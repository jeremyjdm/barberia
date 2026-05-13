import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageTransition from './PageTransition';
import LoadingSkeleton from './LoadingSkeleton';

export default function AdminCorteHistorial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/caja/historial', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setHistorial(data);
    } catch (error) {
      console.error('Error fetching historial caja:', error);
    } finally {
      setLoading(false);
    }
  };

  const EstadoBadge = ({ estado }) => {
    const isOpen = estado === 'abierta';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.25rem 0.75rem', borderRadius: '999px',
        background: isOpen ? 'rgba(22,163,74,0.1)' : 'rgba(140,122,107,0.1)',
        color: isOpen ? '#16a34a' : '#8c7a6b',
        fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOpen ? '#16a34a' : '#8c7a6b', display: 'inline-block' }} />
        {estado}
      </span>
    );
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Historial de Cortes de Caja</h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
          {historial.length} registro{historial.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <LoadingSkeleton count={5} type="table" />
          </div>
        ) : historial.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No hay registros de cortes de caja.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--surface-container-high)' }}>
                  {['ID', 'Recepcionista', 'Apertura', 'Cierre', 'Fondo Inicial', 'Real Declarado', 'Esperado', 'Diferencia', 'Estado'].map((h) => (
                    <th key={h} style={{ padding: '1rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((c, idx) => {
                  const diferencia = c.monto_final_declarado - c.monto_esperado;
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(111,78,55,0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600 }}>#{c.id}</td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>{c.recepcionista || 'N/A'}</td>
                      <td style={{ padding: '0.85rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(c.fecha_apertura).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : '—'}</td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>${c.monto_inicial}</td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>{c.monto_final_declarado !== null ? `$${c.monto_final_declarado}` : '—'}</td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>{c.monto_esperado !== null ? `$${c.monto_esperado}` : '—'}</td>
                      <td style={{
                        padding: '0.85rem 0.75rem',
                        color: diferencia > 0 ? '#16a34a' : (diferencia < 0 ? '#dc2626' : 'inherit'),
                        fontWeight: diferencia !== 0 ? 700 : 400,
                      }}>
                        {c.monto_final_declarado !== null ? (diferencia > 0 ? `+ $${diferencia}` : `- $${Math.abs(diferencia)}`) : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <EstadoBadge estado={c.estado} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
