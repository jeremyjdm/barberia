const db = require('../db');

const logAudit = (usuarioId, accion, detalles) => {
    try {
        const stmt = db.prepare('INSERT INTO auditoria_log (usuario_id, accion, detalles) VALUES (?, ?, ?)');
        stmt.run(usuarioId, accion, detalles);
    } catch (error) {
        console.error("Error al registrar auditoría:", error);
    }
};

module.exports = { logAudit };
