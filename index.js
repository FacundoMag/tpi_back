const express = require('express');


const app = epxress();


const port = 6666;



app.use(express.json());


app.listen(port , ()=>{
    console.log(`ejecutando en el puerto ${port}`)
} )