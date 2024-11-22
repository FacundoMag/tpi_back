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

const enviarCorreo = (destinatarios, asunto, mensaje, nombre, direccion, fecha_inicio, fecha_fin, monto_total) => {
    return new Promise(async(resolve, reject) => {
        const mailOptions = {
            from: "Southern Scapes <escapessouthern@gmail.com>",
            to: destinatarios,
            subject: asunto,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <div style="text-align: center; background-color: #4CAF50; color: white; padding: 10px; border-radius: 5px;">
                        <h1>${asunto}</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px;">
                        <p>Hola ${nombre},</p>
                        <p>${mensaje}</p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Dirección</th>
                                <td style="border: 1px solid #ddd; padding: 8px;">${direccion}</td>
                            </tr>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fecha</th>
                                <td style="border: 1px solid #ddd; padding: 8px;">${fecha_inicio} hasta ${fecha_fin}</td>
                            </tr>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Monto</th>
                                <td style="border: 1px solid #ddd; padding: 8px;">$${monto_total}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="text-align: center; padding: 10px; color: #888; margin-top: 20px;">
                        <p>© ${new Date().getFullYear()} Southern Scapes. Todos los derechos reservados.</p>
                    </div>
                </div>
            `
        };
        transporter.sendMail(mailOptions)
        .then((info) => {
            console.log(info);
            resolve();
        })
        .catch((error) => {
            console.error(error);
            reject(error);
        });
    });
};

// Función para obtener correos y nombres de propietario e inquilino
const obtenerCorreos = (inquilino_id, propietario_id) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u1.correo AS correo_inquilino, u1.nombre AS nombre_inquilino,
                   u2.correo AS correo_propietario, u2.nombre AS nombre_propietario
            FROM usuarios u1, usuarios u2
            WHERE u1.id = ? AND u2.id = ?`;

        conexion.query(sql, [inquilino_id, propietario_id], (err, result) => {
            if (err || result.length === 0) {
                return reject('Error al obtener correos y nombres');
            }
            // Destructura correctamente los correos y nombres
            const { correo_inquilino, nombre_inquilino, correo_propietario, nombre_propietario } = result[0];
            resolve({ correo_inquilino, nombre_inquilino, correo_propietario, nombre_propietario });
        });
    });
};

module.exports = { enviarCorreo, obtenerCorreos };
