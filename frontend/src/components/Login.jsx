import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scissors, Star, Sparkles, Wind, Zap } from 'lucide-react';

/* ─── Barber SVG Icons ─── */

function SvgBarberPole({ size = 24 }) {
  const id = useMemo(() => `pole-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg width={size} height={size * 2.8} viewBox="0 0 40 112" fill="none">
      <defs>
        <clipPath id={id}>
          <rect x="8" y="4" width="24" height="104" rx="10" />
        </clipPath>
      </defs>
      <rect x="8" y="4" width="24" height="104" rx="10" fill="#e8e0d4" />
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={i * 7 - 40} y="0" width="6" height="112" fill={i % 3 === 0 ? '#c0392b' : i % 3 === 1 ? '#2c6eb4' : '#e8e0d4'} transform={`rotate(-35, ${i * 7 - 37}, 56)`} />
        ))}
      </g>
      <rect x="5" y="0" width="30" height="6" rx="3" fill="#888" />
      <rect x="5" y="106" width="30" height="6" rx="3" fill="#888" />
      <rect x="3" y="-2" width="34" height="3" rx="1.5" fill="#aaa" />
      <rect x="3" y="111" width="34" height="3" rx="1.5" fill="#aaa" />
    </svg>
  );
}

function SvgClippers({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="20" y="10" width="34" height="20" rx="4" fill="currentColor" fillOpacity="0.08" />
      <rect x="8" y="14" width="14" height="12" rx="2" fill="currentColor" fillOpacity="0.06" />
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={8 + i * 2.8} y1="14" x2={10 + i * 2.8} y2="8" />
      ))}
      <path d="M54 16 Q64 16 62 24 Q60 30 52 26" />
      <line x1="24" y1="30" x2="24" y2="36" strokeWidth="2" />
      <line x1="48" y1="30" x2="48" y2="36" strokeWidth="2" />
      <line x1="18" y1="22" x2="34" y2="22" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  );
}

function SvgRazor({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 28 L20 8 L36 12 L24 32 Z" fill="currentColor" fillOpacity="0.08" />
      <path d="M20 8 L18 4 L34 8 L36 12" />
      <path d="M36 16 Q44 14 50 18 Q54 24 48 28 Q42 30 38 26" fill="currentColor" fillOpacity="0.06" />
    </svg>
  );
}

function SvgComb({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="42" height="6" rx="1" fill="currentColor" fillOpacity="0.08" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <line key={i} x1={6 + i * 4.5} y1="12" x2={6 + i * 4.5} y2="26" />
      ))}
      <path d="M46 9 Q58 9 56 15 Q54 21 46 18" />
    </svg>
  );
}

function SvgMustache({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14 Q12 6 22 12 Q28 18 30 16 Q32 18 38 12 Q48 6 54 14" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

function SvgBeard({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14 Q10 10 14 8 Q20 6 26 8 Q30 10 28 14" />
      <path d="M12 14 Q10 20 12 28 Q14 34 20 36 Q26 34 28 28 Q30 20 28 14" fill="currentColor" fillOpacity="0.08" />
      <path d="M16 18 Q20 16 24 18" strokeWidth="1" opacity="0.5" />
      <path d="M14 22 Q20 20 26 22" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function SvgHairDryer({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="20" rx="12" ry="14" fill="currentColor" fillOpacity="0.08" />
      <path d="M26 14 L48 6 L48 34 L26 26" fill="currentColor" fillOpacity="0.06" />
      <path d="M48 6 Q56 4 54 10 L48 14" />
      <path d="M48 34 Q56 36 54 30 L48 26" />
      <line x1="8" y1="10" x2="10" y2="8" strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="16" x2="4" y2="14" strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="24" x2="4" y2="26" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function SvgBrush({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="2" width="14" height="16" rx="2" fill="currentColor" fillOpacity="0.08" />
      <path d="M14 18 L10 26" />
      <path d="M28 18 L32 26" />
      <path d="M18 18 L16 26" />
      <path d="M24 18 L26 26" />
      <path d="M21 18 L21 26" />
    </svg>
  );
}

function SvgBarberCape({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 50 42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M25 4 Q30 2 38 6 Q42 10 44 18 Q46 28 40 36 Q34 40 25 40 Q16 40 10 36 Q4 28 6 18 Q8 10 12 6 Q20 2 25 4" fill="currentColor" fillOpacity="0.08" />
      <path d="M25 4 L25 18" strokeWidth="1" opacity="0.4" />
      <path d="M12 10 Q18 14 25 12 Q32 14 38 10" strokeWidth="1" opacity="0.3" />
      <path d="M20 18 L30 18 L28 24 L22 24 Z" fill="currentColor" fillOpacity="0.06" strokeWidth="1" />
    </svg>
  );
}

function SvgCap({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 50 34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20 Q6 10 14 6 Q25 2 36 6 Q44 10 44 20" fill="currentColor" fillOpacity="0.08" />
      <path d="M6 20 Q6 24 10 24 Q14 24 14 20" />
      <path d="M44 20 Q44 24 40 24 Q36 24 36 20" />
      <path d="M10 20 L40 20" strokeWidth="1" opacity="0.4" />
      <path d="M25 6 Q28 8 28 12" strokeWidth="1.5" />
      <path d="M14 20 Q14 28 25 30 Q36 28 36 20" fill="currentColor" fillOpacity="0.06" />
    </svg>
  );
}

function SvgProduct({ size = 24 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 36 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="12" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.08" />
      <rect x="12" y="6" width="12" height="8" rx="3" fill="currentColor" fillOpacity="0.06" />
      <rect x="14" y="3" width="8" height="4" rx="1.5" />
      <line x1="18" y1="6" x2="18" y2="10" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="18" x2="22" y2="18" strokeWidth="1" opacity="0.3" />
      <line x1="14" y1="24" x2="22" y2="24" strokeWidth="1" opacity="0.3" />
      <line x1="14" y1="30" x2="20" y2="30" strokeWidth="1" opacity="0.3" />
      <circle cx="18" cy="8" r="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function SvgTrimmer({ size = 24 }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 56 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="18" y="8" width="28" height="14" rx="3" fill="currentColor" fillOpacity="0.08" />
      <rect x="8" y="10" width="12" height="10" rx="1.5" fill="currentColor" fillOpacity="0.06" />
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={8 + i * 2.8} y1="10" x2={10 + i * 2.8} y2="6" />
      ))}
      <path d="M46 10 Q52 10 52 16 Q52 20 46 18" />
      <line x1="22" y1="22" x2="22" y2="26" strokeWidth="2" />
      <line x1="40" y1="22" x2="40" y2="26" strokeWidth="2" />
      <line x1="30" y1="8" x2="30" y2="4" strokeWidth="1.5" />
      <circle cx="30" cy="3" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/* ─── Icon registry ─── */

const ALL_ICONS = [
  { Component: Scissors },
  { Component: Scissors },
  { Component: SvgBarberPole },
  { Component: SvgClippers },
  { Component: SvgClippers },
  { Component: SvgRazor },
  { Component: SvgRazor },
  { Component: SvgComb },
  { Component: SvgMustache },
  { Component: SvgBeard },
  { Component: SvgHairDryer },
  { Component: SvgBrush },
  { Component: SvgBarberCape },
  { Component: SvgCap },
  { Component: SvgProduct },
  { Component: SvgProduct },
  { Component: SvgTrimmer },
  { Component: Star },
  { Component: Sparkles },
  { Component: Zap },
  { Component: Wind },
];

/* ─── Layer config (reduced count) ─── */

const LAYERS = [
  { key: 'far', count: 12, sizeRange: [44, 72], opacityRange: [0.08, 0.15] },
  { key: 'mid', count: 18, sizeRange: [22, 42], opacityRange: [0.14, 0.26] },
  { key: 'near', count: 10, sizeRange: [12, 24], opacityRange: [0.22, 0.4] },
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return min + Math.random() * (max - min); }

/* ─── Static background icons (no JS animations) ─── */

function StaticIcon({ Component, size, opacity, layerKey, index }) {
  const style = useMemo(() => {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const isGold = Math.random() > 0.55;
    const delay = Math.random() * 6;
    const isFar = layerKey === 'far';
    const isMid = layerKey === 'mid';
    return {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      color: isGold ? 'var(--accent-secondary)' : 'var(--accent-primary)',
      opacity,
      pointerEvents: 'none',
      zIndex: isFar ? 0 : layerKey === 'near' ? 2 : 1,
      filter: isFar ? 'blur(1px)' : 'none',
      animationDelay: `${delay}s`,
    };
  }, []);

  return (
    <div
      className={`bg-icon bg-icon--${layerKey}`}
      style={style}
    >
      <Component size={size} />
    </div>
  );
}

/* ─── Main ─── */

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [barberiaNombre, setBarberiaNombre] = useState('');
  const [barberiaLogoUrl, setBarberiaLogoUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3000/api/configuracion')
      .then(r => r.json())
      .then(data => {
        if (data.nombre_barberia) setBarberiaNombre(data.nombre_barberia);
        if (data.logo_url) setBarberiaLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.rol === 'admin') {
        navigate('/dashboard/admin');
      } else if (data.user.rol === 'recepcionista') {
        navigate('/dashboard/registrar-cita');
      } else {
        navigate('/dashboard/caja');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const layerIcons = useMemo(() =>
    LAYERS.map(layer =>
      Array.from({ length: layer.count }, () => ({
        ...pickRandom(ALL_ICONS),
        size: rand(layer.sizeRange[0], layer.sizeRange[1]),
        opacity: rand(layer.opacityRange[0], layer.opacityRange[1]),
      }))
    ), []
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
    }}>
      {/* ── Bg: diagonal stripes ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 28px, rgba(111,78,55,0.02) 28px, rgba(111,78,55,0.02) 29px)',
      }} />

      {/* ── Bg: gradient blobs ── */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: '700px', height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(111,78,55,0.18) 0%, rgba(111,78,55,0.06) 40%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(111,78,55,0.12) 0%, rgba(111,78,55,0.04) 40%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '25%', width: '400px', height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(208,197,175,0.06) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Bg: vignette ── */}
      <div className="login-vignette" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(18,20,20,0.7) 100%)',
      }} />

      {/* ── Bg: barber pole (left) — CSS animation only ── */}
      <div className="barber-pole-bg" style={{
        position: 'absolute', left: '-40px', bottom: '-60px',
        color: 'var(--accent-primary)', opacity: 0.05,
        pointerEvents: 'none', zIndex: 0,
      }}>
        <SvgBarberPole size={260} />
      </div>

      {/* ── Bg: barber pole (right) — CSS animation only ── */}
      <div className="barber-pole-bg" style={{
        position: 'absolute', right: '-30px', top: '-40px',
        color: 'var(--accent-primary)', opacity: 0.05,
        pointerEvents: 'none', zIndex: 0, transform: 'scaleX(-1)',
        animationDirection: 'reverse',
      }}>
        <SvgBarberPole size={240} />
      </div>

      {/* ── Bg: sparkle particles (CSS only) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {[
          { x: 10, y: 15, s: 2.5, d: 0 },
          { x: 85, y: 10, s: 2, d: 1.2 },
          { x: 50, y: 5, s: 3, d: 2.5 },
          { x: 75, y: 80, s: 2, d: 0.8 },
          { x: 15, y: 75, s: 2.5, d: 3 },
          { x: 90, y: 55, s: 1.5, d: 1.8 },
          { x: 30, y: 90, s: 3, d: 0.3 },
          { x: 60, y: 85, s: 2, d: 2 },
        ].map((p, i) => (
          <div
            key={i}
            className="sparkle-particle"
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s,
              height: p.s,
              borderRadius: '50%',
              background: 'var(--accent-secondary)',
              pointerEvents: 'none',
              boxShadow: '0 0 4px rgba(208,197,175,0.3)',
              animationDelay: `${p.d}s`,
              animationDuration: `${2.5 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* ── Bg: static floating icons ── */}
      {layerIcons.map((icons, layerIdx) =>
        icons.map((item, i) => (
          <StaticIcon
            key={`${layerIdx}-${i}`}
            Component={item.Component}
            size={Math.round(item.size)}
            opacity={item.opacity}
            layerKey={LAYERS[layerIdx].key}
            index={i}
          />
        ))
      )}

      {/* ── Login Card (only 3 JS animations: entrance, icon, button) ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        className="login-card"
        style={{
          width: 'min(100%, 420px)',
          borderRadius: '1.75rem',
          padding: '2.75rem',
          boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          border: '1px solid rgba(111,78,55,0.25)',
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* ── Card bg pattern ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '1.75rem',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none', zIndex: -1,
        }} />

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            animate={barberiaLogoUrl ? {} : { rotate: [0, 12, 0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '68px', height: '68px', borderRadius: '20px',
              background: barberiaLogoUrl ? 'transparent' : 'linear-gradient(135deg, #6f4e37, #8a6344)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              boxShadow: barberiaLogoUrl ? 'none' : '0 8px 32px rgba(111,78,55,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
            }}
          >
            {barberiaLogoUrl ? (
              <img src={barberiaLogoUrl} alt="Logo" style={{ maxWidth: '68px', maxHeight: '68px', borderRadius: '12px', objectFit: 'contain' }} />
            ) : (
              <Scissors size={34} color="#fff" />
            )}
            <div style={{
              position: 'absolute', inset: -3, borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(111,78,55,0.4), transparent)',
              zIndex: -1, filter: 'blur(10px)',
            }} />
          </motion.div>
          {barberiaNombre && (
            <h1 style={{
              margin: '0.75rem 0 0', fontSize: '1.6rem', fontWeight: 700,
              color: 'var(--text-main)', fontFamily: 'var(--font-heading)',
            }}>
              {barberiaNombre}
            </h1>
          )}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)',
                color: 'var(--error)', fontSize: '0.875rem', fontWeight: 500,
              }}
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="label-sm">Usuario</label>
            <div style={{ position: 'relative' }}>
              <svg style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none', opacity: 0.6,
              }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="input-field"
                style={{ padding: '0.8rem 1rem 0.8rem 2.5rem' }}
              />
            </div>
          </div>

          <div>
            <label className="label-sm">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <svg style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none', opacity: 0.6,
              }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="input-field"
                style={{ padding: '0.8rem 1rem 0.8rem 2.5rem' }}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02, boxShadow: '0 6px 32px rgba(111,78,55,0.55)' } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
            className="login-sheen-btn"
            style={{
              width: '100%', padding: '0.95rem', borderRadius: '999px', border: 'none',
              fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em',
              color: '#fff',
              background: loading ? 'var(--border-color)' : 'linear-gradient(135deg, #6f4e37, #965a3e)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(111,78,55,0.4)',
              transition: 'background 0.25s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              position: 'relative',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                Entrando...
              </>
            ) : (
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scissors size={18} />
                Iniciar Sesión
              </span>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
