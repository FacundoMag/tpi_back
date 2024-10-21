const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const multer = require('multer');
const { verificarToken } = require('@damianegreco/hashpass');

const TOKEN_SECRET = "EQUIPO_GOAT";

// Configurar Multer para el manejo de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Directorio donde se guardarán las imágenes
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);  // Nombre único para cada archivo
    }
});

const upload = multer({ storage: storage });

// Obtener todas las propiedades
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM propiedades';
    conexion.query(sql, (err, results) => { 
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Obtener una propiedad por ID con la URL de la imagen
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT propiedades.*, imagenes.url as imagen_url 
                 FROM propiedades 
                 LEFT JOIN imagenes ON propiedades.id = imagenes.propiedad_id 
                 WHERE propiedades.id = ?`;

    conexion.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }
        res.json(results[0]); // Incluye la URL de la imagen en la respuesta
    });
});

// Crear una nueva propiedad y guardar la imagen asociada
router.post('/newpropiedad', upload.single('imagen'), (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({
            status: 'error',
            error: "No tienes token"
        });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;

    const { nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion } = req.body;

    // Primero insertar la propiedad
    const sqlPropiedad = `INSERT INTO propiedades 
                         (registra_usuario_id, nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    conexion.query(sqlPropiedad, [usuario_id, nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const propiedadId = result.insertId;

        // Guardar la URL de la imagen en la tabla de imágenes, asociada a la propiedad creada
        if (req.file) {
            const imagenUrl = `/uploads/${req.file.filename}`;
            const sqlImagen = `INSERT INTO imagenes (propiedad_id, url) VALUES (?, ?)`;

            conexion.query(sqlImagen, [propiedadId, imagenUrl], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                res.status(201).json({ 
                    message: 'Propiedad y imagen creadas con éxito',
                    propiedadId: propiedadId,
                    imagenUrl: imagenUrl
                });
            });
        } else {
            res.status(201).json({ 
                message: 'Propiedad creada sin imagen', 
                propiedadId: propiedadId 
            });
        }
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
            console.log(err);
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
