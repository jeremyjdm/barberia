const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

const logoStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'logo'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  },
});

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all();
    const settings = {};
    rows.forEach(r => { settings[r.clave] = r.valor; });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', requireAuth, (req, res) => {
  try {
    const { nombre_barberia, direccion, telefono } = req.body;
    const stmt = db.prepare('UPDATE configuracion SET valor = ? WHERE clave = ?');
    if (nombre_barberia !== undefined) stmt.run(nombre_barberia, 'nombre_barberia');
    if (direccion !== undefined) stmt.run(direccion, 'direccion');
    if (telefono !== undefined) stmt.run(telefono, 'telefono');
    logAudit(req.user.id, 'Actualizar Configuración', 'Configuración general actualizada.');
    res.json({ mensaje: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logo', requireAuth, (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    try {
      const logoUrl = `/uploads/logo/${req.file.filename}`;
      db.prepare('UPDATE configuracion SET valor = ? WHERE clave = ?').run(logoUrl, 'logo_url');

      const oldLogo = db.prepare("SELECT valor FROM configuracion WHERE clave = 'logo_url'").get();
      if (oldLogo && oldLogo.valor && oldLogo.valor !== logoUrl) {
        const oldPath = path.join(__dirname, '..', oldLogo.valor);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      logAudit(req.user.id, 'Subir Logo', `Logo actualizado: ${logoUrl}`);
      res.json({ logo_url: logoUrl });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

module.exports = router;
