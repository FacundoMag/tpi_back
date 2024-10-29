const mysql = require('mysql');
require('dotenv').config();

const conexion = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

conexion.connect(function (error) {
    if (error) {
        console.error(error);
        return;
    }
    console.log("Conexión exitosa a la base de datos");
});

// Exportar la conexión correctamente
module.exports = conexion;
