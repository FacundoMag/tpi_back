const express = require('express');
const multer = require('multer');
const router = express.Router();
const { conexion } = require('../db/conexion') 


const fotos = multer.diskStorage({
    destination: (req, file, cb )=>{
        cb(null, 'imagenes/');
    },
    filename: (req, file, cb)=>{
        const propiedad_id = req.propiedad_id;
        cb(null, `${propiedad_id} - ${file.originalname}`)
    }
});

const upload = multer({ fotos: fotos });

router.post('/', upload.array('imagenes', 10), (req, res, next) =>{
    
    const {nombre, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado_id, descripcion} = req.body;

   

     upload(req, res, (err)=>{
         if(err){
            return res.status(400).send("error subiendo imagenes")
         }
         const archivosSubidos = req.files.map(file => ({
            
            urlimagen: file.filename
         }))

         const sql = "INSERT INTO fotos (propiedad_id, url) VALUES (?, ?)";
         archivosSubidos.forEach(archivo => {
            conexion.query(sql, [])
         })
     })
})





module.exports = router