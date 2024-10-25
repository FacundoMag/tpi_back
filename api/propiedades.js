const express = require('express');
const router = express.Router();
const conexion = require('../db/conexion');
const multer = require('multer');
const { verificarToken } = require('@damianegreco/hashpass');

const TOKEN_SECRET = "EQUIPO_GOAT";


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



router.get('/', function(req, res, next){
    const sql = "SELECT imagenes.url, propiedades.precio_renta, propiedades.direccion, propiedades.num_habitaciones, propiedades.num_banos FROM propiedades JOIN imagenes ON propiedades.id = imagenes.propiedad_id";
    
    
    conexion.query(sql, function(err, result){
        if(err){
            return res.status(500).json({ error: err.message})
        }

        res.json(result)

    })
})


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
        res.json(results[0]); 
    });
});







router.get('/newpropiedad', function (req, res, next) {
    const ciudadesSQL = "SELECT id, nombre FROM ciudad";
    const tipoSQL = "SELECT id, nombre FROM tipo_propiedad";


    conexion.query(ciudadesSQL, function (err, ciudades) {
        if (err) {
            return res.status(500).json({ error: "no se encontro ninguna ciudad" })
        }

        conexion.query(tipoSQL, function (err, tipo_propiedad) {
            if (err) {
                return res.status(500).json({ error: "tipo de propiedad no encontrado" })
            }


            res.status(200).json({
                ciudades,
                tipo_propiedad
            })
        })

    })
})


router.post('/newpropiedad', upload, (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({
            status: 'error',
            error: "No tienes token"
        });
    }

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    const usuario_id = verificacionToken?.data?.usuario_id;

    const { nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion } = req.body;


    
    const sqlPropiedad = `INSERT INTO propiedades 
                         (usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion) 
                         VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    conexion.query(sqlPropiedad, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

            const propiedadId = result.insertId;

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
    
            } else {
                
                res.status(201).json({
                    message: 'Propiedad creada sin imagen',
                    propiedadId: propiedadId
                });
            }
        });
});


router.put('/edit', (req, res) => {
   const {propiedad_id} = req.query;
   const token = req.headers.authorization;
   if(!token || !propiedad_id){
    console.error('acceso denegado');
    return res.status(403).json({
        status: 'error',
        error: 'acceso denegado'
    })
   }

   const verificacionToken = verificarToken(token, TOKEN_SECRET);
   if(verificacionToken?.data?.usuario_id === undefined || verificacionToken?.data?.usuario_id === null){
    console.error('token invalido');
    return res.status(401).json({
        status: 'error',
        error: 'token invalido'
    })
   }

   const user_id = verificacionToken?.data?.usuario_id;
   const sql = "SELECT registra_usuario_id FROM propiedades WHERE id = ?";
   conexion.query(sql, [propiedad_id], function(error, result){

    if (error) {
        console.error(error);
        return res.status(500).json({
            status: 'error',
            error: 'Error en la base de datos'
        });
    }

    if (result.length === 0 || result[0].registra_usuario_id !== user_id){
        console.error('no tienes permisos de modiicar esta propiedad');
       return res.status(401).json({
           status: 'error',
           error: 'no tienes permisos de modificar esta propiedad'
       })
    }
    
    const {nombre, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion} = req.body;
    const sql2 = "UPDATE propiedades SET nombre = ?, num_habitaciones = ?, num_banos = ?, capacidad = ?, tamano_m2 = ?, precio_renta = ?, tipo_id = ?, descripcion = ? WHERE id = ?";
    conexion.query(sql2, [nombre, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, descripcion, propiedad_id, user_id], function(err, result){
        if (err){
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

// Eliminar una propiedad por ID
router.delete('/', (req, res) => {
    const { id } = req.query;
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
