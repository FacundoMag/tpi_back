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

// Obtener las reservaciones de un inquilino
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

// Obtener las reservaciones de un propietario
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
            propiedades.direccion, 
            usuarios.nombre, 
            usuarios.apellido 
        FROM 
            reservaciones 
        JOIN 
            propiedades ON propiedades.id = reservaciones.propiedad_id 
        JOIN 
            usuarios ON reservaciones.inquilino_id = usuarios.id 
        WHERE 
            reservaciones.propietario_id = ?;
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

// Crear una nueva reservación
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

        const { correo_inquilino, nombre_inquilino, correo_propietario, nombre_propietario, direccion } = await obtenerDetallesReservacion(inquilino_id, propietario_id, propiedad_id);

        await Promise.all([
            enviarCorreo(
                correo_inquilino,
                'Reservación Creada',
                `
                Su reservación ha sido creada exitosamente.<br><br>
                `,
                nombre_inquilino,
                direccion,
                fecha_inicio,
                fecha_fin,
                monto_total
            ),
            enviarCorreo(
                correo_propietario,
                'Nueva Reservación',
                `
                Se creó una reservación en su propiedad.<br><br>
                <strong>Dirección:</strong> ${direccion}<br>
                <strong>Fecha:</strong> ${fecha_inicio} hasta ${fecha_fin}<br>
                <strong>Monto:</strong> ${monto_total}
                `,
                nombre_propietario,
                direccion,
                fecha_inicio,
                fecha_fin,
                monto_total
            )
        ]);

        res.json({ message: 'Reservación creada y correos enviados.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la reservación o al enviar los correos.' });
    }
});

module.exports = router;
