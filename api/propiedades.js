const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

// Obtener todas las propiedades
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM propiedades';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Obtener una propiedad por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM propiedades WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }
    res.json(results[0]);
  });
});

// Crear una nueva propiedad
router.post('/newpropiedad', (req, res) => {
  const { usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion } = req.body;
  const sql = `INSERT INTO propiedades 
              (usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Propiedad creada con éxito', propiedadId: result.insertId });
  });
});

// Actualizar una propiedad por ID
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion } = req.body;
  const sql = `UPDATE propiedades SET usuario_id = ?, direccion = ?, ciudad_id = ?, num_habitaciones = ?, num_banos = ?, capacidad = ?, tamano_m2 = ?, precio_renta = ?, tipo_id = ?, estado = ?, descripcion = ?
              WHERE id = ?`;
  db.query(sql, [usuario_id, direccion, ciudad_id, num_habitaciones, num_banos, capacidad, tamano_m2, precio_renta, tipo_id, estado, descripcion, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }
    res.json({ message: 'Propiedad actualizada con éxito' });
  });
});

// Eliminar una propiedad por ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM propiedades WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }
    res.json({ message: 'Propiedad eliminada con éxito' });
  });
});

module.exports = router;
