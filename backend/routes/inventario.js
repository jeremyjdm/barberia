const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/inventario'));
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

router.get('/', requireAuth, (req, res) => {
    try {
        const productos = db.prepare('SELECT * FROM inventario ORDER BY nombre ASC').all();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', requireAuth, upload.single('imagen'), (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { nombre, precio_venta, stock } = req.body;
    if (!nombre || !precio_venta) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    let imagen_url = null;
    if (req.file) {
        imagen_url = `/uploads/inventario/${req.file.filename}`;
    }

    try {
        const info = db.prepare('INSERT INTO inventario (nombre, precio_venta, stock, imagen_url) VALUES (?, ?, ?, ?)')
                       .run(nombre, precio_venta, stock || 0, imagen_url);
        logAudit(req.user.id, 'Crear Producto', `Producto ${nombre} creado con ID ${info.lastInsertRowid}`);
        res.json({ id: info.lastInsertRowid, mensaje: 'Producto creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', requireAuth, upload.single('imagen'), (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    const { nombre, precio_venta, stock } = req.body;

    try {
        let stmt, params;
        if (req.file) {
            const imagen_url = `/uploads/inventario/${req.file.filename}`;
            stmt = db.prepare('UPDATE inventario SET nombre = ?, precio_venta = ?, stock = ?, imagen_url = ? WHERE id = ?');
            params = [nombre, precio_venta, stock || 0, imagen_url, id];
        } else {
            stmt = db.prepare('UPDATE inventario SET nombre = ?, precio_venta = ?, stock = ? WHERE id = ?');
            params = [nombre, precio_venta, stock || 0, id];
        }
        stmt.run(...params);
        logAudit(req.user.id, 'Editar Producto', `Producto ID ${id} actualizado`);
        res.json({ mensaje: 'Producto actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', requireAuth, (req, res) => {
    if (req.user.rol !== 'admin' && req.user.rol !== 'recepcionista') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    try {
        db.prepare('DELETE FROM inventario WHERE id = ?').run(id);
        logAudit(req.user.id, 'Eliminar Producto', `Producto ID ${id} eliminado`);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
