// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- CONEXIÓN A MYSQL ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234', // Pon aquí tu pass local por si pruebas en PC
    database: process.env.DB_NAME || 'kidslearning_db',
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL Workbench exitosamente.');
});

// --- RUTAS (API) ---

// 1. Login (Básico)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE username = ? AND password = ?';
    
    db.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).send(err);
        
        if (result.length > 0) {
            // Usuario encontrado, devolver ID
            res.json({ success: true, userId: result[0].id });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    });
});

// 2. Registro (Crear usuario y tabla de progreso inicial)
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    const sqlUser = 'INSERT INTO usuarios (username, password) VALUES (?, ?)';
    
    db.query(sqlUser, [username, password], (err, result) => {
        if (err) return res.status(500).send(err);
        
        const userId = result.insertId;
        // Crear fila de progreso vacía para el nuevo usuario
        const sqlProgress = 'INSERT INTO progreso (usuario_id) VALUES (?)';
        db.query(sqlProgress, [userId], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.json({ success: true, userId: userId });
        });
    });
});

// 3. Obtener Progreso (Cargar estado de niveles y personajes)
app.get('/progress/:userId', (req, res) => {
    const sql = 'SELECT * FROM progreso WHERE usuario_id = ?';
    db.query(sql, [req.params.userId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result[0]);
    });
});

// 4. Actualizar Progreso (Cuando ganas o desbloqueas algo)
// server.js (Asegúrate de tener esto)

// server.js - CORRECCIÓN EN EL UPDATE

app.post('/progress/update', (req, res) => {
    const { userId, n1, n2, n3, p2, p3, p4, vidas, puntaje } = req.body;
    
    // 1. Intentamos actualizar
    const sqlUpdate = `UPDATE progreso SET 
        nivel_1_unlocked = ?, nivel_2_unlocked = ?, nivel_3_unlocked = ?,
        personaje_2_unlocked = ?, personaje_3_unlocked = ?, personaje_4_unlocked = ?,
        vidas = ?, puntaje_total = ?
        WHERE usuario_id = ?`;

    const params = [n1, n2, n3, p2, p3, p4, vidas, puntaje, userId];

    db.query(sqlUpdate, params, (err, result) => {
        if (err) {
            console.error("Error en Update:", err);
            return res.status(500).json({ error: err.message });
        }

        // 2. VERIFICACIÓN IMPORTANTE:
        // Si affectedRows es 0, significa que el usuario no tenía fila en la tabla progreso.
        if (result.affectedRows === 0) {
            console.log(`El usuario ${userId} no tenía progreso. Creando fila nueva...`);
            
            const sqlInsert = `INSERT INTO progreso 
                (usuario_id, nivel_1_unlocked, nivel_2_unlocked, nivel_3_unlocked, 
                personaje_2_unlocked, personaje_3_unlocked, personaje_4_unlocked, 
                vidas, puntaje_total) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            // Usamos los mismos params (el orden coincide: primero los datos, al final el ID que pusimos al principio del insert)
            // OJO: En el INSERT el usuario_id va primero. Reordenamos params para el Insert:
            const paramsInsert = [userId, n1, n2, n3, p2, p3, p4, vidas, puntaje];

            db.query(sqlInsert, paramsInsert, (err2, result2) => {
                if (err2) {
                    console.error("Error creando progreso nuevo:", err2);
                    return res.status(500).json({ error: err2.message });
                }
                res.json({ success: true, message: "Progreso creado exitosamente" });
            });
        } else {
            // Si affectedRows > 0, todo salió bien con el Update
            res.json({ success: true, message: "Progreso actualizado" });
        }
    });
});
app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});