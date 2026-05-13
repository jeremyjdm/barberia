import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, ShoppingCart, X, Minus, Plus as PlusIcon, ImageIcon, ArrowRight, Store, Settings } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from './PageTransition';

const BASE = 'http://localhost:3000';

export default function Inventario() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('tienda');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [form, setForm] = useState({ nombre: '', precio_venta: '', stock: '' });
  const [formImage, setFormImage] = useState(null);
  const [formPreview, setFormPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchProductos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/api/inventario`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProductos(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: '', precio_venta: '', stock: '' });
    setFormImage(null);
    setFormPreview(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ nombre: p.nombre, precio_venta: p.precio_venta, stock: p.stock });
    setFormImage(null);
    setFormPreview(p.imagen_url ? `${BASE}${p.imagen_url}` : null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precio_venta) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('nombre', form.nombre);
      fd.append('precio_venta', form.precio_venta);
      fd.append('stock', form.stock || 0);
      if (formImage) fd.append('imagen', formImage);

      const url = editing
        ? `${BASE}/api/inventario/${editing.id}`
        : `${BASE}/api/inventario`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        toast.success(editing ? 'Producto actualizado' : 'Producto creado');
        setShowForm(false);
        fetchProductos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/api/inventario/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Producto eliminado');
        fetchProductos();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) {
        return prev.map(item =>
          item.id === p.id ? { ...item, cantidad: Math.min(item.cantidad + 1, p.stock) } : item
        );
      }
      return [...prev, { id: p.id, nombre: p.nombre, precio_venta: p.precio_venta, cantidad: 1, stock: p.stock }];
    });
    setCartOpen(true);
    toast.success(`${p.nombre} agregado al carrito`);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const newQty = item.cantidad + delta;
        if (newQty <= 0) return null;
        return { ...item, cantidad: Math.min(newQty, item.stock) };
      }).filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
    if (cart.length <= 1) setCartOpen(false);
  };

  const cartTotal = cart.reduce((s, item) => s + item.precio_venta * item.cantidad, 0);
  const cartCount = cart.reduce((s, item) => s + item.cantidad, 0);

  const goToCheckout = () => {
    navigate('/dashboard/caja', {
      state: {
        productos: cart.map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_venta,
          subtotal: item.precio_venta * item.cantidad,
        })),
        total: cartTotal,
      }
    });
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Inventario</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            Gestiona productos y vende desde la tienda
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'tienda', label: 'Tienda', icon: Store },
          { key: 'gestion', label: 'Gestionar', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <motion.button
              key={t.key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t.key)}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: '999px', border: 'none',
                background: tab === t.key ? 'var(--accent-primary)' : 'var(--surface-color)',
                color: tab === t.key ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: tab === t.key ? '0 4px 12px rgba(111,78,55,0.25)' : 'none',
                border: tab === t.key ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={15} /> {t.label}
            </motion.button>
          );
        })}
        {tab === 'gestion' && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openNew}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1.2rem', borderRadius: '999px', border: 'none',
              background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
              color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(111,78,55,0.25)',
            }}
          >
            <Plus size={15} /> Nuevo Producto
          </motion.button>
        )}
      </div>

      {tab === 'tienda' && (
        <>
          {loading ? (
            <div className="bento-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bento-col-4 bento-card">
                  <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '12px' }} />
                  <div className="skeleton" style={{ width: '60%', height: '1rem', marginTop: '0.75rem' }} />
                  <div className="skeleton" style={{ width: '40%', height: '1.5rem', marginTop: '0.5rem' }} />
                  <div className="skeleton" style={{ width: '100%', height: '2.2rem', marginTop: '0.75rem', borderRadius: '999px' }} />
                </div>
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="bento-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '250px', textAlign: 'center' }}>
              <Package size={48} style={{ opacity: 0.2, color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No hay productos en inventario</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setTab('gestion')}
                style={{
                  marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: '999px', border: 'none',
                  background: 'var(--accent-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Agregar Productos
              </motion.button>
            </div>
          ) : (
            <div className="bento-grid">
              {productos.map(p => (
                <motion.div key={p.id} className="bento-col-4 bento-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ gap: '0.75rem', padding: '1.25rem' }}
                >
                  <div style={{
                    width: '100%', height: '140px', borderRadius: '12px',
                    background: p.imagen_url ? `var(--surface-color)` : 'rgba(111,78,55,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', border: '1px solid var(--border-color)',
                  }}>
                    {p.imagen_url ? (
                      <img src={`${BASE}${p.imagen_url}`} alt={p.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageIcon size={36} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{p.nombre}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>${p.precio_venta}</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: p.stock > 0 ? '#16a34a' : '#dc2626',
                        background: p.stock > 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                        padding: '0.15rem 0.5rem', borderRadius: '999px',
                      }}>
                        {p.stock > 0 ? `${p.stock} uds` : 'Agotado'}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => p.stock > 0 && addToCart(p)}
                    disabled={p.stock <= 0}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '999px', border: 'none',
                      background: p.stock > 0 ? 'linear-gradient(135deg, #6f4e37, #8a6344)' : 'var(--border-color)',
                      color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}
                  >
                    <ShoppingCart size={15} /> {p.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'gestion' && (
        <>
          {loading ? (
            <div className="bento-card" style={{ padding: '2rem' }}>
              <div className="skeleton" style={{ width: '100%', height: '2rem', marginBottom: '1rem' }} />
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: '100%', height: '3rem', marginBottom: '0.5rem' }} />)}
            </div>
          ) : (
            <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="neo-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '1rem', width: '60px' }}>Imagen</th>
                      <th style={{ padding: '1rem' }}>Nombre</th>
                      <th style={{ padding: '1rem' }}>Precio</th>
                      <th style={{ padding: '1rem' }}>Stock</th>
                      <th style={{ padding: '1rem', width: '100px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map(p => (
                      <tr key={p.id}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '10px',
                            background: p.imagen_url ? 'transparent' : 'rgba(111,78,55,0.08)',
                            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--border-color)',
                          }}>
                            {p.imagen_url ? (
                              <img src={`${BASE}${p.imagen_url}`} alt={p.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ImageIcon size={18} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{p.nombre}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-primary)', fontWeight: 700 }}>${p.precio_venta}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                            background: p.stock > 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                            color: p.stock > 0 ? '#16a34a' : '#dc2626',
                          }}>
                            {p.stock > 0 ? `${p.stock} uds` : 'Agotado'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => openEdit(p)}
                              style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              <Edit3 size={14} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(p.id)}
                              style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {productos.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No hay productos. Crea el primero.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 100 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowForm(false)}
            />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'rgba(30,32,32,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '1.5rem', padding: '2rem',
                maxWidth: '440px', width: '100%', position: 'relative', zIndex: 1,
                border: '1px solid rgba(111,78,55,0.25)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{editing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setShowForm(false)}
                  style={{ width: '2rem', height: '2rem', borderRadius: '999px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6f4e37'; e.currentTarget.style.color = '#6f4e37'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label-sm">Imagen</label>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', minHeight: formPreview ? 'auto' : '100px',
                    padding: formPreview ? '0.5rem' : '1.5rem 1rem',
                    borderRadius: '14px', border: '2px dashed var(--border-color)',
                    cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem',
                    background: 'rgba(111,78,55,0.04)',
                    transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6f4e37'; e.currentTarget.style.background = 'rgba(111,78,55,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(111,78,55,0.04)'; }}
                  >
                    {formPreview ? (
                      <div style={{ width: '100%' }}>
                        <img src={formPreview} alt="preview"
                          style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '10px' }}
                        />
                        <div style={{
                          textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
                          opacity: 0.6, marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                        }}>
                          <ImageIcon size={12} /> Click para cambiar imagen
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: 'rgba(111,78,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ImageIcon size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <span>{formImage ? formImage.name : 'Seleccionar imagen'}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>PNG, JPG, WEBP</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormImage(file);
                          setFormPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label className="label-sm">Nombre</label>
                  <input className="input-field" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label-sm">Precio ($)</label>
                    <input className="input-field" type="number" step="0.01" value={form.precio_venta}
                      onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label-sm">Stock</label>
                    <input className="input-field" type="number" value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSave} disabled={saving}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: '999px', border: 'none',
                    background: saving ? 'var(--border-color)' : 'linear-gradient(135deg, #6f4e37, #8a6344)',
                    color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem', marginTop: '0.5rem',
                  }}
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar Producto' : 'Crear Producto'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setCartOpen(true)}
            style={{
              position: 'fixed', bottom: '2rem', right: '2rem',
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
              border: 'none', color: '#fff', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(111,78,55,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <ShoppingCart size={22} />
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#dc2626', color: '#fff', fontSize: '0.7rem',
              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 90 }}
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 90vw)',
                background: 'var(--surface-color)', borderLeft: '1px solid var(--border-color)',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
                zIndex: 100, display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart size={20} style={{ color: 'var(--accent-primary)' }} />
                  <h3 style={{ margin: 0 }}>Carrito</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
                </div>
                <button onClick={() => setCartOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Carrito vacío
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', borderRadius: '12px',
                      background: 'rgba(111,78,55,0.04)', border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                          ${(item.precio_venta * item.cantidad).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => updateCartQty(item.id, -1)}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={12} />
                        </motion.button>
                        <span style={{ width: '24px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{item.cantidad}</span>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => updateCartQty(item.id, 1)}
                          disabled={item.cantidad >= item.stock}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'transparent', cursor: item.cantidad >= item.stock ? 'not-allowed' : 'pointer', color: item.cantidad >= item.stock ? 'var(--border-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <PlusIcon size={12} />
                        </motion.button>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => removeFromCart(item.id)}
                        style={{ padding: '0.3rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={goToCheckout}
                    style={{
                      width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
                      color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: '0 4px 16px rgba(111,78,55,0.3)',
                    }}
                  >
                    Ir a Pagar <ArrowRight size={18} />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
