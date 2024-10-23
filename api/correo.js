const nodemailer = require('nodemailer');
const conexion = require('../db/conexion');
require('dotenv').config(); 

// Configurar nodemailer con las variables de entorno
const transporter = nodemailer.createTransport({
    service: 'gmail',  // O el proveedor que estés usando
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS   
    }
});

// Función para enviar correos electrónicos
const enviarCorreo = (destinatarios, asunto, mensaje) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,  
        to: destinatarios.join(', '),  // Convertir array de correos a una cadena separada por comas
        subject: asunto,
        text: mensaje
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error al enviar el correo: ', error);
        } else {
            console.log('Correo enviado: ' + info.response);
        }
    });
};

// Función para obtener los correos del usuario y propietario
const obtenerCorreos = (propiedad_id, usuario_id, callback) => {
    const correoSql = `
        SELECT u1.correo AS correo_usuario, u2.correo AS correo_propietario
        FROM usuarios u1
        JOIN reservaciones r ON r.usuario_id = u1.id
        JOIN propiedades p ON p.id = r.propiedad_id
        JOIN usuarios u2 ON p.propietario_id = u2.id
        WHERE r.propiedad_id = ? AND u1.id = ?`;

    conexion.query(correoSql, [propiedad_id, usuario_id], (error, correos) => {
        if (error) {
            console.log('Error al obtener correos: ', error);
            callback(null);
        } else if (correos.length > 0) {
            callback(correos[0]);  // Devuelve los correos en un objeto
        } else {
            callback(null);
        }
    });
};

module.exports = { enviarCorreo, obtenerCorreos };
