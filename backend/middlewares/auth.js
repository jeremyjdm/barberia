const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_barberia';

const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verificamos que el usuario aún exista en la BD (opcional pero recomendado)
        const user = db.prepare('SELECT id, nombre, username, rol FROM usuarios WHERE id = ?').get(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'El usuario del token ya no existe.' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de admin.' });
    }
};

module.exports = {
    requireAuth,
    requireAdmin
};
