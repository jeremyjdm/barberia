const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

// Configuración de multer para subida de imágenes de servicios
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/servicios'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes.'));
        }
    }
});

// GET: Obtener todos los servicios
router.get('/', requireAuth, (req, res) => {
    try {
        const servicios = db.prepare('SELECT * FROM servicios ORDER BY nombre ASC').all();
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear nuevo servicio con imagen
router.post('/', requireAuth, upload.single('imagen'), (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { nombre, precio, duracion_minutos, costo_insumos } = req.body;
    let imagen_url = null;
    if (req.file) {
        imagen_url = `/uploads/servicios/${req.file.filename}`;
    }

    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    try {
        const info = db.prepare('INSERT INTO servicios (nombre, precio, duracion_minutos, costo_insumos, imagen_url) VALUES (?, ?, ?, ?, ?)')
                       .run(nombre, precio, duracion_minutos || 30, costo_insumos || 0, imagen_url);
        
        logAudit(req.user.id, 'Crear Servicio', `Servicio ${nombre} creado con ID ${info.lastInsertRowid}`);
        res.json({ id: info.lastInsertRowid, mensaje: 'Servicio creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT: Editar servicio
router.put('/:id', requireAuth, upload.single('imagen'), (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    const { nombre, precio, duracion_minutos, costo_insumos } = req.body;
    
    try {
        let stmt;
        let queryParams;

        if (req.file) {
            const imagen_url = `/uploads/servicios/${req.file.filename}`;
            stmt = db.prepare('UPDATE servicios SET nombre = ?, precio = ?, duracion_minutos = ?, costo_insumos = ?, imagen_url = ? WHERE id = ?');
            queryParams = [nombre, precio, duracion_minutos || 30, costo_insumos || 0, imagen_url, id];
        } else {
            stmt = db.prepare('UPDATE servicios SET nombre = ?, precio = ?, duracion_minutos = ?, costo_insumos = ? WHERE id = ?');
            queryParams = [nombre, precio, duracion_minutos || 30, costo_insumos || 0, id];
        }

        stmt.run(...queryParams);
        logAudit(req.user.id, 'Editar Servicio', `Servicio ID ${id} actualizado`);
        res.json({ mensaje: 'Servicio actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar servicio
router.delete('/:id', requireAuth, (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    try {
        db.prepare('DELETE FROM servicios WHERE id = ?').run(id);
        logAudit(req.user.id, 'Eliminar Servicio', `Servicio ID ${id} eliminado`);
        res.json({ mensaje: 'Servicio eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
