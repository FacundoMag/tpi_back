const mysql = require('mysql');

const conexion = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"tpi"
});

conexion.connect(function(error){
    if(error){
        console.error(error);
        return;
    }
    console.log("conexion exitosa a la base de datos")
})

module.exports = {conexion}