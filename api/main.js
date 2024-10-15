const router = require('express').Router();
const {verificarToken} = require('@damianegreco/hashpass');

const propiedadesRouter = require('./propiedades');
const reciboRouter = require('./recibo');
const reservacionRouter = require('./reservacion');
const userRouter = require('./user');

const TOKEN_SECRET = "EQUIPO_GOAT"




router.use('/propiedades', function(req, res, next){
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

});


router.use('/reservacion', function(req, res, next){
    const token = req.headers.authorization;
    if(token === undefined || token === null){
        console.error('sin token');
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

router.use('/recibo', function(req, res, next){
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
router.use('/recibo', reciboRouter);
router.use('/reservacion', reservacionRouter);
router.use('/user', userRouter);



module.exports = router