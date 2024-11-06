const express = require('express')
const router = express.Router();
const {hashPass, verificarPass, generarToken, verificarToken} = require('@damianegreco/hashpass');
const conexion = require('../db/conexion');
require('dotenv').config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;




const checkUsuario = function(correo){
    return new Promise((resolve, reject)=>{
        const sql = "SELECT id FROM usuarios WHERE correo = ?"
        conexion.query(sql, [correo], function(error, result){
            if(error) return reject(error);
            if(result.length > 0 ) return reject("Correo ya registrado");
            return resolve();
        })
    })
}

const guardarUsuario = function(nombre, apellido, telefono, correo, contraseñaHasheada){
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO usuarios (nombre, apellido, telefono, correo, contraseña) VALUES (?, ?, ?, ?, ?)";
        conexion.query(sql, [nombre, apellido, telefono, correo, contraseñaHasheada], function(error, result){
            if(error) return reject(error);
            resolve(result.insertId);
        })

    })
}


router.post('/registrarse', function(req, res, next){
    const {nombre, apellido, telefono, correo, contraseña} = req.body;
    checkUsuario(correo)
    .then(()=>{
        const contraseñaHasheada = hashPass(contraseña);
        guardarUsuario(nombre, apellido, telefono, correo, contraseñaHasheada)
        .then((usuarios_id)=>{
           res.json({
            status: 'ok',
            usuarios_id
           }) 
        })  
    })
    .catch((error)=>{
        console.error(error);
        res.json({
            status: 'error', error 
        })
    })
})

router.post('/inicio_sesion', function(req, res, next){
    const { correo, contraseña } = req.body;
    const sql = "SELECT id, contraseña FROM usuarios WHERE correo = ?";
    conexion.query(sql, [correo], function(error, result){
        if(error){
            console.log(error)
            return res.json({status: 'error', error})
        } else{
            if(result.length === 0){
                console.error("El correo no existe");
                return res.json({status: 'error', error: "El correo no existe"})
            } else{
                if(verificarPass(contraseña, result[0].contraseña)){
                    const token = generarToken(TOKEN_SECRET, 6, {usuario_id: result[0].id, correo: correo})
                    console.log(token);
                    res.json({
                        status: 'ok',
                        token
                    })
                } else{
                    console.error("correo/contraseña incorrecto");
                    return res.json({status: 'error', error: "correo/contraseña incorrecto"})
                }
            }
        }
    })
})


router.put('/edit', function(req, res, next){
    const token = req.headers.authorization;
    if(!token){
        console.error('acceso denegado');
        res.status(403).res.json({
            status: 'error', error: 'acceso denegado'
        })
    } 

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if(verificacionToken?.data?.usuario_id === undefined){
            console.error('token invalido');
            return res.json({
                status: "error",
                error: "token invalido"
            })
    }

    

     const usuarioIdToken = verificacionToken?.data?.usuario_id;

        const {nombre, apellido, telefono, correo} = req.body;
    
        const sql = "UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id = ?";
        conexion.query(sql, [nombre, apellido, telefono, correo, usuarioIdToken], function(error, result){
            if(error){
                console.error(error);
                return res.status(500).send('ocurrio un error')
            }
            res.json({
                status: 'ok',
                message: 'datos actualizados correctamente'
            })
        })
    })

    router.post('/favoritos', (req, res) => {
        const { id, propiedad_id } = req.body; // `id` es el usuario que marca la propiedad como favorita
        const sql = 'INSERT INTO favoritos (usuario_id, propiedad_id) VALUES (?, ?)';
        conexion.query(sql, [id, propiedad_id], (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', error: 'Error al marcar como favorito' });
            }
            res.json({ status: 'ok', message: 'Propiedad marcada como favorita' });
        });
    });
    
    
    router.delete('/favoritos', (req, res) => {
        const { id, propiedad_id } = req.body;
        const sql = 'DELETE FROM favoritos WHERE usuario_id = ? AND propiedad_id = ?';
        conexion.query(sql, [id, propiedad_id], (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', error: 'Error al quitar de favoritos' });
            }
            res.json({ status: 'ok', message: 'Propiedad quitada de favoritos' });
        });
    });
    

    router.get('/favoritos', (req, res) => {
        const { id } = req.query;
        const sql = `
            SELECT propiedades.*
            FROM propiedades
            JOIN favoritos ON propiedades.id = favoritos.propiedad_id
            WHERE favoritos.usuario_id = ?
        `;
        conexion.query(sql, [id], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: 'error', error: 'Error al obtener favoritos' });
            }
            res.json({ status: 'ok', favoritos: results });
        });
    });
    
    

router.get('/mis_propiedades', function(req, res, next){
    const token = req.headers.authorization;
    if(!token || !id){
        console.error('acceso denegado');
        res.status(403).res.json({
            status: 'error', error: 'acceso denegado'
        })
    } 

    const verificacionToken = verificarToken(token, TOKEN_SECRET);
    if(verificacionToken?.data?.usuario_id === undefined){
            console.error('token invalido');
            return res.json({
                status: "error",
                error: "token invalido"
            })
    }

    const usuario_id = verificacionToken?.data?.usuario_id;
    const sql = "SELECT imagenes.url, propiedades.precio_renta, propiedades.direccion, propiedades.num_habitaciones, propiedades.num_banos FROM propiedades JOIN imagenes ON propiedades.id = imagenes.propiedad_id WHERE propiedades.propietario_id = ?";
    
    conexion.query(sql, [usuario_id], function(error, result){
        if (error){
             return res.status(400).json({
                error: "no tiene ninguna casa registrada"
             })
        }
        res.json({
            result
        })
    })
})


module.exports = router;