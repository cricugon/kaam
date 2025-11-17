// src/routes/trabajadores.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Trabajador = require('../models/Trabajador');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];

// Listar todos
router.get('/', protect, async (_req, res) => {
  try {
    const items = await Trabajador.findAll({ order: [['id', 'DESC']] });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Obtener por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await Trabajador.findByPk(req.params.id);
    if (!item) return fail(res, 404, 'Trabajador no encontrado');
    return ok(res, item);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear
router.post('/', protect, async (req, res) => {
  try {
    const nuevo = await Trabajador.create(req.body);
    return ok(res, nuevo, 'Trabajador creado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Trabajador.update(req.body, { where: { id } });
    if (updated === 0) return fail(res, 404, 'Trabajador no encontrado o sin cambios');
    const item = await Trabajador.findByPk(id);
    return ok(res, item, 'Trabajador actualizado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Trabajador.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'Trabajador no encontrado');
    return ok(res, null, 'Trabajador eliminado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
