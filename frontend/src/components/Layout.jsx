import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';

export default function Layout({ collapsed, setCollapsed }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <motion.main
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet context={{ user }} />
      </motion.main>
    </div>
  );
}
