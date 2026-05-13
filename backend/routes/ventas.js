const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

// Obtener catálogos para el POS
router.get('/catalogos', requireAuth, (req, res) => {
    try {
        const clientes = db.prepare('SELECT id, nombre FROM clientes').all();
        const servicios = db.prepare('SELECT id, nombre, precio, imagen_url FROM servicios').all();
        const barberos = db.prepare("SELECT id, nombre FROM usuarios WHERE rol = 'barbero'").all();

        res.json({ clientes, servicios, barberos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear una nueva venta (POS)
router.post('/', requireAuth, (req, res) => {
    const { cliente_id, barbero_id, servicio_ids, metodo, productos } = req.body;

    if ((!barbero_id && (!productos || productos.length === 0)) || !metodo) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para la venta.' });
    }

    try {
        const caja = db.prepare("SELECT id FROM cajas WHERE estado = 'abierta'").get();
        if (!caja) {
            return res.status(400).json({ error: 'No se puede registrar la venta sin una caja abierta.' });
        }

        let total = 0;

        // Calcular total from servicios if provided
        if (servicio_ids && servicio_ids.length > 0) {
            const placeholders = servicio_ids.map(() => '?').join(',');
            const servicios = db.prepare(`SELECT id, precio FROM servicios WHERE id IN (${placeholders})`).all(servicio_ids);
            servicios.forEach(s => total += s.precio);
        }

        // Calcular total from productos if provided
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
                if (p.stock < (item.cantidad || 1)) {
                    return res.status(400).json({ error: `Stock insuficiente para ${p.nombre}` });
                }
                const cantidad = item.cantidad || 1;
                const subtotal = p.precio_venta * cantidad;
                total += subtotal;
                productosData.push({ producto_id: p.id, cantidad, precio_unitario: p.precio_venta });
            }
        }

        if (total <= 0) {
            return res.status(400).json({ error: 'El total debe ser mayor a cero.' });
        }

        // Usar transacción para la venta y descuento de inventario
        const transaction = db.transaction(() => {
            // 1. Insertar la venta
            const stmtVenta = db.prepare('INSERT INTO ventas (cliente_id, barbero_id, caja_id, metodo, total) VALUES (?, ?, ?, ?, ?)');
            const infoVenta = stmtVenta.run(cliente_id || null, barbero_id || null, caja.id, metodo, total);
            const ventaId = infoVenta.lastInsertRowid;

            // 2. Descontar insumos de servicios del inventario (existing logic)
            if (servicio_ids && servicio_ids.length > 0) {
                const placeholders = servicio_ids.map(() => '?').join(',');
                const insumos = db.prepare(`
                    SELECT producto_id, SUM(cantidad) as cantidad_total 
                    FROM servicio_insumos 
                    WHERE servicio_id IN (${placeholders}) 
                    GROUP BY producto_id
                `).all(servicio_ids);

                insumos.forEach(item => {
                    db.prepare('UPDATE inventario SET stock = stock - ? WHERE id = ?')
                      .run(item.cantidad_total, item.producto_id);
                });
            }

            // 3. Insertar productos vendidos y descontar stock
            if (productosData.length > 0) {
                const stmtProducto = db.prepare('INSERT INTO venta_productos (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)');
                const stmtStock = db.prepare('UPDATE inventario SET stock = stock - ? WHERE id = ?');
                for (const item of productosData) {
                    stmtProducto.run(ventaId, item.producto_id, item.cantidad, item.precio_unitario);
                    stmtStock.run(item.cantidad, item.producto_id);
                }
            }

            // 4. Actualizar la fecha de última visita del cliente (si proporcionó cliente)
            if (cliente_id) {
                db.prepare('UPDATE clientes SET ultima_visita = CURRENT_TIMESTAMP WHERE id = ?').run(cliente_id);
            }

            return ventaId;
        });

        const ventaId = transaction();
        logAudit(req.user.id, 'Venta Registrada', `Venta ID: ${ventaId}, Total: $${total}, Método: ${metodo}`);

        res.status(201).json({ mensaje: 'Venta registrada con éxito', venta_id: ventaId, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancelar una venta (Requiere admin por seguridad, o log de auditoría si lo hace recepcionista)
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
        return res.status(400).json({ error: 'Debe especificar un motivo para la cancelación.' });
    }

    try {
        const venta = db.prepare('SELECT total FROM ventas WHERE id = ?').get(id);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        // Simplemente borramos o marcamos como cancelada (mejor marcar como cancelada, pero por ahora la borraremos del reporte de totales)
        db.prepare('DELETE FROM ventas WHERE id = ?').run(id);

        logAudit(req.user.id, 'Cancelación de Venta', `Venta ID: ${id} cancelada. Motivo: ${motivo}. Total: $${venta.total}`);
        res.json({ mensaje: 'Venta cancelada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar método de pago de una venta
router.put('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { metodo } = req.body;
    if (!metodo || !['Efectivo', 'Tarjeta', 'Transferencia'].includes(metodo)) {
        return res.status(400).json({ error: 'Método de pago inválido' });
    }
    try {
        db.prepare('UPDATE ventas SET metodo = ? WHERE id = ?').run(metodo, id);
        res.json({ mensaje: 'Método de pago actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener detalles para imprimir ticket
router.get('/:id/ticket', requireAuth, (req, res) => {
    const { id } = req.params;
    try {
        const venta = db.prepare(`
            SELECT v.id, v.total, v.metodo, v.fecha, 
                   c.nombre as cliente_nombre, u.nombre as barbero_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.barbero_id = u.id
            WHERE v.id = ?
        `).get(id);

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        res.json(venta);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
