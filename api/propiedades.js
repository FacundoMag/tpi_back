const express = require('express');
const multer = require('multer');
const router = express.Router();
const { conexion } = require('../db/conexion');  // Conexión a la base de datos

// Configuración de almacenamiento para multer
const fotos = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'imagenes/');  
    },
    filename: (req, file, cb) => {
        const propiedad_id = req.propiedad_id;
        cb(null, `${propiedad_id}-${file.originalname}`);
    }
});

const upload = multer({ storage: fotos });

// Ruta para crear una nueva propiedad y subir imágenes
router.post('/', upload.array('imagenes', 10), (req, res, next) => {
    const { nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion } = req.body;

    const sqlPropiedad = `
        INSERT INTO propiedades (nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    conexion.query(sqlPropiedad, [nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error al insertar la propiedad' });
        }

        const propiedad_id = results.insertId;  

        // Asignar propiedad_id al request para usarlo en el nombre de archivo
        req.propiedad_id = propiedad_id;

        //procesar las imágenes con multer
        upload(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: 'Error al subir imágenes' });
            }

            const archivosSubidos = req.files.map(file => ({
                propiedad_id,
                url: file.filename  // Nombre del archivo
            }));

            // Insertar las imágenes en la tabla de fotos
            const sqlFotos = 'INSERT INTO fotos (propiedad_id, url) VALUES (?, ?)';
            archivosSubidos.forEach(archivo => {
                conexion.query(sqlFotos, [archivo.propiedad_id, archivo.url], (error, result) => {
                    if (error) {
                        return res.status(500).json({ error: 'Error al guardar la imagen en la base de datos' });
                    }
                });
            });

            res.status(201).json({ message: 'Propiedad y fotos subidas exitosamente', propiedad_id });
        });
    });
});

module.exports = router;
