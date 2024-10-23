const nodemailer = require('nodemailer');
const conexion = require('../db/conexion');
require('dotenv').config(); 

// Configurar nodemailer con las variables de entorno
const transporter = nodemailer.createTransport({
    service: 'Gmail',  
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "escapessouthern@gmail.com",  
        pass: "abdd ggvh obpc ekye"   
    }
});

// Función para enviar correos electrónicos
const enviarCorreo = (destinatarios, asunto, mensaje) => {
    return new Promise(async(resolve, reject) => {
        const mailOptions = {
            from: "Souther Scapes <escapessouthern@gmail.com>",  
            to: destinatarios,
            subject: asunto,
            text: mensaje
        };
        console.log(mailOptions)
        transporter.sendMail(mailOptions)
        .then((info) => {
            console.log(info)
            resolve()
        })
        .catch((error) => {
            console.error(error)
            reject(error)
        })
            /*if (error) {
                console.log('Error al enviar el correo: ', error);
                reject(error)
            } else {
                console.log('Correo enviado: ' + info.response);
                resolve()
            }
        });
            */
    })
    
};

// Función para obtener los correos del usuario y propietario
const obtenerCorreos = (propiedad_id, usuario_id) => {
    return new Promise((resolve, reject) => {
        const correoSql = `
            SELECT u1.correo AS correo_usuario, u2.correo AS correo_propietario
            FROM usuarios u1
            JOIN propiedades p ON p.id = ?
            JOIN usuarios u2 ON p.usuario_id = u2.id
            WHERE u1.id = ?`;

        conexion.query(correoSql, [propiedad_id, usuario_id], (error, correos) => {
            if (error) {
                console.log('Error al obtener correos: ', error);
                return reject(error); // Rechazar la promesa si hay un error
            } else if (correos.length > 0) {
                return resolve(correos[0]);  // Devuelve los correos en un objeto
            } else {
                return resolve(null); // Resolver con null si no se encontraron correos
            }
        });
    });
};

module.exports = { enviarCorreo, obtenerCorreos };
