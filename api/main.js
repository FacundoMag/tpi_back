const router = require('express').Router();

const propiedadesRouter = require('./propiedades');
const reciboRouter = require('./recibo');
const reservacionRouter = require('./reservacion');
const userRouter = require('./user');




router.use('/propiedades', propiedadesRouter);
router.use('/recibo', reciboRouter);
router.use('/reservacion', reservacionRouter);
router.use('/user', userRouter);



module.exports = router