const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta uploads (para las fotos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar rutas
const authRoutes = require('./routes/auth');
const cajaRoutes = require('./routes/caja');
const ventasRoutes = require('./routes/ventas');
const marketingRoutes = require('./routes/marketing');
const adminRoutes = require('./routes/admin');
const serviciosRoutes = require('./routes/servicios');
const citasRoutes = require('./routes/citas');
const inventarioRoutes = require('./routes/inventario');
const clientesRoutes = require('./routes/clientes');
const configuracionRoutes = require('./routes/configuracion');

// Rutas base
app.use('/api/auth', authRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/configuracion', configuracionRoutes);

// Endpoint básico de health-check
app.get('/', (req, res) => {
    res.json({ mensaje: 'Backend Barbería POS Moderno Funcionando!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
