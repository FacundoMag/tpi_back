const mysql = require('mysql');

const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "southernescapes"
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
