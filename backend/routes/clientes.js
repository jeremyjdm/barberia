const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

router.get('/search', requireAuth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const clientes = db.prepare(
      "SELECT id, nombre, telefono FROM clientes WHERE nombre LIKE ? ORDER BY nombre ASC LIMIT 10"
    ).all(`%${q}%`);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', requireAuth, (req, res) => {
  try {
    let clientes;
    if (req.user.rol === 'admin' || req.user.rol === 'recepcionista') {
      clientes = db.prepare(
        "SELECT id, nombre, telefono, email, ultima_visita, fecha_registro FROM clientes ORDER BY nombre ASC"
      ).all();
    } else {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const cliente = db.prepare("SELECT id, nombre, telefono, email, ultima_visita, fecha_registro FROM clientes WHERE id = ?").get(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, (req, res) => {
  const { nombre, telefono, email } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
  }
  try {
    const existing = db.prepare("SELECT id, nombre, telefono FROM clientes WHERE nombre = ?").get(nombre.trim());
    if (existing) {
      return res.json(existing);
    }
    const stmt = db.prepare("INSERT INTO clientes (nombre, telefono, email) VALUES (?, ?, ?)");
    const info = stmt.run(nombre.trim(), telefono || null, email || null);
    logAudit(req.user.id, 'Crear Cliente', `Cliente "${nombre.trim()}" creado.`);
    const nuevo = db.prepare("SELECT id, nombre, telefono, email, ultima_visita, fecha_registro FROM clientes WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  const { nombre, telefono, email } = req.body;
  try {
    const existing = db.prepare("SELECT * FROM clientes WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });
    db.prepare("UPDATE clientes SET nombre = ?, telefono = ?, email = ? WHERE id = ?")
      .run(nombre || existing.nombre, telefono !== undefined ? telefono : existing.telefono, email !== undefined ? email : existing.email, req.params.id);
    logAudit(req.user.id, 'Editar Cliente', `Cliente ID ${req.params.id} actualizado.`);
    res.json({ mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM clientes WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });
    const citas = db.prepare("SELECT COUNT(*) as c FROM citas WHERE cliente_nombre = ?").get(existing.nombre).c;
    if (citas > 0) {
      return res.status(409).json({
        error: `El cliente tiene ${citas} cita(s) asociada(s). No se puede eliminar.`,
        related: { citas }
      });
    }
    db.prepare("DELETE FROM clientes WHERE id = ?").run(req.params.id);
    logAudit(req.user.id, 'Eliminar Cliente', `Cliente ID ${req.params.id} (${existing.nombre}) eliminado.`);
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
