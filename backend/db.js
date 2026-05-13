const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'barberia.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema if not exists
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schema);

// Migration: add duracion_minutos if not exists (for existing databases)
try {
    db.exec("ALTER TABLE servicios ADD COLUMN duracion_minutos INTEGER DEFAULT 30");
} catch {
    // Column already exists, ignore
}

// Migration: add telefono column if not exists
try {
    db.exec("ALTER TABLE usuarios ADD COLUMN telefono TEXT DEFAULT ''");
} catch {
    // Column already exists, ignore
}

// Migration: add 'en_turno' to citas estado CHECK constraint
try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='citas'").get();
    if (tableInfo && !tableInfo.sql.includes('en_turno')) {
        db.exec(`
            CREATE TABLE citas_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_nombre TEXT NOT NULL,
                barbero_id INTEGER NOT NULL,
                servicio_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_turno', 'completada', 'cancelada')),
                venta_id INTEGER,
                creado_por INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (barbero_id) REFERENCES usuarios(id),
                FOREIGN KEY (servicio_id) REFERENCES servicios(id),
                FOREIGN KEY (venta_id) REFERENCES ventas(id),
                FOREIGN KEY (creado_por) REFERENCES usuarios(id)
            );
            INSERT INTO citas_new SELECT * FROM citas;
            DROP TABLE citas;
            ALTER TABLE citas_new RENAME TO citas;
        `);
    }
} catch {
    // Migration already applied or not needed
}

// Migration: add imagen_url to inventario
try {
    db.exec("ALTER TABLE inventario ADD COLUMN imagen_url TEXT DEFAULT ''");
} catch {
    // Column already exists, ignore
}

// Migration: create venta_productos table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS venta_productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL DEFAULT 1,
            precio_unitario REAL NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id),
            FOREIGN KEY (producto_id) REFERENCES inventario(id)
        )
    `);
} catch {
    // Table already exists
}

// Migration: make barbero_id nullable in citas (for force-delete user support)
try {
    const colInfo = db.prepare("SELECT notnull FROM pragma_table_info('citas') WHERE name='barbero_id'").get();
    if (colInfo && colInfo.notnull === 1) {
        db.exec(`
            CREATE TABLE citas_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_nombre TEXT NOT NULL,
                barbero_id INTEGER,
                servicio_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_turno', 'completada', 'cancelada')),
                venta_id INTEGER,
                creado_por INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (barbero_id) REFERENCES usuarios(id),
                FOREIGN KEY (servicio_id) REFERENCES servicios(id),
                FOREIGN KEY (venta_id) REFERENCES ventas(id),
                FOREIGN KEY (creado_por) REFERENCES usuarios(id)
            );
            INSERT INTO citas_new SELECT * FROM citas;
            DROP TABLE citas;
            ALTER TABLE citas_new RENAME TO citas;
        `);
    }
} catch {
    // Migration already applied or not needed
}

// Migration: create configuracion table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL DEFAULT ''
        )
    `);
    // Seed default values
    const insert = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)');
    insert.run('nombre_barberia', 'Barbería');
    insert.run('direccion', 'Calle Principal #123');
    insert.run('telefono', '555-0123');
    insert.run('logo_url', '');
} catch {
    // Table already exists
}

// Migration: create barbero_comision and pagos_barbero tables
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS barbero_comision (
            barbero_id INTEGER PRIMARY KEY,
            porcentaje REAL NOT NULL DEFAULT 50,
            FOREIGN KEY (barbero_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )
    `);
    // Auto-assign default 50% commission to all existing barbers without one
    db.prepare(`
        INSERT OR IGNORE INTO barbero_comision (barbero_id, porcentaje)
        SELECT id, 50 FROM usuarios WHERE rol = 'barbero'
    `).run();
} catch {
    // Table already exists
}

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS pagos_barbero (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barbero_id INTEGER NOT NULL,
            monto REAL NOT NULL,
            semana_inicio DATE NOT NULL,
            semana_fin DATE NOT NULL,
            estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado', 'cancelado')),
            registrado_por INTEGER NOT NULL,
            fecha_pago DATETIME,
            notas TEXT DEFAULT '',
            FOREIGN KEY (barbero_id) REFERENCES usuarios(id),
            FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
        )
    `);
} catch {
    // Table already exists
}

module.exports = db;
