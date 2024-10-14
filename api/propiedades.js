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
     const propiedad_id = 123;
     req.propiedad_id = propiedad_id;

     upload(req, res, (err)=>{
         if(err){
            return res.status(400).send("error subiendo imagenes")
         }
         const sql = "INSERT INTO fotos (propiedad_id, url) VALUES (?, ?)"
         
     })
})





module.exports = router