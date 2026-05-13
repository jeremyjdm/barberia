import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import FormDialog from './FormDialog';
import ConfirmDialog from './ConfirmDialog';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';
import PageTransition from './PageTransition';

export default function RecepcionistaServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: null, nombre: '', precio: '', costo_insumos: '' });
  const [imagen, setImagen] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/servicios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setServicios(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/servicios/${deleteTarget}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setServicios(servicios.filter(s => s.id !== deleteTarget));
      } else {
        toast('Error al eliminar', 'error');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (srv) => {
    setFormData({ id: srv.id, nombre: srv.nombre, precio: srv.precio, costo_insumos: srv.costo_insumos || '' });
    setImagen(null);
    setPreviewUrl(null);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setFormData({ id: null, nombre: '', precio: '', costo_insumos: '' });
    setImagen(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setFormData({ id: null, nombre: '', precio: '', costo_insumos: '' });
    setImagen(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('precio', formData.precio);
    data.append('costo_insumos', formData.costo_insumos || 0);
    if (imagen) data.append('imagen', imagen);

    try {
      const token = localStorage.getItem('token');
      const url = isEditing ? `http://localhost:3000/api/servicios/${formData.id}` : 'http://localhost:3000/api/servicios';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });
      if (res.ok) {
        fetchServicios();
        handleCancel();
      } else {
        const errorData = await res.json();
        toast(errorData.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PageTransition>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Paquetes y Servicios</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateNew}
          style={{
            padding: '0.65rem 1.25rem', borderRadius: '999px', border: 'none',
            background: 'linear-gradient(135deg, #6f4e37, #8a6344)',
            color: '#fff', fontWeight: 600, fontSize: '0.9rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(111,78,55,0.3)',
          }}
        >
          <Plus size={18} />
          Nuevo Servicio
        </motion.button>
      </div>

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : servicios.length === 0 ? (
        <div className="bento-card">
          <EmptyState message="No hay servicios registrados." action={
            <button onClick={handleCreateNew} style={{ padding: '0.6rem 1.2rem', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Crear Primer Servicio
            </button>
          } />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {servicios.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              style={{
                background: 'var(--surface-color)', border: '1px solid var(--border-color)',
                borderRadius: '1.25rem', overflow: 'hidden',
                boxShadow: 'var(--shadow-soft)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <div style={{ height: '160px', width: '100%', background: '#f3f0ec', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {s.imagen_url ? (
                  <img src={`http://localhost:3000${s.imagen_url}`} alt={s.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <ImageIcon size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
                  padding: '2rem 0.75rem 0.75rem',
                }}>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.9)', color: '#6f4e37',
                    fontSize: '0.85rem', fontWeight: 700,
                  }}>
                    ${s.precio}
                  </span>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{s.nombre}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleEdit(s)}
                    style={{
                      flex: 1, padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6f4e37'; e.currentTarget.style.color = '#6f4e37'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Pencil size={14} /> Editar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDeleteTarget(s.id)}
                    style={{
                      flex: 1, padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--surface-color)'; }}
                  >
                    <Trash2 size={14} /> Borrar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <FormDialog
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Nombre del Servicio</label>
            <input required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Corte y Barba VIP"
              style={{ width: '100%', padding: '0.7rem 1rem', fontSize: '0.95rem', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-color)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.target.style.borderColor = '#6f4e37'; e.target.style.boxShadow = '0 0 0 3px rgba(111,78,55,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Precio de Venta ($)</label>
            <input required type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              style={{ width: '100%', padding: '0.7rem 1rem', fontSize: '0.95rem', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-color)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.target.style.borderColor = '#6f4e37'; e.target.style.boxShadow = '0 0 0 3px rgba(111,78,55,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Imagen Representativa</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', minHeight: previewUrl ? 'auto' : '100px',
              padding: previewUrl ? '0.5rem' : '1.5rem 1rem',
              borderRadius: '14px', border: '2px dashed var(--border-color)',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem',
              background: 'rgba(111,78,55,0.04)',
              transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6f4e37'; e.currentTarget.style.background = 'rgba(111,78,55,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(111,78,55,0.04)'; }}
            >
              {previewUrl ? (
                <div style={{ width: '100%' }}>
                  <img src={previewUrl} alt="Preview"
                    style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '10px' }}
                  />
                  <div style={{
                    textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
                    opacity: 0.6, marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                  }}>
                    Click para cambiar imagen
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
                  <span>Seleccionar imagen</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>PNG, JPG, WEBP</span>
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={handleCancel}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '999px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '0.65rem 1.25rem', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #6f4e37, #8a6344)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(111,78,55,0.3)' }}
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="¿Eliminar servicio?"
        message="Esta acción no se puede deshacer. El servicio será eliminado permanentemente del catálogo."
        confirmText="Eliminar"
        destructive={true}
      />
    </PageTransition>
  );
}
