const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');

// Apertura de caja (Fondo inicial)
router.post('/abrir', requireAuth, (req, res) => {
    const { monto_inicial } = req.body;
    
    if (monto_inicial === undefined) {
        return res.status(400).json({ error: 'El monto_inicial es requerido' });
    }

    try {
        // Verificar si ya hay una caja abierta
        const cajaAbierta = db.prepare("SELECT id FROM cajas WHERE estado = 'abierta'").get();
        if (cajaAbierta) {
            return res.status(400).json({ error: 'Ya hay una caja abierta.' });
        }

        const stmt = db.prepare('INSERT INTO cajas (recepcionista_id, monto_inicial) VALUES (?, ?)');
        const info = stmt.run(req.user.id, monto_inicial);
        
        logAudit(req.user.id, 'Apertura de Caja', `Se abrió caja con fondo inicial de $${monto_inicial}`);
        res.status(201).json({ mensaje: 'Caja abierta exitosamente', caja_id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gastos chicos (Salidas)
router.post('/gastos', requireAuth, (req, res) => {
    const { descripcion, monto } = req.body;

    if (!descripcion || monto === undefined) {
        return res.status(400).json({ error: 'Descripción y monto son requeridos' });
    }

    try {
        const caja = db.prepare("SELECT id FROM cajas WHERE estado = 'abierta'").get();
        if (!caja) {
            return res.status(400).json({ error: 'No hay ninguna caja abierta.' });
        }

        const stmt = db.prepare('INSERT INTO gastos_chicos (caja_id, descripcion, monto) VALUES (?, ?, ?)');
        stmt.run(caja.id, descripcion, monto);

        logAudit(req.user.id, 'Gasto Chico', `Gasto registrado: ${descripcion} - $${monto}`);
        res.status(201).json({ mensaje: 'Gasto registrado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resumen de caja (Conciliación)
router.get('/resumen', requireAuth, (req, res) => {
    try {
        const caja = db.prepare("SELECT id, monto_inicial, fecha_apertura FROM cajas WHERE estado = 'abierta'").get();
        if (!caja) {
            return res.status(400).json({ error: 'No hay ninguna caja abierta.' });
        }

        // Obtener totales por método de pago
        const ventasPorMetodo = db.prepare(`
            SELECT metodo, SUM(total) as total 
            FROM ventas 
            WHERE caja_id = ? 
            GROUP BY metodo
        `).all(caja.id);

        const gastos = db.prepare('SELECT SUM(monto) as total FROM gastos_chicos WHERE caja_id = ?').get(caja.id);
        const totalGastos = gastos.total || 0;

        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalTransferencia = 0;

        ventasPorMetodo.forEach(v => {
            if (v.metodo === 'Efectivo') totalEfectivo = v.total;
            if (v.metodo === 'Tarjeta') totalTarjeta = v.total;
            if (v.metodo === 'Transferencia') totalTransferencia = v.total;
        });

        const saldoEsperadoEfectivo = caja.monto_inicial + totalEfectivo - totalGastos;

        res.json({
            caja_id: caja.id,
            fecha_apertura: caja.fecha_apertura,
            monto_inicial: caja.monto_inicial,
            ventas_efectivo: totalEfectivo,
            ventas_tarjeta: totalTarjeta,
            ventas_transferencia: totalTransferencia,
            gastos: totalGastos,
            saldo_esperado_efectivo: saldoEsperadoEfectivo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cierre de caja
router.post('/cerrar', requireAuth, (req, res) => {
    const { monto_real_efectivo } = req.body;

    if (monto_real_efectivo === undefined) {
        return res.status(400).json({ error: 'El monto real en efectivo es requerido' });
    }

    try {
        const caja = db.prepare("SELECT id, monto_inicial FROM cajas WHERE estado = 'abierta'").get();
        if (!caja) {
            return res.status(400).json({ error: 'No hay ninguna caja abierta.' });
        }

        // Calcular saldo esperado
        const ventasEfectivo = db.prepare("SELECT SUM(total) as total FROM ventas WHERE metodo = 'Efectivo' AND caja_id = ?").get(caja.id);
        const gastos = db.prepare('SELECT SUM(monto) as total FROM gastos_chicos WHERE caja_id = ?').get(caja.id);

        const saldoEsperado = caja.monto_inicial + (ventasEfectivo.total || 0) - (gastos.total || 0);
        const diferencia = monto_real_efectivo - saldoEsperado;

        const stmt = db.prepare(`
            UPDATE cajas 
            SET monto_final_declarado = ?, monto_esperado = ?, fecha_cierre = CURRENT_TIMESTAMP, estado = 'cerrada' 
            WHERE id = ?
        `);
        stmt.run(monto_real_efectivo, saldoEsperado, caja.id);

        let mensaje = 'Caja cerrada correctamente. ';
        if (diferencia > 0) mensaje += `Sobrante de $${diferencia}`;
        else if (diferencia < 0) mensaje += `Faltante de $${Math.abs(diferencia)}`;
        else mensaje += 'Caja cuadrada perfectamente.';

        logAudit(req.user.id, 'Cierre de Caja', `Cierre. Esperado: $${saldoEsperado}, Real: $${monto_real_efectivo}. Diferencia: $${diferencia}`);
        
        res.json({ mensaje, saldoEsperado, monto_real_efectivo, diferencia });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Historial de cajas para el Administrador
router.get('/historial', requireAuth, (req, res) => {
    // Si queremos restringirlo solo a admin, podemos importar requireAdmin y usarlo, 
    // pero de momento verificamos si es admin aquí o en la ruta.
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const historial = db.prepare(`
            SELECT c.id, c.monto_inicial, c.monto_final_declarado, c.monto_esperado, 
                   c.fecha_apertura, c.fecha_cierre, c.estado, u.nombre as recepcionista
            FROM cajas c
            LEFT JOIN usuarios u ON c.recepcionista_id = u.id
            ORDER BY c.fecha_apertura DESC
            LIMIT 50
        `).all();
        
        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
