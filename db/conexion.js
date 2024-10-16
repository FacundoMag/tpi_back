const mysql = require('mysql');

const conexion = mysql.createConnection({
    host:"ctpoba.edu.ar",
    user:"maggerif",
    password:"46087297",
    database:"24_72_A"
});

conexion.connect(function(error){
    if(error){
        console.error(error);
        return;
    }
    console.log("conexion exitosa a la base de datos")
})

module.exports = {conexion}