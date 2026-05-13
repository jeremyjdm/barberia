import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '../contexts/ToastContext';
import PageTransition from './PageTransition';

const BASE = 'http://localhost:3000';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DONUT_COLORS = ['#6f4e37', '#8a6344', '#a67c52', '#c49a6c', '#d4a76a', '#b8845a', '#9a6f4a', '#7a5a3a'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'var(--surface-color)', border: '1px solid var(--border-color)',
      borderRadius: '10px', padding: '0.6rem 0.85rem', boxShadow: 'var(--shadow-elevated)',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.name === 'Ingresos' ? `$${p.value}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const toast = useToast();
  const now = new Date();
  const [rango, setRango] = useState('semana');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchGraficas();
  }, [rango, mes, anio]);

  const fetchGraficas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = rango === 'semana' ? 'rango=semana' : `rango=mes&month=${mes}&year=${anio}`;
      const res = await fetch(`${BASE}/api/admin/graficas?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (f) => {
    const d = new Date(f + 'T12:00');
    if (rango === 'semana') {
      return d.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    return String(d.getDate());
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            Bienvenido, {user?.nombre || user?.username}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'semana', label: 'Semana' },
          { key: 'mes', label: 'Mes' },
        ].map((f) => (
          <motion.button key={f.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setRango(f.key)}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '999px', border: 'none',
              background: rango === f.key ? 'var(--accent-primary)' : 'var(--surface-color)',
              color: rango === f.key ? '#fff' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              boxShadow: rango === f.key ? '0 4px 12px rgba(111,78,55,0.25)' : 'none',
              border: rango === f.key ? 'none' : '1px solid var(--border-color)',
              transition: 'all 0.2s',
            }}
          >
            {f.label}
          </motion.button>
        ))}
        {rango === 'mes' && (
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
            style={{
              padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--border-color)',
              background: 'var(--surface-color)', color: 'var(--text-main)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              outline: 'none',
            }}
          >
            {meses.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="bento-grid">
          <div className="bento-col-12 bento-card" style={{ minHeight: '320px', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '40%', height: '1.2rem' }} />
            <div className="skeleton" style={{ width: '100%', flex: 1 }} />
          </div>
          <div className="bento-col-4 bento-card"><div className="skeleton" style={{ width: '60%', height: '1rem' }} /><div className="skeleton" style={{ width: '40%', height: '2rem', marginTop: '0.5rem' }} /></div>
          <div className="bento-col-4 bento-card"><div className="skeleton" style={{ width: '60%', height: '1rem' }} /><div className="skeleton" style={{ width: '40%', height: '2rem', marginTop: '0.5rem' }} /></div>
          <div className="bento-col-4 bento-card"><div className="skeleton" style={{ width: '60%', height: '1rem' }} /><div className="skeleton" style={{ width: '40%', height: '2rem', marginTop: '0.5rem' }} /></div>
        </div>
      ) : data ? (
        <>
          <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="bento-col-12">
              <div className="bento-card" style={{ gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {rango === 'semana' ? 'Últimos 7 días' : `${meses[mes - 1]} ${anio}`}
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6f4e37' }} />
                      Cortes
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#16a34a' }} />
                      Ingresos
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer>
                    <BarChart data={data.diario} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                      <XAxis dataKey="fecha" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(111,78,55,0.06)' }} />
                      <Bar yAxisId="left" dataKey="cortes" name="Cortes" fill="#6f4e37" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar yAxisId="right" dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="bento-col-4">
              <motion.div className="bento-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ gap: '0.5rem' }}
              >
                <span className="text-overline">Total Cortes</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '-0.03em' }}>
                    {data.totalCortes}
                  </span>
                  {data.semanaAnterior && data.semanaAnterior.cortes > 0 && (
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: data.totalCortes >= data.semanaAnterior.cortes ? '#16a34a' : '#dc2626',
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                    }}>
                      {data.totalCortes >= data.semanaAnterior.cortes ? '↑' : '↓'}
                      {Math.abs(((data.totalCortes - data.semanaAnterior.cortes) / data.semanaAnterior.cortes) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {rango === 'semana' ? 'en los últimos 7 días' : `en ${meses[mes - 1]}`}
                </span>
              </motion.div>
            </div>

            <div className="bento-col-4">
              <motion.div className="bento-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                style={{ gap: '0.5rem' }}
              >
                <span className="text-overline">Ingresos Totales</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 700, color: '#16a34a', letterSpacing: '-0.03em' }}>
                    ${data.totalIngresos}
                  </span>
                  {data.semanaAnterior && data.semanaAnterior.ingresos > 0 && (
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: data.totalIngresos >= data.semanaAnterior.ingresos ? '#16a34a' : '#dc2626',
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                    }}>
                      {data.totalIngresos >= data.semanaAnterior.ingresos ? '↑' : '↓'}
                      {Math.abs(((data.totalIngresos - data.semanaAnterior.ingresos) / data.semanaAnterior.ingresos) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {data.totalCortes > 0 ? `Promedio $${(data.totalIngresos / data.totalCortes).toFixed(0)}/corte` : 'Sin actividad'}
                </span>
              </motion.div>
            </div>

            <div className="bento-col-4">
              <motion.div className="bento-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ gap: '0.5rem' }}
              >
                <span className="text-overline">Barbero del Período</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '1rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {data.topBarbero.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{data.topBarbero.nombre}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{data.topBarbero.total} corte{data.topBarbero.total !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="bento-col-6">
              <motion.div className="bento-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: '1.25rem' }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <span className="text-overline">Servicio Estrella</span>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                    {data.topServicio.nombre}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {data.topServicio.total} realizad{data.topServicio.total !== 1 ? 'os' : 'o'} en este período
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="bento-col-6">
              <motion.div className="bento-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ gap: '1rem' }}
              >
                <span className="text-overline">Distribución de Servicios</span>
                {data.distribucionServicios && data.distribucionServicios.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', height: '140px' }}>
                    <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={data.distribucionServicios}
                            dataKey="total"
                            nameKey="nombre"
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={52}
                          >
                            {data.distribucionServicios.map((_, i) => (
                              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', overflow: 'hidden' }}>
                      {data.distribucionServicios.slice(0, 4).map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600, marginLeft: 'auto' }}>{s.total}</span>
                        </div>
                      ))}
                      {data.distribucionServicios.length > 4 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{data.distribucionServicios.length - 4} más</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin datos</span>
                )}
              </motion.div>
            </div>
          </div>
        </>
      ) : (
        <div className="bento-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay datos disponibles para este período.</span>
        </div>
      )}
    </PageTransition>
  );
}
