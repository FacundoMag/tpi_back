const express = require('express');
const router = express.Router();
const { obtenerReservaciones, crearReservacion, actualizarReservacion, eliminarReservacion } = require('./reservacion');

// Ruta para obtener todas las reservaciones
router.get('/', async (req, res) => {
  try {
      const reservaciones = await obtenerReservaciones();
      res.status(200).json(reservaciones);
  } catch (error) {
      res.status(500).json({ error: 'Error al obtener las reservaciones' });
  }
});

// Ruta para crear una nueva reservación
router.post('/', (req, res) => {
  const nuevaReservacion = req.body;
  crearReservacion(nuevaReservacion, (error, reservacionCreada) => {
    if (error) {
      return res.status(500).json({ error: 'Error al crear la reservación' });
    }
    res.status(201).json(reservacionCreada);
  });
});

// Ruta para actualizar una reservación por ID
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const datosActualizados = req.body;
  actualizarReservacion(id, datosActualizados, (error, resultado) => {
    if (error) {
      return res.status(500).json({ error: 'Error al actualizar la reservación' });
    }
    res.status(200).json({ message: 'Reservación actualizada correctamente' });
  });
});

// Ruta para eliminar una reservación por ID
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  eliminarReservacion(id, (error, resultado) => {
    if (error) {
      return res.status(500).json({ error: 'Error al eliminar la reservación' });
    }
    res.status(200).json({ message: 'Reservación eliminada correctamente' });
  });
});

module.exports = router;
