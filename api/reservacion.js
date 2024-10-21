const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');

// Obtener todas las reservaciones
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM reservaciones';
    conexion.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener una reservación por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM reservaciones WHERE id = ?';
    conexion.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json(results[0]);
    });
});

// Crear una nueva reservación
router.post('/', (req, res) => {
    const { propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = `INSERT INTO reservaciones (propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total) 
                 VALUES (?, ?, ?, ?, ?)`;
    conexion.query(sql, [propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Reservación creada con éxito', reservacionId: result.insertId });
    });
});

// Actualizar una reservación por ID
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = `UPDATE reservaciones SET propiedad_id = ?, fecha_inicio = ?, fecha_fin = ?, 
                 fecha_reserva = ?, monto_total = ? WHERE id = ?`;
    conexion.query(sql, [propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({ message: 'Reservación actualizada con éxito' });
    });
});

// Eliminar una reservación por ID
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM reservaciones WHERE id = ?';
    conexion.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({ message: 'Reservación eliminada con éxito' });
    });
});

module.exports = router;
