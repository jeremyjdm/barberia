const db = require('./db');

try {
    const usuarios = db.prepare('SELECT * FROM usuarios').all();
    console.log("Usuarios:", usuarios);
    console.log("Base de datos inicializada correctamente.");
} catch (e) {
    console.error("Error:", e);
}
