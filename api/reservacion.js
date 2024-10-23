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
router.post('/', async (req, res) => {
    const { propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'INSERT INTO reservaciones (propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total) VALUES (?, ?, ?, ?, ?, ?)';
    
    conexion.query(sql, [propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        try {
            // Obtener los correos del usuario y del propietario
            const correos = await obtenerCorreos(propiedad_id, usuario_id);
            if (correos) {
                const { correo_usuario, correo_propietario } = correos;
                console.log("envia")
                await enviarCorreo(
                    `${correo_usuario}, ${correo_propietario}`, // Enviar a ambos correos
                    'Nueva Reservación Creada',
                    `Se ha creado una nueva reservación con ID: ${result.insertId}`
                );
                console.log('Correo enviado a:', correo_usuario, 'y', correo_propietario);
            } else {
                console.error('No se pudieron obtener los correos.');
            }
        } catch (error) {
            console.error('Error al enviar correo:', error);
        }

        res.status(201).json({ message: 'Reservación creada con éxito', reservacionId: result.insertId });
    });
});

// Actualizar una reservación por ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { propiedad_id, usuario_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'UPDATE reservaciones SET propiedad_id = ?, fecha_inicio = ?, fecha_fin = ?, fecha_reserva = ?, monto_total = ? WHERE id = ?';
    
    conexion.query(sql, [propiedad_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total, id], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Enviar correo de actualización
        try {
            const correos = await obtenerCorreos(propiedad_id, usuario_id);
            if (correos) {
                const { correo_usuario, correo_propietario } = correos;

                await enviarCorreo(
                    `${correo_usuario}, ${correo_propietario}`,
                    'Reservación Actualizada',
                    `La reservación con ID: ${id} ha sido actualizada.`
                );
                console.log('Correo de actualización enviado a:', correo_usuario, 'y', correo_propietario);
            } else {
                console.error('No se pudieron obtener los correos para la actualización.');
            }
        } catch (error) {
            console.error('Error al enviar correo de actualización:', error);
        }

        res.json({ message: 'Reservación actualizada con éxito' });
    });
});

// Eliminar una reservación por ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM reservaciones WHERE id = ?';

    conexion.query(sql, [id], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Enviar correo de eliminación
        try {
            const reservacionSql = 'SELECT propiedad_id, usuario_id FROM reservaciones WHERE id = ?';
            conexion.query(reservacionSql, [id], async (err, reservacion) => {
                if (err || reservacion.length === 0) {
                    console.error('Error al obtener datos de la reservación para el correo:', err);
                    return res.status(404).json({ message: 'Reservación no encontrada' });
                }

                const { propiedad_id, usuario_id } = reservacion[0];
                const correos = await obtenerCorreos(propiedad_id, usuario_id);
                if (correos) {
                    const { correo_usuario, correo_propietario } = correos;

                    await enviarCorreo(
                        `${correo_usuario}, ${correo_propietario}`,
                        'Reservación Eliminada',
                        `La reservación con ID: ${id} ha sido eliminada.`
                    );
                    console.log('Correo de eliminación enviado a:', correo_usuario, 'y', correo_propietario);
                } else {
                    console.error('No se pudieron obtener los correos para la eliminación.');
                }
            });
        } catch (error) {
            console.error('Error al enviar correo de eliminación:', error);
        }

        res.json({ message: 'Reservación eliminada con éxito' });
    });
});

module.exports = router;
