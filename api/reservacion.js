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

// Crear una reservación
router.post('/', (req, res) => {
    const { propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'INSERT INTO reservaciones (propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total) VALUES (?, ?, ?, ?, ?, ?, ?)';

    conexion.query(sql, [propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Obtener correos de propietario e inquilino
        obtenerCorreos(inquilino_id, propietario_id)
            .then(({ correo_inquilino, correo_propietario }) => {
                // Enviar correos
                return Promise.all([
                    enviarCorreo(
                        correo_inquilino,
                        'Reservación Creada',
                        `Su reservación para la propiedad ID: ${propiedad_id} ha sido creada exitosamente.`
                    ),
                    enviarCorreo(
                        correo_propietario,
                        'Nueva Reservación',
                        `El inquilino con ID: ${inquilino_id} ha creado una reservación para su propiedad ID: ${propiedad_id}.`
                    )
                ]);
            })
            .then(() => {
                res.json({ message: 'Reservación creada y correos enviados.' });
            })
            .catch(error => {
                console.error('Error al enviar los correos:', error);
                res.status(500).json({ error: 'Reservación creada, pero ocurrió un error al enviar los correos.' });
            });
    });
});



// Actualizar una reservación por ID
router.put('/', (req, res) => {
    const { id } = req.query;
    const { propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'UPDATE reservaciones SET propiedad_id = ?, fecha_inicio = ?, fecha_fin = ?, fecha_reserva = ?, monto_total = ? WHERE id = ?';

    conexion.query(sql, [propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Obtener correos de propietario e inquilino
        obtenerCorreos(inquilino_id, propietario_id)
            .then(({ correo_inquilino, correo_propietario }) => {
                // Enviar correos
                return Promise.all([
                    enviarCorreo(
                        correo_inquilino,
                        'Reservación Actualizada',
                        `Su reservación para la propiedad ID: ${propiedad_id} ha sido actualizada exitosamente.`
                    ),
                    enviarCorreo(
                        correo_propietario,
                        'Reservación Actualizada',
                        `El inquilino con ID: ${inquilino_id} ha actualizado su reservación para su propiedad ID: ${propiedad_id}.`
                    )
                ]);
            })
            .then(() => {
                res.json({ message: 'Reservación actualizada con éxito y correos enviados.' });
            })
            .catch(error => {
                console.error('Error al enviar los correos:', error);
                res.status(500).json({ error: 'Reservación actualizada, pero ocurrió un error al enviar los correos.' });
            });
    });
});


// Eliminar una reservación por ID
router.delete('/', (req, res) => {
    const { id } = req.query;
    const sql = 'DELETE FROM reservaciones WHERE id = ?';

    conexion.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Respuesta exitosa al cliente
        res.json({ message: 'Reservación eliminada con éxito' });
    });
});


module.exports = router;
