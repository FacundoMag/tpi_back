const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const { hashPass, verificarPass, generarToken, verificarToken } = require('@damianegreco/hashpass');

const TOKEN_SECRET = "EQUIPO_GOAT"

// Obtener todas las propiedades
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM propiedades';
    conexion.query(sql, (err, results) => { // Aquí se usa conexion.query
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener una propiedad por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM propiedades WHERE id = ?';
    conexion.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.json(results[0]);
    });
});

// Crear una nueva propiedad
router.post('/newpropiedad', (req, res) => {
    const token = req.headers.authorization;
    console.log(token)
    if (!token) {
        console.err('no tienes token');
        res.status(403).json({
            status: 'error',
            error: "no tienes token"
        })
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);

    req.usuario_id = verificacionToken?.data?.usuario_id;


    const {nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion } = req.body;
    const usuario_id = req.usuario_id;
    const sql = `INSERT INTO propiedades 
                 (registra_usuario_id, nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    conexion.query(sql, [usuario_id, nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion], (err, result) => {
        if (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Propiedad creada con éxito', propiedadId: result.insertId });
    });
});

// Actualizar una propiedad por ID
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion } = req.body;
    const sql = `UPDATE propiedades SET usuario_id = ?, direccion = ?, ciudad_id = ?, num_habitaciones = ?, num_banos = ?, capacidad = ?, tamano_m2 = ?, precio_renta = ?, tipo_id = ?, estado = ?, descripcion = ?
                 WHERE id = ?`;
    conexion.query(sql, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion, id], (err, result) => {
        if (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.json({ message: 'Propiedad actualizada con éxito' });
    });
});

// Eliminar una propiedad por ID
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM propiedades WHERE id = ?';
    conexion.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.json({ message: 'Propiedad eliminada con éxito' });
    });
});

module.exports = router;
