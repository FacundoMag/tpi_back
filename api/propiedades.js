const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const multer = require('multer');
const path = require('path');
const fs = require('fs')
const { verificarToken } = require('@damianegreco/hashpass');
require('dotenv').config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage }).array('imagen', 10);

router.get('/', function (req, res, next) {
    const sql = "SELECT propiedades.id, imagenes.url, propiedades.precio_renta, propiedades.direccion, propiedades.num_habitaciones, propiedades.num_banos FROM propiedades JOIN imagenes ON propiedades.id = imagenes.propiedad_id  ";

    conexion.query(sql, function (err, propiedadesConimg) {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        res.json({
            propiedadesConimg
        })
    })
})

router.get('/buscador', function (req, res, next) {
    const { precio, baños, habitaciones, capacidad, ciudad, tipo_propiedad } = req.query;
    let sql = "SELECT ciudades.nombre AS ciudades, tipo_de_propiedad.nombre AS tipo_de_propiedad, imagenes.url, propiedades.precio_renta, propiedades.capacidad, propiedades.direccion, propiedades.num_habitaciones, propiedades.num_banos FROM propiedades JOIN imagenes ON propiedades.id = imagenes.propiedad_id JOIN ciudades ON propiedades.ciudad_id = ciudades.id JOIN tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id WHERE ";

    const filtros = [];
    if (precio) {
        sql += "propiedades.precio_renta > ?";
        filtros.push(precio);
    }
    if (baños) {
        sql += " propiedades.num_banos = ?";
        filtros.push(baños);
    }
    if (habitaciones) {
        sql += " propiedades.num_habitaciones = ?";
        filtros.push(habitaciones);
    }
    if (capacidad) {
        sql += " propiedades.capacidad = ?";
        filtros.push(capacidad);
    }
    if (ciudad) {
        sql += " ciudades.nombre LIKE ?";
        filtros.push(`%${ciudad}%`);
    }
    if (tipo_propiedad) {
        sql += " tipo_de_propiedad.nombre LIKE ?";
        filtros.push(`%${tipo_propiedad}%`);
    }

    console.log(filtros)

    conexion.query(sql, [filtros], function (error, result) {
        if (error) {
            console.log(error)
            return res.status(500).json({
                error: "error al realizar la busqueda"
            })
        }
        res.json({
            result
        })
    })
})

router.get('/propiedad', (req, res) => {
    const { id } = req.query;
    const sql = "SELECT  propiedades.direccion, ciudad.nombre AS ciudad, propiedades.num_habitaciones, propiedades.num_banos, propiedades.capacidad, propiedades.tamano_m2, propiedades.precio_renta, tipo_de_propiedad.nombre AS tipo_de_propiedad, propiedades.descripcion FROM propiedades JOIN ciudad ON propiedades.ciudad_id = ciudad.id JOIN tipo_de_propiedad ON propiedades.tipo_id = tipo_de_propiedad.id  WHERE propiedades.id = ?";
    const sql2 = "SELECT url FROM imagenes WHERE propiedad_id = ?";
    const sql3 = "SELECT usuarios.nombre AS usuarios, usuarios.apellido AS usuarios, resena.comentario, resena.valoracion FROM resenas JOIN usuarios ON resenas.usuario_id = usuarios.id WHERE resena.propiedad_id = ?";
    conexion.query(sql, [id], function (error, propiedad) {
        if (error) {
            return res.status(403).json({
                error: 'error al cargar la propiedad'
            })
        }
        conexion.query(sql2, [id], function (error, urls) {
            if (error) {
                return res.status(403).json({
                    error: 'erro al cargar las urls'
                })
            }
            conexion.query(sql3, [id], function (error, reseñas) {
                if (error) {
                    return res.status(401).json({
                        error: 'error al cargar las reseñas'
                    })
                }
                res.json({
                    propiedad,
                    urls,
                    reseñas
                })
            })
        })
    })
});

router.get('/', function (req, res, next) {
    const ciudadesSQL = "SELECT id, nombre FROM ciudad";
    const tipoSQL = "SELECT id, nombre FROM tipo_propiedad";
    const servicioSQL = "SELECT id, servicio FROM servicios";
    conexion.query(ciudadesSQL, function (err, ciudades) {
        if (err) {
            return res.status(500).json({ error: "no se encontro ninguna ciudad" })
        }
        conexion.query(tipoSQL, function (error, tipo_propiedades) {
            if (error) {
                return res.status(500).json({
                    error: "no se encontro ningun tipo de propiedad"
                })
            }
            conexion.query(servicioSQL, function (error, servicios) {
                if (error) {
                    return res.status(500).json({
                        error: "no se encontro ningun servicio"
                    })
                }
                res.json({
                    ciudades,
                    tipo_propiedades
                })
            })
        })
    })
})

router.post('/', upload, (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({
            status: 'error',
            error: "No tienes token"
        });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id


    const { direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion } = req.body;
    const servicios = req.body.servicios;
    const serviciosSeleccionados = Array.isArray(servicios) ? servicios : [];
    const serviciosString = serviciosSeleccionados.join('.');

    const sqlPropiedad = `INSERT INTO propiedades 
                         (propietario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion) 
                         VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    conexion.query(sqlPropiedad, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }


        const sqlServicioPropiedad = "INSERT INTO propiedades_servicios (servicio_id, propiedad_id) VALUES (?, ?);"

        const propiedadId = result.insertId;

        if (serviciosSeleccionados.length > 0) {
            const ingresarServicios = serviciosSeleccionados.map(servicio_id => {
                return new Promise((resolve, reject) => {
                    conexion.query(sqlServicioPropiedad, [servicio_id, propiedadId], function (error, result) {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result)
                    })

                })
            })

            Promise.all(ingresarServicios)
            .then(results => {
               
                console.log("Todos los servicios fueron insertados correctamente:", results);
                res.status(200).json({ message: "Servicios insertados correctamente" });
            })
            .catch(error => {
            
                console.error("Error al insertar servicios:", error);
                res.status(500).json({ error: "Error al insertar servicios" });
            });

        }

        if (req.files && req.files.length > 0) {

            const imagenesSubidas = req.files.map(file => ({
                propiedadId: propiedadId,
                imagenUrl: file.filename
            }));

            const sqlImagen = `INSERT INTO imagenes (propiedad_id, url) VALUES (?, ?)`;



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
                    res.status(500).json({ error: 'Error al guardar las imágenes: ' + err.message });
                });

        }
    });
});



router.put('/', (req, res) => {
    const { propiedad_id } = req.query;
    const token = req.headers.authorization;
    if (!token || !propiedad_id) {
        console.error('acceso denegado');
        return res.status(403).json({
            status: 'error',
            error: 'acceso denegado'
        })
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if (verificacionToken?.data?.usuario_id === undefined || verificacionToken?.data?.usuario_id === null) {
        console.error('token invalido');
        return res.status(401).json({
            status: 'error',
            error: 'token invalido'
        })
    }

    const user_id = verificacionToken?.data?.usuario_id;
    const sql = "SELECT propietario_id FROM propiedades WHERE id = ?";
    conexion.query(sql, [propiedad_id], function (error, result) {

        if (error) {
            console.error(error);
            return res.status(500).json({
                status: 'error',
                error: 'Error en la base de datos'
            });
        }

        if (result.length === 0 || result[0].registra_usuario_id !== user_id) {
            console.error('no tienes permisos de modiicar esta propiedad');
            return res.status(401).json({
                status: 'error',
                error: 'no tienes permisos de modificar esta propiedad'
            })
        }

        const { num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion } = req.body;
        const sql2 = "UPDATE propiedades SET  num_habitaciones = ?, num_banos = ?, capacidad = ?, tamano_m2 = ?, precio_renta = ?, tipo_id = ?, descripcion = ? WHERE id = ?";
        conexion.query(sql2, [num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion, propiedad_id, user_id], function (err, result) {
            if (err) {
                console.error(err);
                return res.status(403).json({
                    status: 'error',
                    error: 'error al actualizar los datos'
                })
            }

            return res.json({
                status: 'ok',
                message: 'datos actualizados correctamente'
            })
        })
    })

});



router.delete('/', (req, res) => {
    const { id } = req.query;
    const imagenSQL = "SELECT url FROM imagenes WHERE propiedad_id = ?";
    const sql = 'DELETE FROM propiedades WHERE id = ?';
    const sql2 = "DELETE FROM imagenes WHERE propiedad_id = ?";

    conexion.query(imagenSQL, [id], function (error, imagenes) {
        if (error) {
            return res.status(500).json({
                error: error.message
            })
        }

        if (imagenes.length > 0) {
            imagenes.forEach(imagen => {

                const imagePath = path.join(__dirname, '..', 'uploads', imagen.url);
                console.log(imagePath);

                console.log(`Intentando eliminar imagen en: ${imagePath}`);

                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Error al eliminar la imagen: ${imagePath} - Detalle: ${err.message}`);
                    }
                    else {
                        console.log('imagen eliminada: ${imagePath}');
                    }
                })
            })
        }

        conexion.query(sql2, [id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: err.message });
            }
            conexion.query(sql, [id], function (error, result) {
                if (error) {
                    return res.status(400).json({
                        error: 'propiedad no encontrada'
                    })
                }
                res.json({ message: 'Propiedad eliminada con éxito' });
            })
        });
    })

});

router.post('/propiedad/reseña', function (req, res, next) {
    const { propiedad_id } = req.query;
    const token = req.headers.authorization;
    const { comentario, puntuacion } = req.body;

    if (token === undefined || token === null) {
        console.error('sin token');
        res.status(403).res.json({
            status: 'error', error: 'sin token'
        })
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = "INSERT INTO resenas (usuario_id, propiedad_id, comentario, valoracion) VALUES (?, ?, ?, ?)";

    conexion.query(sql, [usuario_id, propiedad_id, comentario, puntuacion], function (error, result) {
        if (error) {
            return res.status(500).json({
                error: 'error al crear la reseña'
            })
        }
        res.status(200).json({
            message: 'reseña creada exitosamente',
            result
        })
    })




})

module.exports = router;
