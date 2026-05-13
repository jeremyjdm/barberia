import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import Login from './components/Login';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import PosDashboard from './components/PosDashboard';
import AdminUsuarios from './components/AdminUsuarios';
import AdminCorteHistorial from './components/AdminCorteHistorial';
import CajeroCorte from './components/CajeroCorte';
import RecepcionistaServicios from './components/RecepcionistaServicios';
import RegistrarCita from './components/RegistrarCita';
import GestionCitas from './components/GestionCitas';
import Inventario from './components/Inventario';
import AdminClientes from './components/AdminClientes';
import Configuracion from './components/Configuracion';
import ReportesPagos from './components/ReportesPagos';

function AnimatedRoutes({ sidebarCollapsed, setSidebarCollapsed }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Layout collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />}>
          <Route index element={<Navigate to="admin" replace />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
          <Route path="historial-caja" element={<AdminCorteHistorial />} />
          <Route path="caja" element={<PosDashboard />} />
          <Route path="corte" element={<CajeroCorte />} />
          <Route path="servicios" element={<RecepcionistaServicios />} />
          <Route path="registrar-cita" element={<RegistrarCita />} />
          <Route path="gestion-citas" element={<GestionCitas />} />
          <Route path="clientes" element={<AdminClientes />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="pagos" element={<ReportesPagos />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleSetCollapsed = (val) => {
    setSidebarCollapsed(val);
    localStorage.setItem('sidebarCollapsed', val);
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { borderRadius: '12px', padding: '12px 16px', fontSize: '0.9rem' },
        }}
      />
      <AnimatedRoutes sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={handleSetCollapsed} />
    </BrowserRouter>
  );
}

export default App;
