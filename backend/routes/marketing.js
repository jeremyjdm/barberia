const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');

// Configuración de Multer para la subida de fotos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Obtener clientes con 21 días sin venir (Recordatorio "Corte Pendiente")
router.get('/pendientes', requireAuth, (req, res) => {
    try {
        // Consulta SQLite: Clientes cuya ultima_visita fue hace más de 21 días
        const clientes = db.prepare(`
            SELECT id, nombre, telefono, ultima_visita 
            FROM clientes 
            WHERE ultima_visita IS NOT NULL 
              AND datetime(ultima_visita) <= datetime('now', '-21 days')
        `).all();

        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Subir foto a la galería de un cliente
router.post('/galeria', requireAuth, upload.single('foto'), (req, res) => {
    const { cliente_id } = req.body;

    if (!cliente_id || !req.file) {
        return res.status(400).json({ error: 'Falta el cliente_id o el archivo de imagen.' });
    }

    try {
        const foto_url = `/uploads/${req.file.filename}`;
        
        const stmt = db.prepare('INSERT INTO clientes_galeria (cliente_id, foto_url) VALUES (?, ?)');
        stmt.run(cliente_id, foto_url);

        res.status(201).json({ mensaje: 'Foto subida correctamente', url: foto_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener la galería de un cliente
router.get('/galeria/:cliente_id', requireAuth, (req, res) => {
    const { cliente_id } = req.params;
    try {
        const fotos = db.prepare('SELECT id, foto_url, fecha FROM clientes_galeria WHERE cliente_id = ? ORDER BY fecha DESC').all(cliente_id);
        res.json(fotos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
