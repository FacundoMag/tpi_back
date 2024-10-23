const express = require('express');

const apiRouter = require('./api/main');

const app = express();


const port = 4001;



app.use(express.json());
app.use(express.urlencoded({ extended: true}))

app.use('/api', apiRouter);



app.listen(port , ()=>{
    console.log(`ejecutando en el puerto ${port}`)
})