const express = require('express');
const cors = require('cors')

const apiRouter = require('./api/main');

const app = express();


const port = 4001;



app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true}))

app.use('/api', apiRouter);



app.listen(port , ()=>{
    console.log(`ejecutando en el puerto ${port}`)
})