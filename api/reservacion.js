const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const { enviarCorreo, obtenerCorreos } = require('./correo');

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
    const { propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'INSERT INTO reservaciones (propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total) VALUES (?, ?, ?, ?, ?, ?)';
    
    conexion.query(sql, [propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Obtener correos y enviar notificación
        obtenerCorreos(propiedad_id, usuario_id, (correos) => {
            if (correos) {
                const asunto = 'Confirmación de Nueva Reservación';
                const mensaje = `Una nueva reservación ha sido creada para la propiedad con ID: ${propiedad_id} por el usuario con ID: ${usuario_id}.`;
                enviarCorreo([correos.correo_usuario, correos.correo_propietario], asunto, mensaje);
            }
        });

        res.status(201).json({ message: 'Reservación creada con éxito', reservacionId: result.insertId });
    });
});

// Actualizar una reservación por ID
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'UPDATE reservaciones SET propiedad_id = ?, usuario_id = ?, fecha_inicio = ?, fecha_fin = ?, fecha_reserva = ?, monto_total = ? WHERE id = ?';
    
    conexion.query(sql, [propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Obtener correos y enviar notificación
        obtenerCorreos(propiedad_id, usuario_id, (correos) => {
            if (correos) {
                const asunto = 'Confirmación de Actualización de Reservación';
                const mensaje = `La reservación con ID: ${id} ha sido actualizada.`;
                enviarCorreo([correos.correo_usuario, correos.correo_propietario], asunto, mensaje);
            }
        });

        res.json({ message: 'Reservación actualizada con éxito' });
    });
});

// Eliminar una reservación por ID
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM reservaciones WHERE id = ?';

    // Consultar los datos de la reservación antes de eliminarla para obtener los correos
    conexion.query('SELECT propiedad_id, usuario_id FROM reservaciones WHERE id = ?', [id], (err, reservacion) => {
        if (err || reservacion.length === 0) {
            return res.status(500).json({ error: 'Error al buscar la reservación antes de eliminar.' });
        }
        const { propiedad_id, usuario_id } = reservacion[0];

        conexion.query(sql, [id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Obtener correos y enviar notificación
            obtenerCorreos(propiedad_id, usuario_id, (correos) => {
                if (correos) {
                    const asunto = 'Confirmación de Cancelación de Reservación';
                    const mensaje = `La reservación con ID: ${id} ha sido cancelada.`;
                    enviarCorreo([correos.correo_usuario, correos.correo_propietario], asunto, mensaje);
                }
            });

            res.json({ message: 'Reservación eliminada con éxito' });
        });
    });
});

module.exports = router;
