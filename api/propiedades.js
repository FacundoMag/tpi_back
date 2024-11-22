const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken } = require('@damianegreco/hashpass');
require('dotenv').config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;

// Configuración de almacenamiento de imágenes con Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Filtrado de archivos (solo imágenes)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Inicialización de Multer con almacenamiento y filtros
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5, // Limitar el tamaño del archivo a 5MB
    },
}).array('archivos', 10); // Aceptar un máximo de 10 archivos 

// Ruta para obtener todas las propiedades con sus imágenes
router.get('/', function(req, res, next) {
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
            propiedades 
        JOIN 
            tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id 
        JOIN 
            ciudades ON propiedades.ciudad_id = ciudades.id 
        JOIN 
            imagenes ON propiedades.id = imagenes.propiedad_id 
        GROUP BY 
            propiedades.id
    `;

    conexion.query(sql, function(err, propiedadesConimg) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        propiedadesConimg = propiedadesConimg.map(propiedad => ({
            ...propiedad,
            imagenes: propiedad.imagenes ? propiedad.imagenes.split(',') : []
        }));
        res.json(propiedadesConimg);
    });
});

// Ruta para buscar propiedades con filtros
router.get('/buscador', function(req, res, next) {
    const { ciudad_id, tipo_id } = req.query;

    let sql = `
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
            propiedades 
        JOIN 
            ciudades ON propiedades.ciudad_id = ciudades.id 
        JOIN 
            tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id 
        JOIN 
            imagenes ON propiedades.id = imagenes.propiedad_id
    `;

    const filtros = [];
    const condiciones = [];

    if (ciudad_id) {
        condiciones.push("propiedades.ciudad_id = ?");
        filtros.push(ciudad_id);
    }

    if (tipo_id) {
        condiciones.push("propiedades.tipo_id = ?");
        filtros.push(tipo_id);
    }

    if (condiciones.length > 0) {
        sql += " WHERE " + condiciones.join(" AND ");
    }

    sql += " GROUP BY propiedades.id";

    conexion.query(sql, filtros, function(error, propiedadesConimg) {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: "Error al realizar la búsqueda" });
        }
        propiedadesConimg = propiedadesConimg.map(propiedad => ({
            ...propiedad,
            imagenes: propiedad.imagenes ? propiedad.imagenes.split(',') : []
        }));
        res.json(propiedadesConimg);
    });
});

// Ruta para obtener detalles de una propiedad específica
router.get('/propiedad', (req, res) => {
    const { id } = req.query;
    const sql = `
        SELECT 
            propiedades.propietario_id, 
            usuarios.telefono AS telefono_propietario,
            usuarios.nombre,
            usuarios.apellido,
            propiedades.direccion, 
            ciudades.nombre AS ciudades, 
            propiedades.num_habitaciones, 
            propiedades.num_banos, 
            propiedades.capacidad, 
            propiedades.tamano_m2, 
            propiedades.precio_renta, 
            tipo_de_propiedad.nombre AS tipo_de_propiedad, 
            propiedades.descripcion 
        FROM 
            propiedades 
        JOIN 
            ciudades ON propiedades.ciudad_id = ciudades.id 
        JOIN 
            tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id 
        JOIN 
            usuarios ON usuarios.id = propiedades.propietario_id 
        WHERE 
            propiedades.id = ?
    `;
    const sql2 = "SELECT url FROM imagenes WHERE propiedad_id = ?";
    const sql3 = `
        SELECT 
            usuarios.nombre AS usuarios, 
            usuarios.apellido AS usuarios, 
            resenas.comentario, 
            resenas.valoracion 
        FROM 
            resenas 
        JOIN 
            usuarios ON resenas.usuario_id = usuarios.id 
        WHERE 
            resenas.propiedad_id = ?
    `;
    const sql4 = "SELECT servicios.servicio AS servicios FROM propiedades_servicios JOIN servicios ON propiedades_servicios.servicio_id = servicios.id WHERE propiedades_servicios.propiedad_id = ?";
    
    conexion.query(sql, [id], function(error, propiedad) {
        if (error) {
            console.log(error);
            return res.status(403).json({ error: 'error al cargar la propiedad' });
        }
        conexion.query(sql2, [id], function(error, urls) {
            if (error) {
                console.log(error);
                return res.status(403).json({ error: 'error al cargar las urls' });
            }
            conexion.query(sql3, [id], function(error, reseñas) {
                if (error) {
                    console.log(error);
                    return res.status(401).json({ error: 'error al cargar las reseñas' });
                }
                conexion.query(sql4, [id], function(error, servicios) {
                    if (error) {
                        console.log(error);
                        return res.status(401).json({ error: 'error al cargar los servicios' });
                    }
                    res.json({
                        propiedad,
                        urls,
                        servicios,
                        reseñas
                    });
                });
            });
        });
    });
});

// Ruta para obtener listas de ciudades, tipos de propiedades y servicios
router.get('/list', function(req, res, next) {
    const ciudadesSQL = "SELECT id, nombre FROM ciudades";
    const tipoSQL = "SELECT id, nombre FROM tipo_de_propiedad";
    const servicioSQL = "SELECT id, servicio FROM servicios";

    conexion.query(ciudadesSQL, function(err, ciudades) {
        if (err) {
            return res.status(500).json({ error: "no se encontró ninguna ciudad" });
        }
        conexion.query(tipoSQL, function(error, tipo_propiedades) {
            if (error) {
                return res.status(500).json({ error: "no se encontró ningún tipo de propiedad" });
            }
            conexion.query(servicioSQL, function(error, servicios) {
                if (error) {
                    return res.status(500).json({ error: "no se encontró ningún servicio" });
                }
                res.json({ ciudades, tipo_propiedades, servicios });
            });
        });
    });
});

// Ruta para crear una nueva propiedad
router.post('/', upload, (req, res) => {
    const usuario_id = req.user_id;
    const { caracteristicas, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion } = req.body;

    // Verificar todos los campos necesarios y añadir logs
    if (!direccion || !ciudad_id || !num_habitaciones || !num_banos || !capacidad || !tamano_m2 || !precio_renta || !tipo_id || !descripcion) {
        console.log('Campos faltantes:', { direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion });
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    if (!usuario_id) {
        console.log('Falta usuario_id:', usuario_id);
        return res.status(400).json({ error: "El campo 'userId' es obligatorio" });
    }

    // Mapeo de los servicios a sus IDs
    const servicioMap = {
        "wifi": 1,
        "piscina": 2,
        "aireAcondicionado": 3,
        "tv": 4,
        "garaje": 5,
        "patio": 6
    };

    // Transformar los nombres de los servicios a sus IDs
    const servicios = caracteristicas ? caracteristicas.split(',').map(servicio => servicioMap[servicio]) : [];

    console.log('Datos recibidos:', { direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion });
    console.log('Servicios:', servicios);

    const sqlPropiedad = `
        INSERT INTO propiedades 
        (propietario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    conexion.query(sqlPropiedad, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion], (err, result) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).json({ error: 'Error en la consulta SQL', details: err.message });
        }

        const propiedadId = result.insertId;

        if (servicios.length > 0) {
            const sqlServicioPropiedad = "INSERT INTO propiedades_servicios (servicio_id, propiedad_id) VALUES (?, ?)";
            const ingresarServicios = servicios.map(servicio_id => {
                return new Promise((resolve, reject) => {
                    conexion.query(sqlServicioPropiedad, [servicio_id, propiedadId], (error, result) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result);
                    });
                });
            });

            Promise.all(ingresarServicios)
                .then(() => {
                    if (req.files && req.files.length > 0) {
                        const imagenesSubidas = req.files.map(file => ({
                            propiedadId: propiedadId,
                            imagenUrl: file.filename
                        }));

                        const sqlImagen = "INSERT INTO imagenes (propiedad_id, url) VALUES (?, ?)";

                        const promises = imagenesSubidas.map(imagen => {
                            return new Promise((resolve, reject) => {
                                conexion.query(sqlImagen, [imagen.propiedadId, imagen.imagenUrl], (err, result) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve(result);
                                });
                            });
                        });

                        Promise.all(promises)
                            .then(() => {
                                res.status(201).json({
                                    message: 'Propiedad e imágenes creadas con éxito',
                                    propiedadId: propiedadId,
                                    imagenes: imagenesSubidas.map(imagen => imagen.imagenUrl)
                                });
                            })
                            .catch(err => {
                                res.status(500).json({ error: 'Error al guardar las imágenes', details: err.message });
                            });
                    } else {
                        res.status(201).json({
                            message: 'Propiedad creada con éxito',
                            propiedadId: propiedadId
                        });
                    }
                })
                .catch(error => {
                    res.status(500).json({ error: 'Error al insertar servicios', details: error.message });
                });
        } else {
            res.status(201).json({
                message: 'Propiedad creada con éxito, pero sin servicios adicionales',
                propiedadId: propiedadId
            });
        }
    });
});

// Ruta para editar una propiedad existente
router.put('/', (req, res) => {
    const { propiedad_id } = req.query;
    console.log(req.body);
    
    if (!propiedad_id) {
        console.error('Propiedad ID no proporcionado');
        return res.status(400).json({ status: 'error', error: 'Propiedad ID no proporcionado' });
    }

    // Valida que todos los campos necesarios estén presentes
    const {direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion } = req.body;
    
    
    if ([direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion].some((field) => (field === undefined || field === null))) {
        console.error('Faltan campos obligatorios');
        return res.status(400).json({ status: 'error', error: 'Todos los campos son obligatorios' });
    }

    // Realiza la consulta para obtener el propietario de la propiedad
    const sql = "SELECT propietario_id FROM propiedades WHERE ID = ?";
    conexion.query(sql, [propiedad_id], (error, result) => {
        if (error) {
            console.error('Error en la base de datos:', error);
            return res.status(500).json({ status: 'error', error: 'Error en la base de datos' });
        }

        if (result.length === 0) {
            console.error('Propiedad no encontrada');
            return res.status(404).json({ status: 'error', error: 'Propiedad no encontrada' });
        }

        const user_id = result[0].propietario_id;
        console.log('ID del usuario autenticado:', req.user_id, 'ID del propietario:', user_id);

        if (req.user_id !== user_id) {
            console.error('No tienes permisos para modificar esta propiedad');
            return res.status(403).json({ status: 'error', error: 'No tienes permisos para modificar esta propiedad' });
        }

        // Si todos los campos están presentes, se actualiza
        const updateSql = "UPDATE propiedades SET direccion = ?, ciudad_id = ?, num_habitaciones = ?, num_banos = ?, capacidad = ?, tamano_m2 = ?, precio_renta = ?, tipo_id = ?, descripcion = ? WHERE ID = ?";
        const updateValues = [direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion, propiedad_id];
        
        conexion.query(updateSql, updateValues, (updateError, updateResult) => {
            if (updateError) {
                console.error('Error al actualizar la propiedad:', updateError);
                return res.status(500).json({ status: 'error', error: 'Error al actualizar la propiedad' });
            }

            res.json({ status: 'success', message: 'Propiedad actualizada correctamente' });
        });
    });
});

// Ruta para eliminar una propiedad
router.delete('/', (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID de propiedad no proporcionado' });
    }

    const imagenSQL = "SELECT url FROM imagenes WHERE propiedad_id = ?";
    const sql = 'DELETE FROM propiedades_servicios WHERE propiedad_id = ?';
    const sql2 = "DELETE FROM imagenes WHERE propiedad_id = ?";
    const sql3 = "DELETE FROM favoritos WHERE propiedad_id = ?";
    const sql4 = "DELETE FROM resenas WHERE propiedad_id = ?";
    const sql5 = "DELETE FROM propiedades WHERE id = ?";
    
    // Obtener las imágenes asociadas a la propiedad antes de eliminarla
    conexion.query(imagenSQL, [id], function (error, imagenes) {
        if (error) {
            console.error('Error al obtener las imágenes:', error);
            return res.status(500).json({ error: 'Error al obtener las imágenes' });
        }

        // Si existen imágenes, proceder a eliminarlas del sistema de archivos
        if (imagenes.length > 0) {
            imagenes.forEach(imagen => {
                const imagePath = path.join(__dirname, '..', 'uploads', imagen.url);
                console.log(`Intentando eliminar imagen en: ${imagePath}`);

                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Error al eliminar la imagen: ${imagePath} - Detalle: ${err.message}`);
                    } else {
                        console.log(`Imagen eliminada: ${imagePath}`);
                    }
                });
            });
        }

        // Eliminar las imágenes de la base de datos
        conexion.query(sql2, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar las imágenes de la base de datos:', err);
                return res.status(500).json({ error: 'Error al eliminar las imágenes de la base de datos' });
            }

            // Eliminar la propiedad de la tabla propiedades_servicios
            conexion.query(sql, [id], function(error, result) {
                if (error) {
                    console.error('Error al eliminar la propiedad de la tabla propiedades_servicios');
                    return res.status(406).json({ error: 'Error al eliminar la propiedad de la tabla propiedades_servicios' });
                }

                // Eliminar la propiedad de la tabla favoritos
                conexion.query(sql3, [id], function(error, result) {
                    if (error) {
                        console.error('Error al eliminar la propiedad de la tabla favoritos');
                        return res.status(503).json({ error: 'Error al eliminar la propiedad de la tabla favoritos' });
                    }

                    // Eliminar la propiedad de la tabla resenas
                    conexion.query(sql4, [id], function(error, result) {
                        if (error) {
                            console.error('Error al eliminar la propiedad de la tabla resenas');
                            return res.status(503).json({ error: 'Error al eliminar la propiedad de la tabla resenas' });
                        }

                        // Eliminar la propiedad de la tabla propiedades
                        conexion.query(sql5, [id], function (error, result) {
                            if (error) {
                                console.error('Error al eliminar la propiedad:', error);
                                return res.status(500).json({ error: 'Error al eliminar la propiedad' });
                            }

                            if (result.affectedRows === 0) {
                                return res.status(404).json({ message: 'Propiedad no encontrada' });
                            }

                            // Respuesta exitosa
                            res.json({ message: 'Propiedad eliminada con éxito' });
                        });
                    });
                });
            });
        });
    });
});

// Ruta para crear una reseña de una propiedad
router.post('/propiedad/resena', function (req, res) {
    const { propiedad_id } = req.query;
    const token = req.headers.authorization;
    const { comentario, puntuacion } = req.body;

    if (token === undefined || token === null) {
        console.error('sin token');
        return res.status(403).json({ status: 'error', error: 'sin token' });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = "INSERT INTO resenas (usuario_id, propiedad_id, comentario, valoracion) VALUES (?, ?, ?, ?)";

    conexion.query(sql, [usuario_id, propiedad_id, comentario, puntuacion], function (error, result) {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'error al crear la reseña' });
        }
        res.status(200).json({ message: 'reseña creada exitosamente', result });
    });
});

module.exports = router;
