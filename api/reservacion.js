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
    const sql = `
        SELECT 
            reservaciones.id, 
            reservaciones.propiedad_id, 
            reservaciones.propietario_id, 
            reservaciones.inquilino_id, 
            reservaciones.fecha_inicio, 
            reservaciones.fecha_fin, 
            reservaciones.fecha_reserva, 
            reservaciones.monto_total, 
            propiedades.direccion 
        FROM 
            reservaciones 
        JOIN 
            propiedades ON reservaciones.propiedad_id = propiedades.id 
        WHERE 
            inquilino_id = ?
    `;

    conexion.query(sql, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({ results });
    });
});

router.get('/reservaciones_propietario', (req, res) => {
    const token = req.headers.authorization;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = `
        SELECT 
            reservaciones.id, 
            reservaciones.propiedad_id, 
            reservaciones.propietario_id, 
            reservaciones.inquilino_id, 
            reservaciones.fecha_inicio, 
            reservaciones.fecha_fin, 
            reservaciones.fecha_reserva, 
            reservaciones.monto_total, 
            propiedades.direccion 
        FROM 
            reservaciones 
        JOIN 
            propiedades ON propiedades.id = reservaciones.propiedad_id 
        WHERE 
            reservaciones.propietario_id = ?
    `;
    conexion.query(sql, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Reservación no encontrada' });
        }
        res.json({ results });
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

        const { correo_inquilino, nombre_inquilino, correo_propietario, nombre_propietario, direccion } = await obtenerCorreos(inquilino_id, propietario_id);

        await Promise.all([
            enviarCorreo(
                correo_inquilino,
                'Reservación Creada',
                `Hola ${nombre_inquilino},

                Su reservación ha sido creada exitosamente.

                Dirección: ${direccion}
                Fecha: ${fecha_inicio} hasta ${fecha_fin}

                Monto: ${monto_total}
                `
            ),
            enviarCorreo(
                correo_propietario,
                'Nueva Reservación',
                `Hola ${nombre_propietario},

                Se creó una reservación en su propiedad:

                Dirección: ${direccion}
                Fecha: ${fecha_inicio} hasta ${fecha_fin}

                Monto: ${monto_total}
                `
            )
        ]);

        res.json({ message: 'Reservación creada y correos enviados.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la reservación o al enviar los correos.' });
    }
});

// Actualizar una reservación por ID
router.put('/', async (req, res) => {
    const { id } = req.query;
    const { propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total } = req.body;
    const sql = 'UPDATE reservaciones SET propiedad_id = ?, fecha_inicio = ?, fecha_fin = ?, fecha_reserva = ?, monto_total = ? WHERE id = ?';

    try {
        await new Promise((resolve, reject) => {
            conexion.query(sql, [propiedad_id, propietario_id, inquilino_id, fecha_inicio, fecha_fin, fecha_reserva, monto_total, id], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });

        const { correo_inquilino, nombre_inquilino, correo_propietario, nombre_propietario, direccion } = await obtenerCorreos(inquilino_id, propietario_id);

        await Promise.all([
            enviarCorreo(
                correo_inquilino,
                'Reservación Actualizada',
                `Hola ${nombre_inquilino},

                Su reservación ha sido actualizada exitosamente.

                Dirección: ${direccion}
                Fecha: ${fecha_inicio} hasta ${fecha_fin}

                Monto: ${monto_total}
                `
            ),
            enviarCorreo(
                correo_propietario,
                'Reservación Actualizada',
                `Hola ${nombre_propietario},

                El inquilino ${nombre_inquilino} ha actualizado su reservación para su propiedad:

                Dirección: ${direccion}
                Fecha: ${fecha_inicio} hasta ${fecha_fin}

                Monto: ${monto_total}
                `
            )
        ]);

        res.json({ message: 'Reservación actualizada con éxito y correos enviados.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Ocurrió un error al actualizar la reservación o al enviar los correos.' });
    }
});

// Eliminar una reservación por ID
router.delete('/', async (req, res) => {
    const { id } = req.query;

    try {
        const detalles = await new Promise((resolve, reject) => {
            const sqlDetalles = `
                SELECT r.*, u.nombre AS nombre_inquilino, u.correo AS correo_inquilino, 
                p.nombre AS nombre_propietario, p.correo AS correo_propietario, prop.direccion
                FROM reservaciones r
                JOIN usuarios u ON r.inquilino_id = u.id
                JOIN usuarios p ON r.propietario_id = p.id
                JOIN propiedades prop ON r.propiedad_id = prop.id
                WHERE r.id = ?
            `;
            conexion.query(sqlDetalles, [id], (err, results) => {
                if (err) {
                    return reject(err);
                }
                if (results.length === 0) {
                    return reject(new Error('Reservación no encontrada'));
                }
                resolve(results[0]);
            });
        });

        const { correo_inquilino, correo_propietario, nombre_inquilino, nombre_propietario, direccion } = detalles;

        await Promise.all([
            enviarCorreo(
                correo_inquilino,
                'Reservación Eliminada',
                `Hola ${nombre_inquilino},

                Tu reservación en la propiedad en ${direccion} ha sido eliminada.
                `
            ),
            enviarCorreo(
                correo_propietario,
                'Reservación Eliminada',
                `Hola ${nombre_propietario},

                La reservación en su propiedad en ${direccion} ha sido eliminada.
                `
            )
        ]);

        const sqlEliminar = 'DELETE FROM reservaciones WHERE id = ?';
        await new Promise((resolve, reject) => {
            conexion.query(sqlEliminar, [id], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.json({ message: 'Reservación eliminada y correos enviados con éxito.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Ocurrió un error al eliminar la reservación o al enviar los correos.' });
    }
});

// Función para obtener detalles adicionales de la reservación
async function obtenerDetallesReservacion(inquilino_id, propietario_id, propiedad_id) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                i.nombre AS nombre_inquilino,
                p.nombre AS nombre_propietario,
                prop.direccion AS direccion,
                i.correo AS correo_inquilino,
                p.correo AS correo_propietario
            FROM
                usuarios i
            JOIN
                reservaciones r ON r.inquilino_id = i.id
            JOIN
                usuarios p ON r.propietario_id = p.id
            JOIN
                propiedades prop ON r.propiedad_id = prop.id
            WHERE
                r.inquilino_id = ? AND r.propietario_id = ? AND r.propiedad_id = ?
        `;

        conexion.query(sql, [inquilino_id, propietario_id, propiedad_id], (err, results) => {
            if (err) {
                return reject(err);
            }

            if (results.length === 0) {
                return reject(new Error('Detalles de la reservación no encontrados.'));
            }

            resolve(results[0]);
        });
    });
}

module.exports = router;
