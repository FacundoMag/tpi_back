const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();


const fotos = multer.diskStorage({
    destination: (req, file, cb )=>{
        cb(null, '..imagenes/');
    },
    filename: (req, file, cb)=>{
        const propiedad_id = req.propiedad_id;
        cb(null, `${propiedad_id}-${file.originalname}`)
    }
});

const upload = multer({ fotos: fotos }).array('imagenes', 10);





module.exports = router