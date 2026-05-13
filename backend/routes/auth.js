const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../middlewares/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_barberia';

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username y password son requeridos.' });
    }

    try {
        const user = db.prepare('SELECT id, nombre, username, rol, password FROM usuarios WHERE username = ?').get(username);

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        logAudit(user.id, 'Login', `Usuario ${user.username} inició sesión`);

        res.json({
            mensaje: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                username: user.username,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
