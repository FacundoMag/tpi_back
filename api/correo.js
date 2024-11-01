const nodemailer = require('nodemailer');
const conexion = require('../db/conexion');
require('dotenv').config(); 

const TOKEN_SECRET = process.env.TOKEN_SECRET;

// Configurar nodemailer con las variables de entorno
const transporter = nodemailer.createTransport({
    service: 'Gmail',  
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS  
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
    })
    
};

// Función para obtener correos de propietario e inquilino
const obtenerCorreos = (inquilino_id, propietario_id) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u1.correo AS correo_inquilino, u2.correo AS correo_propietario 
            FROM usuarios u1, usuarios u2 
            WHERE u1.id = ? AND u2.id = ?`;
        
        conexion.query(sql, [inquilino_id, propietario_id], (err, result) => {
            if (err || result.length === 0) {
                return reject('Error al obtener correos');
            }
            // Destructura correctamente los correos
            const { correo_inquilino, correo_propietario } = result[0];
            resolve({ correo_inquilino, correo_propietario });
        });
    });
};

module.exports = { enviarCorreo, obtenerCorreos };
