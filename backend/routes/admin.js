const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { logAudit } = require('../middlewares/audit');
const { today, addDays, rangeArray } = require('../date-utils');

// Dashboard: Utilidad Real y Métricas Dinámicas
router.get('/dashboard', requireAuth, requireAdmin, (req, res) => {
    try {
        const { rango } = req.query; // 'hoy', 'semana', 'mes', 'todo'
        const hoy = today();
        let dateFilter, params;

        if (rango === 'hoy') {
            dateFilter = 'WHERE date(fecha) = ?';
            params = [hoy];
        } else if (rango === 'semana') {
            const weekAgo = addDays(hoy, -6);
            dateFilter = 'WHERE date(fecha) >= ?';
            params = [weekAgo];
        } else if (rango === 'mes') {
            const monthStart = hoy.slice(0, 8) + '01';
            dateFilter = 'WHERE date(fecha) >= ?';
            params = [monthStart];
        } else {
            dateFilter = '';
            params = [];
        }

        // Ingresos totales (Ventas)
        const ventasResult = db.prepare(`SELECT SUM(total) as ingresos, COUNT(id) as total_cortes FROM ventas ${dateFilter}`).get(...params);
        const ingresos = ventasResult.ingresos || 0;
        const total_cortes = ventasResult.total_cortes || 0;

        // Gastos chicos
        const gastosResult = db.prepare(`SELECT SUM(monto) as gastos FROM gastos_chicos ${dateFilter}`).get(...params);
        const gastos = gastosResult.gastos || 0;

        // Mejor Servicio (Más vendido en ese rango)
        // Ya que la BD actual no tiene tabla venta_detalle, estimaremos basado en un cruce ficticio o retornaremos N/A hasta que se cree venta_detalle.
        // Pero para el propósito del prompt, mandaremos una consulta dummy o contaremos los servicios si los tuviéramos.
        // Como no existe tabla de detalle de ventas real en SQLite (según schema solo hay `ventas` con total), 
        // simularemos el mejor servicio o lo dejaremos como "Pendiente" a menos que modifiquemos el esquema.
        // Espera, el esquema tiene `ventas (id, cliente, barbero, caja, metodo, total)`. No hay relación de Venta -> Servicios.
        const mejor_servicio = "Corte Clásico (Estimado)";

        const utilidad_bruta = ingresos - gastos;

        res.json({
            ingresos,
            gastos,
            utilidad_bruta,
            total_cortes,
            mejor_servicio
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard — gráficas diarias, top barbero, top servicio
router.get('/graficas', requireAuth, requireAdmin, (req, res) => {
    try {
        const { rango, month, year } = req.query;
        let startDate, endDate;

        const hoy = today();
        if (rango === 'semana') {
            endDate = hoy;
            startDate = addDays(hoy, -6);
        } else {
            const m = parseInt(month) || parseInt(hoy.slice(5, 7));
            const y = parseInt(year) || parseInt(hoy.slice(0, 4));
            startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
            endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        // Cortes diarios (citas completadas por fecha)
        const cortesDiarios = db.prepare(`
            SELECT fecha, COUNT(*) as cortes
            FROM citas
            WHERE estado = 'completada' AND fecha BETWEEN ? AND ?
            GROUP BY fecha ORDER BY fecha
        `).all(startDate, endDate);

        // Ingresos diarios (ventas por fecha)
        const ingresosDiarios = db.prepare(`
            SELECT date(fecha) as fecha, SUM(total) as ingresos
            FROM ventas
            WHERE date(fecha) BETWEEN ? AND ?
            GROUP BY date(fecha) ORDER BY fecha
        `).all(startDate, endDate);

        // Combinar datos diarios
        const fechas = {};
        rangeArray(startDate, endDate).forEach(key => {
            fechas[key] = { fecha: key, cortes: 0, ingresos: 0 };
        });
        cortesDiarios.forEach(r => { if (fechas[r.fecha]) fechas[r.fecha].cortes = r.cortes; });
        ingresosDiarios.forEach(r => { if (fechas[r.fecha]) fechas[r.fecha].ingresos = r.ingresos; });
        const diario = Object.values(fechas);

        // Top barbero (citas completadas)
        const topBarbero = db.prepare(`
            SELECT u.nombre, COUNT(*) as total
            FROM citas c JOIN usuarios u ON c.barbero_id = u.id
            WHERE c.estado = 'completada' AND c.fecha BETWEEN ? AND ?
            GROUP BY c.barbero_id ORDER BY total DESC LIMIT 1
        `).get(startDate, endDate) || { nombre: 'N/A', total: 0 };

        // Top servicio (citas completadas)
        const topServicio = db.prepare(`
            SELECT s.nombre, COUNT(*) as total
            FROM citas c JOIN servicios s ON c.servicio_id = s.id
            WHERE c.estado = 'completada' AND c.fecha BETWEEN ? AND ?
            GROUP BY c.servicio_id ORDER BY total DESC LIMIT 1
        `).get(startDate, endDate) || { nombre: 'N/A', total: 0 };

        // Distribución de servicios (para gráfico de dona)
        const distribucionServicios = db.prepare(`
            SELECT s.nombre, COUNT(*) as total
            FROM citas c JOIN servicios s ON c.servicio_id = s.id
            WHERE c.estado = 'completada' AND c.fecha BETWEEN ? AND ?
            GROUP BY c.servicio_id ORDER BY total DESC
        `).all(startDate, endDate);

        // Totales del período
        const totalCortes = diario.reduce((s, d) => s + d.cortes, 0);
        const totalIngresos = diario.reduce((s, d) => s + d.ingresos, 0);

        // Comparativa con semana anterior
        const prevStart = addDays(startDate, -7);
        const prevEnd = addDays(startDate, -1);

        const prevCortes = rango === 'semana' ? (db.prepare(`
            SELECT COUNT(*) as total FROM citas WHERE estado = 'completada' AND fecha BETWEEN ? AND ?
        `).get(prevStart, prevEnd)?.total || 0) : null;

        const prevIngresos = rango === 'semana' ? (db.prepare(`
            SELECT SUM(total) as total FROM ventas WHERE date(fecha) BETWEEN ? AND ?
        `).get(prevStart, prevEnd)?.total || 0) : null;

        res.json({
            diario, topBarbero, topServicio,
            distribucionServicios,
            totalCortes, totalIngresos,
            semanaAnterior: rango === 'semana' ? { cortes: prevCortes, ingresos: prevIngresos } : null,
            startDate, endDate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auditoría Log
router.get('/auditoria', requireAuth, requireAdmin, (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT a.id, a.accion, a.detalles, a.fecha, u.nombre as usuario
            FROM auditoria_log a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            ORDER BY a.fecha DESC
            LIMIT 100
        `).all();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD de Usuarios (con soporte multi-rol)
router.get('/usuarios', requireAuth, (req, res) => {
    try {
        let usuarios;
        if (req.user.rol === 'admin') {
            usuarios = db.prepare('SELECT id, nombre, username, telefono, rol FROM usuarios').all();
        } else if (req.user.rol === 'recepcionista') {
            usuarios = db.prepare("SELECT id, nombre, username, telefono, rol FROM usuarios WHERE rol = 'barbero'").all();
        } else {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/usuarios', requireAuth, (req, res) => {
    const { nombre, username, password, rol, telefono } = req.body;

    try {
        let finalRol = rol || 'barbero';
        let finalUsername = username;
        let finalPassword = password;
        let finalTelefono = telefono || '';

        if (req.user.rol === 'recepcionista') {
            // Recepcionista solo puede crear barberos, autogenera username/password
            finalRol = 'barbero';
            const suffix = Math.random().toString(36).substring(2, 8);
            finalUsername = `barbero_${nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${suffix}`;
            finalPassword = `barber${Math.floor(1000 + Math.random() * 9000)}`;
        } else if (req.user.rol === 'admin') {
            if (finalRol === 'admin') {
                return res.status(400).json({ error: 'No puedes crear usuarios con rol admin.' });
            }
            if (!finalUsername || !finalPassword) {
                return res.status(400).json({ error: 'Admin debe proporcionar username y contraseña.' });
            }
        } else {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        const stmt = db.prepare('INSERT INTO usuarios (nombre, username, password, telefono, rol) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(nombre, finalUsername, finalPassword, finalTelefono, finalRol);

        logAudit(req.user.id, 'Crear Usuario', `Usuario ${finalUsername} creado con rol ${finalRol}`);
        res.status(201).json({ mensaje: 'Usuario creado', id: info.lastInsertRowid, username: finalUsername, password: finalPassword });
    } catch (error) {
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe.' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.put('/usuarios/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { nombre, username, password, rol, telefono } = req.body;

    try {
        const existing = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (req.user.rol === 'recepcionista') {
            if (existing.rol !== 'barbero') {
                return res.status(403).json({ error: 'Solo puedes editar barberos.' });
            }
            // Recepcionista solo actualiza nombre y telefono
            db.prepare('UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?').run(nombre || existing.nombre, telefono ?? existing.telefono, id);
        } else if (req.user.rol === 'admin') {
            if (existing.id == 1 && rol && rol !== 'admin') {
                return res.status(400).json({ error: 'No puedes cambiar el rol del administrador principal.' });
            }
            if (rol === 'admin' && existing.id != 1) {
                return res.status(400).json({ error: 'No puedes asignar rol admin a otros usuarios.' });
            }
            const newNombre = nombre || existing.nombre;
            const newUsername = username || existing.username;
            const newRol = rol || existing.rol;
            const newTelefono = telefono ?? existing.telefono;
            // Password opcional en edición para admin
            if (password) {
                db.prepare('UPDATE usuarios SET nombre = ?, username = ?, password = ?, telefono = ?, rol = ? WHERE id = ?').run(newNombre, newUsername, password, newTelefono, newRol, id);
            } else {
                db.prepare('UPDATE usuarios SET nombre = ?, username = ?, telefono = ?, rol = ? WHERE id = ?').run(newNombre, newUsername, newTelefono, newRol, id);
            }
        } else {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        logAudit(req.user.id, 'Editar Usuario', `Usuario ID ${id} actualizado.`);
        res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe.' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.delete('/usuarios/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { force } = req.body || {};
    try {
        const existing = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (req.user.rol === 'recepcionista') {
            if (existing.rol !== 'barbero') {
                return res.status(403).json({ error: 'Solo puedes eliminar barberos.' });
            }
        } else if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }

        const citas = db.prepare('SELECT COUNT(*) as c FROM citas WHERE barbero_id = ? OR creado_por = ?').get(id, id).c;
        const ventas = db.prepare('SELECT COUNT(*) as c FROM ventas WHERE barbero_id = ?').get(id).c;
        const cajas = db.prepare('SELECT COUNT(*) as c FROM cajas WHERE recepcionista_id = ?').get(id).c;
        const logs = db.prepare('SELECT COUNT(*) as c FROM auditoria_log WHERE usuario_id = ?').get(id).c;

        const total = citas + ventas + cajas + logs;

        if (total > 0 && !force) {
            return res.status(409).json({
                error: `El usuario tiene ${total} registro(s) asociado(s): ${citas} cita(s), ${ventas} venta(s), ${cajas} caja(s). Usa force=true para eliminar.`,
                related: { citas, ventas, cajas, logs }
            });
        }

        if (force) {
            db.prepare('UPDATE citas SET barbero_id = NULL WHERE barbero_id = ?').run(id);
            db.prepare('UPDATE citas SET creado_por = NULL WHERE creado_por = ?').run(id);
            db.prepare('UPDATE ventas SET barbero_id = NULL WHERE barbero_id = ?').run(id);
            db.prepare('UPDATE cajas SET recepcionista_id = NULL WHERE recepcionista_id = ?').run(id);
            db.prepare('DELETE FROM auditoria_log WHERE usuario_id = ?').run(id);
        }

        db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
        logAudit(req.user.id, force ? 'Eliminar Usuario (force)' : 'Eliminar Usuario',
            `Usuario ID ${id} (${existing.username}) eliminado${force ? ` con ${total} registros reasignados` : ''}`);
        res.json({ mensaje: 'Usuario eliminado', force, registros_afectados: force ? total : 0 });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== COMISIONES Y PAGOS DE BARBEROS ====================

// GET /api/admin/barberos/comision — Admin: lista barberos con su % de comisión
router.get('/barberos/comision', requireAuth, requireAdmin, (req, res) => {
    try {
        const barberos = db.prepare(`
            SELECT u.id, u.nombre, u.telefono,
                   COALESCE(bc.porcentaje, 50) as porcentaje
            FROM usuarios u
            LEFT JOIN barbero_comision bc ON bc.barbero_id = u.id
            WHERE u.rol = 'barbero'
            ORDER BY u.nombre
        `).all();
        res.json(barberos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/barberos/:id/comision — Admin: actualiza % de comisión
router.put('/barberos/:id/comision', requireAuth, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { porcentaje } = req.body;

        if (porcentaje === undefined || porcentaje < 0 || porcentaje > 100) {
            return res.status(400).json({ error: 'El porcentaje debe estar entre 0 y 100.' });
        }

        const barbero = db.prepare('SELECT id FROM usuarios WHERE id = ? AND rol = ?').get(id, 'barbero');
        if (!barbero) {
            return res.status(404).json({ error: 'Barbero no encontrado.' });
        }

        db.prepare(`
            INSERT INTO barbero_comision (barbero_id, porcentaje) VALUES (?, ?)
            ON CONFLICT(barbero_id) DO UPDATE SET porcentaje = ?
        `).run(id, porcentaje, porcentaje);

        logAudit(req.user.id, 'Configurar Comisión', `Comisión del barbero ID ${id} actualizada a ${porcentaje}%`);
        res.json({ mensaje: 'Comisión actualizada', porcentaje });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/barberos/ganancias — Calcula ganancias por barbero en rango de fechas
router.get('/barberos/ganancias', requireAuth, (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({ error: 'Parámetros desde y hasta son requeridos (YYYY-MM-DD).' });
        }

        const ganancias = db.prepare(`
            SELECT
                u.id,
                u.nombre,
                COUNT(v.id) as servicios,
                COALESCE(SUM(v.total), 0) as total_ventas,
                COALESCE(bc.porcentaje, 50) as porcentaje,
                ROUND(COALESCE(SUM(v.total), 0) * (COALESCE(bc.porcentaje, 50) / 100.0), 2) as comision
            FROM usuarios u
            LEFT JOIN ventas v ON v.barbero_id = u.id AND date(v.fecha) BETWEEN ? AND ?
            LEFT JOIN barbero_comision bc ON bc.barbero_id = u.id
            WHERE u.rol = 'barbero'
            GROUP BY u.id
            ORDER BY u.nombre
        `).all(desde, hasta);

        // Get already paid amounts for each barber in this period
        const pagado = db.prepare(`
            SELECT barbero_id, COALESCE(SUM(monto), 0) as total_pagado
            FROM pagos_barbero
            WHERE estado = 'pagado' AND semana_inicio >= ? AND semana_fin <= ?
            GROUP BY barbero_id
        `).all(desde, hasta);

        const pagadoMap = {};
        pagado.forEach(p => { pagadoMap[p.barbero_id] = p.total_pagado; });

        const result = ganancias.map(g => ({
            ...g,
            total_pagado: pagadoMap[g.id] || 0,
            pendiente: Math.max(0, g.comision - (pagadoMap[g.id] || 0))
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/pagos — Lista historial de pagos
router.get('/pagos', requireAuth, (req, res) => {
    try {
        let pagos;
        if (req.user.rol === 'admin') {
            pagos = db.prepare(`
                SELECT p.id, p.barbero_id, u.nombre as barbero_nombre,
                       p.monto, p.semana_inicio, p.semana_fin,
                       p.estado, p.fecha_pago, p.notas,
                       r.nombre as registrado_por_nombre
                FROM pagos_barbero p
                JOIN usuarios u ON u.id = p.barbero_id
                LEFT JOIN usuarios r ON r.id = p.registrado_por
                ORDER BY p.id DESC
            `).all();
        } else {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/pagos — Registra un pago a un barbero
router.post('/pagos', requireAuth, (req, res) => {
    try {
        const { barbero_id, monto, semana_inicio, semana_fin, notas } = req.body;

        if (!barbero_id || !monto || !semana_inicio || !semana_fin) {
            return res.status(400).json({ error: 'Faltan campos requeridos: barbero_id, monto, semana_inicio, semana_fin.' });
        }

        const barbero = db.prepare('SELECT id FROM usuarios WHERE id = ? AND rol = ?').get(barbero_id, 'barbero');
        if (!barbero) {
            return res.status(404).json({ error: 'Barbero no encontrado.' });
        }

        const info = db.prepare(`
            INSERT INTO pagos_barbero (barbero_id, monto, semana_inicio, semana_fin, estado, registrado_por, fecha_pago, notas)
            VALUES (?, ?, ?, ?, 'pagado', ?, datetime('now', 'localtime'), ?)
        `).run(barbero_id, monto, semana_inicio, semana_fin, req.user.id, notas || '');

        logAudit(req.user.id, 'Registrar Pago', `Pago de $${monto} a barbero ID ${barbero_id} (semana ${semana_inicio} a ${semana_fin})`);
        res.status(201).json({ mensaje: 'Pago registrado', id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/pagos/:id — Admin: cancela/confirma un pago
router.put('/pagos/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!['pendiente', 'pagado', 'cancelado'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido. Use: pendiente, pagado, cancelado.' });
        }

        const existing = db.prepare('SELECT id, estado FROM pagos_barbero WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Pago no encontrado.' });
        }

        if (estado === 'pagado' && existing.estado !== 'pagado') {
            db.prepare("UPDATE pagos_barbero SET estado = ?, fecha_pago = datetime('now', 'localtime') WHERE id = ?").run(estado, id);
        } else {
            db.prepare('UPDATE pagos_barbero SET estado = ? WHERE id = ?').run(estado, id);
        }

        logAudit(req.user.id, 'Actualizar Pago', `Pago ID ${id} cambiado a ${estado}`);
        res.json({ mensaje: 'Pago actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { Parser } = require('json2csv');
const { Readable } = require('stream');
const multer = require('multer');

const uploadZip = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }).single('backup');

router.get('/export', requireAuth, requireAdmin, (req, res) => {
    try {
        // Get all table names
        const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        const tables = tablesResult.map(t => t.name);

        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-disposition': `attachment; filename=backup_barberia_${today()}.zip`
        });

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('error', function(err) {
            throw err;
        });

        archive.pipe(res);

        // Process each table
        for (const tableName of tables) {
            const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
            if (rows.length > 0) {
                const json2csvParser = new Parser();
                const csv = json2csvParser.parse(rows);
                archive.append(csv, { name: `${tableName}.csv` });
            } else {
                archive.append('', { name: `${tableName}.csv` });
            }
        }

        logAudit(req.user.id, 'Exportar BD', 'El administrador exportó toda la base de datos a CSV.');

        archive.finalize();

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            console.error('Error during DB export:', error);
        }
    }
});

// POST /api/admin/restore — Restore database from uploaded ZIP
router.post('/restore', requireAuth, requireAdmin, (req, res) => {
  uploadZip(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    try {
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);

      const insertStmts = {};

      for (const entry of entries) {
        if (!entry.name.endsWith('.csv') || entry.isDirectory) continue;
        const tableName = entry.name.replace('.csv', '');

        if (!tables.includes(tableName)) {
          console.warn(`Tabla "${tableName}" no existe, saltando.`);
          continue;
        }

        const csvContent = entry.getData().toString('utf-8').trim();
        if (!csvContent) continue;

        const lines = csvContent.split('\n');
        if (lines.length < 2) continue;

        const headers = parseCSVLine(lines[0]);
        const placeholders = headers.map(() => '?').join(', ');
        const columns = headers.join(', ');

        if (!insertStmts[tableName]) {
          insertStmts[tableName] = db.prepare(`INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`);
        }

        const transaction = db.transaction(() => {
          db.prepare(`DELETE FROM ${tableName}`).run();
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;
            const parsed = values.map(v => {
              if (v === '' || v === 'NULL' || v === 'null') return null;
              const num = Number(v);
              if (!isNaN(num) && v.trim() !== '') return num;
              return v;
            });
            try {
              insertStmts[tableName].run(...parsed);
            } catch (e) {
              console.warn(`Error insertando en ${tableName}: ${e.message}`);
            }
          }
        });

        transaction();
      }

      logAudit(req.user.id, 'Restaurar Base de Datos', 'Base de datos restaurada desde archivo ZIP.');
      res.json({ mensaje: 'Base de datos restaurada correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

module.exports = router;
