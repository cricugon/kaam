// src/routes/materiales.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Material = require('../models/Material');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];
// Lectura disponible también para trabajadores
const readProtect = [verifyToken, authorizeRoles('admin', 'editor', 'trabajador')];
// GET /api/materiales (catálogo completo)
router.get('/', readProtect, async (_req, res) => {
  try {
    const materiales = await Material.findAll({ order: [['id', 'DESC']] });
    return ok(res, materiales);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// GET /api/materiales/:id
router.get('/:id', readProtect, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) return fail(res, 404, 'Material no encontrado');
    return ok(res, material);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});
// Crear
router.post('/', protect, async (req, res) => {
  try {
    const nuevo = await Material.create(req.body);
    return ok(res, nuevo, 'Material creado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Material.update(req.body, { where: { id } });
    if (updated === 0) return fail(res, 404, 'Material no encontrado o sin cambios');
    const item = await Material.findByPk(id);
    return ok(res, item, 'Material actualizado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Material.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'Material no encontrado');
    return ok(res, null, 'Material eliminado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
