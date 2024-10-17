const express = require('express')
const router = express.Router();
const {hashPass, verificarPass, generarToken, verificarToken} = require('@damianegreco/hashpass');
const {conexion} = require('../db/conexion')

const TOKEN_SECRET = "EQUIPO_GOAT"




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
    const {id} = req.query;
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

     const usuarioIdToken = verificacionToken?.data?.usuario_id;

        if(usuarioIdToken != id){
            return res.status(403).json({
                status: 'error',
                error: 'no tienes permisos para modificar este perfil'
            })
        }
        const {nombre, apellido, telefono, correo} = req.body;
    
        const sql = "UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, correo = ? WHERE id = ?";
        conexion.query(sql, [nombre, apellido, telefono, correo, id], function(error, result){
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

    






    // const consul = "SELECT * FROM usuarios WHERE id = ? OR token = ?";
    // conexion.query(consul, [id, token], function(error, result){
    //     if(error){
    //         console.error(error);
    //         return res.status(300).send('id no econtrado')
    //     } 
    //     console.log(result)
             
        
    // }
    // )

    


router.get('/mis_propiedades', function(req, res, next){

})


module.exports = router;