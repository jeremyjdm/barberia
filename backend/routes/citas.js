const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { today, nowMinutes } = require('../date-utils');

// GET /api/citas/hoy — Citas de hoy ordenadas: en_turno primero, luego pendiente, luego completada
router.get('/hoy', requireAuth, (req, res) => {
    try {
        const hoy = req.query.fecha || today();
        const citas = db.prepare(`
            SELECT c.id, c.cliente_nombre, c.fecha, c.hora, c.estado, c.barbero_id, c.servicio_id,
                   u.nombre as barbero_nombre, s.nombre as servicio_nombre, s.precio as servicio_precio, s.duracion_minutos
            FROM citas c
            LEFT JOIN usuarios u ON c.barbero_id = u.id
            LEFT JOIN servicios s ON c.servicio_id = s.id
            WHERE c.fecha = ? AND c.estado != 'cancelada'
            ORDER BY
                CASE c.estado
                    WHEN 'en_turno' THEN 0
                    WHEN 'pendiente' THEN 1
                    WHEN 'completada' THEN 2
                END,
                c.hora ASC
        `).all(hoy);
        res.json(citas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/citas — Todas las citas pendientes ordenadas
router.get('/', requireAuth, (req, res) => {
    try {
        const { fecha, barbero_id } = req.query;
        let query = `
            SELECT c.id, c.cliente_nombre, c.fecha, c.hora, c.estado, c.barbero_id, c.servicio_id, c.venta_id,
                   u.nombre as barbero_nombre, s.nombre as servicio_nombre, s.precio as servicio_precio
            FROM citas c
            LEFT JOIN usuarios u ON c.barbero_id = u.id
            LEFT JOIN servicios s ON c.servicio_id = s.id
            WHERE c.estado = 'pendiente'
        `;
        const params = [];
        if (fecha) {
            query += ' AND c.fecha = ?';
            params.push(fecha);
        }
        if (barbero_id) {
            query += ' AND c.barbero_id = ?';
            params.push(barbero_id);
        }
        query += ' ORDER BY c.fecha ASC, c.hora ASC';
        const citas = db.prepare(query).all(...params);
        res.json(citas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/citas/disponibilidad — Horas disponibles para un barbero en una fecha
router.get('/disponibilidad', requireAuth, (req, res) => {
    try {
        const { barbero_id, fecha, servicio_id } = req.query;
        if (!barbero_id || !fecha || !servicio_id) {
            return res.status(400).json({ error: 'barbero_id, fecha y servicio_id son obligatorios' });
        }

        // Get selected service duration
        const servicio = db.prepare('SELECT duracion_minutos FROM servicios WHERE id = ?').get(servicio_id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        const selectedDuration = servicio.duracion_minutos || 30;

        // Get existing appointments for this barbero on this date
        const citas = db.prepare(`
            SELECT c.hora, s.duracion_minutos
            FROM citas c
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.barbero_id = ? AND c.fecha = ? AND c.estado = 'pendiente'
            ORDER BY c.hora ASC
        `).all(barbero_id, fecha);

        // Parse time "HH:MM" to minutes since midnight
        const toMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const formatTime = (min) => {
            const h = Math.floor(min / 60).toString().padStart(2, '0');
            const m = (min % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
        };

        const OPENING = 9 * 60;      // 9:00
        const CLOSING = 18 * 60 + 30; // 18:30
        const GAP = 30; // 30-minute gap before each occupied slot

        // Build blocked intervals from existing appointments
        const blocked = citas.map(c => {
            const start = toMinutes(c.hora);
            const dur = c.duracion_minutos || 30;
            // Block from (start - GAP) to (start + dur + GAP)
            return { start: start - GAP, end: start + dur + GAP };
        });

        // Generate all 15-min slots
        const allSlots = [];
        for (let m = OPENING; m <= CLOSING; m += 15) {
            allSlots.push(formatTime(m));
        }

        const hoy = today();
        const currentMinutes = nowMinutes();

        // Filter available slots
        const available = [];
        const occupied = [];

        allSlots.forEach(slot => {
            const slotMin = toMinutes(slot);

            // Skip past hours if today
            if (fecha === hoy && slotMin <= currentMinutes) {
                occupied.push(slot);
                return;
            }

            // Check if slot + selectedDuration fits before closing
            if (slotMin + selectedDuration > CLOSING) {
                occupied.push(slot);
                return;
            }

            // Check against blocked intervals
            let isBlocked = false;
            for (const b of blocked) {
                // Slot is blocked if [slotMin, slotMin + selectedDuration] overlaps with [b.start, b.end]
                if (slotMin < b.end && slotMin + selectedDuration > b.start) {
                    isBlocked = true;
                    break;
                }
            }

            if (isBlocked) {
                occupied.push(slot);
            } else {
                available.push(slot);
            }
        });

        res.json({ available, occupied });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/citas/estadisticas — Ganancias, cortes y clientes de una fecha
router.get('/estadisticas', requireAuth, (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) return res.status(400).json({ error: 'fecha es obligatoria' });

        const clientes = db.prepare(`
            SELECT c.cliente_nombre, c.hora, s.nombre as servicio_nombre, s.precio, c.estado
            FROM citas c
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.fecha = ? AND c.estado != 'cancelada'
            ORDER BY c.hora ASC
        `).all(fecha);

        const total_ganancias = clientes
            .filter(c => c.estado === 'completada')
            .reduce((sum, c) => sum + c.precio, 0);

        res.json({
            fecha,
            total_ganancias,
            total_cortes: clientes.filter(c => c.estado === 'completada').length,
            en_turno: clientes.filter(c => c.estado === 'en_turno').length,
            clientes,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/citas — Crear nueva cita
router.post('/', requireAuth, (req, res) => {
    const { cliente_nombre, barbero_id, servicio_id, fecha, hora } = req.body;
    if (!cliente_nombre || !barbero_id || !servicio_id || !fecha || !hora) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    try {
        const result = db.prepare(`
            INSERT INTO citas (cliente_nombre, barbero_id, servicio_id, fecha, hora, creado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(cliente_nombre, barbero_id, servicio_id, fecha, hora, req.user.id);
        res.status(201).json({ mensaje: 'Cita agendada con éxito', id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/citas/:id — Editar cita existente
router.put('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { cliente_nombre, barbero_id, servicio_id, fecha, hora } = req.body;
    try {
        const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (cita.estado !== 'pendiente') return res.status(400).json({ error: 'Solo se pueden editar citas pendientes' });

        db.prepare(`
            UPDATE citas 
            SET cliente_nombre = ?, barbero_id = ?, servicio_id = ?, fecha = ?, hora = ?
            WHERE id = ?
        `).run(cliente_nombre || cita.cliente_nombre, barbero_id || cita.barbero_id, servicio_id || cita.servicio_id, fecha || cita.fecha, hora || cita.hora, id);
        
        res.json({ mensaje: 'Cita actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/citas/:id/iniciar — Marcar cita como en turno
router.put('/:id/iniciar', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
        const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (cita.estado !== 'pendiente') return res.status(400).json({ error: 'Solo se pueden iniciar citas pendientes' });

        const barberActive = db.prepare('SELECT id FROM citas WHERE barbero_id = ? AND estado = "en_turno" AND fecha = ?').get(cita.barbero_id, cita.fecha);
        if (barberActive) return res.status(400).json({ error: 'El barbero ya tiene una cita en turno actualmente.' });

        db.prepare("UPDATE citas SET estado = 'en_turno' WHERE id = ?").run(id);
        res.json({ mensaje: 'Cita iniciada', estado: 'en_turno' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/citas/:id/completar — Completar cita y crear venta
router.put('/:id/completar', requireAuth, (req, res) => {
    const { id } = req.params;
    const { productos } = req.body;

    try {
        const cita = db.prepare(`
            SELECT c.*, s.precio FROM citas c
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.id = ?
        `).get(id);

        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (cita.estado === 'completada') return res.status(400).json({ error: 'La cita ya fue completada' });
        if (cita.estado === 'cancelada') return res.status(400).json({ error: 'La cita fue cancelada' });

        const caja = db.prepare("SELECT id FROM cajas WHERE estado = 'abierta'").get();
        if (!caja) return res.status(400).json({ error: 'No hay una caja abierta. Abre la caja primero.' });

        let totalVenta = cita.precio;
        let productosData = [];

        if (productos && productos.length > 0) {
            const placeholders = productos.map(() => '?').join(',');
            const ids = productos.map(p => p.id);
            const dbProductos = db.prepare(`SELECT id, nombre, precio_venta, stock FROM inventario WHERE id IN (${placeholders})`).all(ids);
            const productMap = {};
            dbProductos.forEach(p => productMap[p.id] = p);

            for (const item of productos) {
                const p = productMap[item.id];
                if (!p) {
                    return res.status(400).json({ error: `Producto ID ${item.id} no encontrado` });
                }
                const cantidad = item.cantidad || 1;
                if (p.stock < cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para ${p.nombre}` });
                }
                const subtotal = p.precio_venta * cantidad;
                totalVenta += subtotal;
                productosData.push({ producto_id: p.id, cantidad, precio_unitario: p.precio_venta });
            }
        }

        const transaction = db.transaction(() => {
            const infoVenta = db.prepare(
                'INSERT INTO ventas (barbero_id, caja_id, metodo, total) VALUES (?, ?, ?, ?)'
            ).run(cita.barbero_id, caja.id, 'Efectivo', totalVenta);

            const ventaId = infoVenta.lastInsertRowid;

            if (productosData.length > 0) {
                const stmtProducto = db.prepare('INSERT INTO venta_productos (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
                const stmtStock = db.prepare('UPDATE inventario SET stock = stock - ? WHERE id = ?');
                for (const item of productosData) {
                    stmtProducto.run(ventaId, item.producto_id, item.cantidad, item.precio_unitario);
                    stmtStock.run(item.cantidad, item.producto_id);
                }
            }

            db.prepare('UPDATE citas SET estado = ?, venta_id = ? WHERE id = ?')
                .run('completada', ventaId, id);

            return ventaId;
        });

        const ventaId = transaction();

        const venta = db.prepare(`
            SELECT v.id, v.total, v.metodo, v.fecha,
                   u.nombre as barbero_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.barbero_id = u.id
            WHERE v.id = ?
        `).get(ventaId);

        res.json({
            mensaje: 'Cita completada y venta registrada',
            venta: { ...venta, cliente_nombre: cita.cliente_nombre },
            servicio: { nombre: cita.nombre || '', precio: cita.precio },
            productosAgregados: productosData.length > 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/citas/:id — Cancelar cita
router.delete('/:id', requireAuth, (req, res) => {
    try {
        db.prepare("UPDATE citas SET estado = 'cancelada' WHERE id = ?").run(req.params.id);
        res.json({ mensaje: 'Cita cancelada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
