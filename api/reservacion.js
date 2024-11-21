const express = require('express');
const router = express.Router();
const { verificarToken } = require('@damianegreco/hashpass');
const conexion = require('../db/conexion');
const { enviarCorreo, obtenerCorreos } = require('./correo');
require('dotenv').config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;

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
router.get('/mis_reservaciones', (req, res) => {
    const token = req.headers.authorization;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = 'SELECT * FROM reservaciones WHERE inquilino_id = ?';
    conexion.query(sql, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({
            results
        });
    });
});
router.get('/reservaciones_propietario', (req, res) => {
    const token = req.headers.authorization;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = 'SELECT * FROM reservaciones WHERE propietario_id = ?';
    conexion.query(sql, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({
            results
        });
    });
});

// Crear una reservación
router.post('/', async (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);

    if (!verificacionToken) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    const { propiedad_id, propietario_id } = req.query;
    const { fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;

    if (!propiedad_id || !propietario_id) {
        return res.status(400).json({ error: 'Propiedad ID y Propietario ID son requeridos' });
    }

    if (!fecha_inicio || !fecha_fin || !fecha_reserva || !monto_total) {
        return res.status(400).json({ error: 'Todos los campos de la reservación son requeridos' });
    }

    const inquilino_id = verificacionToken.data?.usuario_id;

    const sql = 'INSERT INTO reservaciones (propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total) VALUES (?, ?, ?, ?, ?, ?, ?)';

    try {
        const result = await new Promise((resolve, reject) => {
            conexion.query(sql, [propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });

        const { correo_inquilino, correo_propietario } = await obtenerCorreos(inquilino_id, propietario_id);

        await Promise.all([
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

        res.json({ message: 'Reservación creada y correos enviados.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la reservación o al enviar los correos.' });
    }
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

        // Obtener el correo del usuario antes de eliminar la reservación
        const selectEmailSql = 'SELECT email FROM usuarios WHERE id = (SELECT usuario_id FROM reservaciones WHERE id = ?)';
        conexion.query(selectEmailSql, [id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Reservación no encontrada' });
            }

            const userEmail = results[0].email;

            // Enviar correo al usuario
            enviarCorreo(userEmail, 'Reservación Eliminada', 'Tu reservación ha sido eliminada.')
                .then(() => {
                    // Eliminar la reservación
                    conexion.query(sql, [id], (err, result) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Reservación eliminada y correo enviado con éxito' });
                    });
                })
                .catch(error => {
                    console.error('Error al enviar el correo:', error);
                    res.status(500).json({ error: 'Ocurrió un error al enviar el correo.' });
                });
        });
    });
});

module.exports = router;
