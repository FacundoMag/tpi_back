const express = require('express');

const router = express.Router();
const { conexion } = require('../db/conexion'); 

// Ruta
router.post('/', async (req, res) => {
    const { alquiler_id, propiedad_id, monto_total, correo } = req.body;

    // Validar que todos los campos estén presentes
    if (!alquiler_id || !propiedad_id || !monto_total || !correo) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Guardar el recibo en la base de datos
    const sqlInsert = "INSERT INTO recibos (alquiler_id, propiedad_id, monto_total) VALUES (?, ?, ?)";
    conexion.query(sqlInsert, [alquiler_id, propiedad_id, monto_total], async (error, results) => {
        if (error) {
            console.error('Error al insertar el recibo:', error);
            return res.status(500).json({ message: 'Error al insertar el recibo.' });
        }

        // Enviar el recibo por correo electrónico
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: 'scapessouthern812@gmail.com',
                pass: 'escapesdelsur', 
            },
        });

        // Crear el contenido HTML del recibo
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recibo</title>
            <style>
                body { font-family: Arial, sans-serif; }
                h1 { color: #333; }
                p { margin: 5px 0; }
                .recibo { border: 1px solid #ccc; padding: 20px; }
            </style>
        </head>
        <body>
            <div class="recibo">
                <h1>Recibo de Alquiler</h1>
                <p><strong>ID del Alquiler:</strong> ${alquiler_id}</p>
                <p><strong>ID de la Propiedad:</strong> ${propiedad_id}</p>
                <p><strong>Monto Total:</strong> $${monto_total}</p>
                <p>Gracias por tu pago.</p>
            </div>
        </body>
        </html>`;

        // Configuración del correo
        const mailOptions = {
            from: 'scapessouthern812@gmail.com',
            to: correo, // correo del usuario
            subject: `Recibo #${alquiler_id}`,
            html: htmlContent,
        };

        // Enviar el correo
        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'Recibo enviado correctamente.' });
        } catch (error) {
            console.error('Error al enviar el recibo:', error);
            res.status(500).json({ message: 'Error al enviar el recibo.' });
        }
    });
});

module.exports = router;
