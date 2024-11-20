const express = require('express');
const router = express.Router();
const {verificarToken} = require('@damianegreco/hashpass');
require('dotenv').config();

const propiedadesRouter = require('./propiedades');

const userRouter = require('./user');

const reservacionRouter = require('./reservacion');

//const propPublicRouter = require('./public')


const TOKEN_SECRET = process.env.TOKEN_SECRET;



router.use('/propiedades', function(req, res, next) {
    // Permitir solicitudes GET sin token
    if (req.method === 'GET') {
        return next();
    }

    // Verificar token para otros métodos
    const token = req.headers.authorization;
    console.log('Token recibido:', token);  // Asegúrate de ver el token en los logs

    if (!token) {
        console.error('Sin token');
        return res.status(403).json({
            status: 'error',
            error: 'sin token'
        });
    }

    // Extraer el token si viene en el formato "Bearer <token>"
    const tokenParts = token.split(' ');
    const actualToken = tokenParts.length === 2 ? tokenParts[1] : token;
    
    const verificacionToken = verificarToken(actualToken, TOKEN_SECRET);

    if (verificacionToken?.data?.usuario_id !== undefined) {
        req.user_id = verificacionToken.data.usuario_id;  // Asigna usuario_id a req.user_id
        console.log('ID del usuario autenticado:', req.user_id);  // Muestra el ID para verificar
        next();
    } else {
        res.status(403).json({
            status: 'error',
            error: 'token incorrecto'
        });
    }
});


router.use('/reservacion', function(req, res, next){

    const token = req.headers.authorization;
     if(token === undefined || token === null){
         console.error('sin token');
         res.status(403).res.json({
             status: 'error', error: 'sin token'
         })
    } else{
         const verificacionToken = verificarToken(token, TOKEN_SECRET)
         if(verificacionToken?.data?.usuario_id !== undefined){
             next()
         } else{
             res.json({
                 status: 'error',
                 error: 'token incorrecto'
             })
         }
     }
})

router.use('/propiedades', propiedadesRouter)

router.use('/reservacion', reservacionRouter);

router.use('/user', userRouter);

router.use('/imagenes', express.static('./public/images') )

//router.use('/public', propPublicRouter)



module.exports = router