const express = require('express');
const router = express.Router();
const { hashPass, verificarPass, generarToken, verificarToken } = require('@damianegreco/hashpass');
const conexion = require('../db/conexion');
require('dotenv').config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;

// Función para verificar si el correo ya está registrado
const checkUsuario = function(correo) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id FROM usuarios WHERE correo = ?";
        conexion.query(sql, [correo], function(error, result) {
            if (error) return reject(error);
            if (result.length > 0) return reject("Correo ya registrado");
            return resolve();
        });
    });
};

// Función para guardar un nuevo usuario en la base de datos
const guardarUsuario = function(nombre, apellido, telefono, correo, contraseñaHasheada) {
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO usuarios (nombre, apellido, telefono, correo, contraseña) VALUES (?, ?, ?, ?, ?)";
        conexion.query(sql, [nombre, apellido, telefono, correo, contraseñaHasheada], function(error, result) {
            if (error) return reject(error);
            resolve(result.insertId);
        });
    });
};

// Ruta para registrar un nuevo usuario
router.post('/registrarse', function(req, res) {
    const { nombre, apellido, telefono, correo, contraseña } = req.body;
    checkUsuario(correo)
        .then(() => {
            const contraseñaHasheada = hashPass(contraseña);
            return guardarUsuario(nombre, apellido, telefono, correo, contraseñaHasheada);
        })
        .then((usuarios_id) => {
            res.json({ status: 'ok', usuarios_id });
        })
        .catch((error) => {
            console.error(error);
            res.json({ status: 'error', error });
        });
});

// Ruta para iniciar sesión
router.post('/inicio_sesion', function(req, res) {
    const { correo, contraseña } = req.body;
    const sql = "SELECT id, contraseña FROM usuarios WHERE correo = ?";

    conexion.query(sql, [correo], function(error, result) {
        if (error) {
            console.log(error);
            return res.json({ status: 'error', error });
        } else {
            if (result.length === 0) {
                console.error("El correo no existe");
                return res.json({ status: 'error', error: "El correo no existe" });
            } else {
                if (verificarPass(contraseña, result[0].contraseña)) {
                    const token = generarToken(TOKEN_SECRET, 6, { usuario_id: result[0].id, correo: correo });
                    res.json({ status: 'ok', token, usuario_id: result[0].id });
                } else {
                    console.error("correo/contraseña incorrecto");
                    return res.json({ status: 'error', error: "correo/contraseña incorrecto" });
                }
            }
        }
    });
});

// Ruta para obtener el perfil del usuario
router.get('/mi_perfil', function(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ status: 'error', error: 'Token no proporcionado' });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if (!verificacionToken || !verificacionToken.data || !verificacionToken.data.usuario_id) {
        return res.status(403).json({ status: 'error', error: 'Token inválido' });
    }

    const usuario_id = verificacionToken.data.usuario_id;
    const sql = "SELECT nombre, apellido, telefono, correo FROM usuarios WHERE id = ?";
    conexion.query(sql, [usuario_id], function(error, result) {
        if (error) {
            return res.status(500).json({ status: 'error', error: 'Error al obtener perfil' });
        }
        if (result.length === 0) {
            return res.status(404).json({ status: 'error', error: 'Usuario no encontrado' });
        }
        res.json({ status: 'ok', result: result[0] });
    });
});

// Ruta para actualizar el perfil del usuario
router.put('/mi_perfil', function(req, res) {
    const tokenHeader = req.headers.authorization;
    const token = tokenHeader?.startsWith("Bearer ") ? tokenHeader.slice(7) : null;

    if (!token) {
        return res.status(403).json({ status: 'error', error: 'Acceso denegado: token no proporcionado' });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if (!verificacionToken || !verificacionToken.data || !verificacionToken.data.usuario_id) {
        return res.status(401).json({ status: 'error', error: 'Token inválido' });
    }

    const usuarioIdToken = verificacionToken.data.usuario_id;
    const { nombre, apellido, telefono, correo } = req.body;

    if (!nombre || !apellido || !telefono || !correo) {
        return res.status(400).json({ status: 'error', error: 'Todos los campos son obligatorios' });
    }

    const sql = "UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id = ?";
    conexion.query(sql, [nombre, apellido, telefono, correo, usuarioIdToken], function(error, result) {
        if (error) {
            return res.status(500).json({ status: 'error', error: 'Ocurrió un error al actualizar los datos' });
        }
        res.json({ status: 'ok', message: 'Datos actualizados correctamente' });
    });
});

// Ruta para agregar una propiedad a favoritos
router.post('/favoritos', function(req, res) {
    const token = req.headers.authorization;
    const { propiedad_id } = req.query;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = 'INSERT INTO favoritos (usuario_id, propiedad_id) VALUES (?, ?)';

    conexion.query(sql, [usuario_id, propiedad_id], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ status: 'error', error: 'Error al marcar como favorito' });
        }
        return res.json({ status: 'ok', message: 'Propiedad marcada como favorita' });
    });
});

// Ruta para eliminar una propiedad de favoritos
router.delete('/favoritos', (req, res) => {
    const token = req.headers.authorization;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const id = verificacionToken?.data?.usuario_id;
    const { propiedad_id } = req.query;
    const sql = 'DELETE FROM favoritos WHERE usuario_id = ? AND propiedad_id = ?';

    conexion.query(sql, [id, propiedad_id], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ status: 'error', error: 'Error al quitar de favoritos' });
        }
        res.json({ status: 'ok', message: 'Propiedad quitada de favoritos' });
    });
});

// Ruta para obtener las propiedades favoritas
router.get('/favoritos', (req, res) => {
    const token = req.headers.authorization;
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const id = verificacionToken?.data?.usuario_id;
    const sql = `
        SELECT 
            propiedades.id,
            GROUP_CONCAT(imagenes.url) AS imagenes,
            propiedades.precio_renta,
            propiedades.direccion,
            ciudades.nombre AS ciudad,
            propiedades.num_habitaciones,
            propiedades.num_banos,
            tipo_de_propiedad.nombre AS tipo
        FROM 
            favoritos
        JOIN 
            propiedades ON favoritos.propiedad_id = propiedades.id
        JOIN 
            tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id
        JOIN 
            ciudades ON propiedades.ciudad_id = ciudades.id
        JOIN 
            imagenes ON propiedades.id = imagenes.propiedad_id
        WHERE 
            favoritos.usuario_id = ?
        GROUP BY 
            propiedades.id;
    `;

    conexion.query(sql, [id], (error, propiedadesConimg) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ status: 'error', error: 'Error al obtener favoritos' });
        }
        propiedadesConimg = propiedadesConimg.map(propiedad => ({
            ...propiedad,
            imagenes: propiedad.imagenes ? propiedad.imagenes.split(',') : []
        }));
        res.json({ status: 'ok', favoritos: propiedadesConimg });
    });
});

// Ruta para obtener las propiedades del usuario
router.get('/mis_propiedades', function(req, res) {
    const token = req.headers.authorization;

    // Verificar si el token está presente
    if (!token) {
        console.error('Acceso denegado: token faltante');
        return res.status(403).json({ status: 'error', error: 'acceso denegado' });
    }

    // Verificar y decodificar el token
    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if (!verificacionToken || !verificacionToken.data || !verificacionToken.data.usuario_id) {
        console.error('Token inválido');
        return res.status(403).json({ status: "error", error: "token inválido" });
    }

    // Obtener el usuario_id del token
    const usuario_id = verificacionToken.data.usuario_id;

    // Consulta SQL para seleccionar una imagen por propiedad
    const sql = `
        SELECT 
            propiedades.id, 
            (SELECT url FROM imagenes WHERE imagenes.propiedad_id = propiedades.id LIMIT 1) AS url, 
            propiedades.precio_renta, 
            ciudades.nombre AS ciudad, 
            propiedades.direccion, 
            propiedades.num_habitaciones, 
            propiedades.num_banos, 
            tipo_de_propiedad.nombre AS tipo 
        FROM 
            propiedades 
        JOIN 
            ciudades ON propiedades.ciudad_id = ciudades.id 
        JOIN 
            tipo_de_propiedad ON tipo_de_propiedad.id = propiedades.tipo_id 
        WHERE 
            propiedades.propietario_id = ?;
    `;

    // Ejecutar la consulta a la base de datos
    conexion.query(sql, [usuario_id], function(error, result) {
        if (error) {
            console.error('Error en la consulta de propiedades:', error);
            return res.status(500).json({ status: 'error', error: 'Error al obtener propiedades' });
        }
        
        // Si no hay propiedades, enviar un mensaje adecuado
        if (result.length === 0) {
            return res.status(404).json({ status: 'error', error: 'No tiene ninguna propiedad registrada' });
        }

        // Enviar el resultado
        res.json({
            status: 'success',
            result
        });
    });
});

module.exports = router;