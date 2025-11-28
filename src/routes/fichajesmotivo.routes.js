// src/routes/fichajesmotivo.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const FichajeMotivo = require('../models/FichajeMotivo');

const router = express.Router();
const staff = ['admin', 'editor'];

// Listar todos
router.get('/', verifyToken, async (_req, res) => {
  try {
    const motivos = await FichajeMotivo.findAll({
      order: [
        ['orden', 'ASC'],
        ['id', 'ASC']
      ]
    });
    return ok(res, motivos);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear
router.post('/', verifyToken, authorizeRoles(...staff), async (req, res) => {
  try {
    const { nombre, orden = null, activo = 1 } = req.body || {};
    if (!nombre || !nombre.trim()) return fail(res, 400, 'El nombre es obligatorio');
    const nuevo = await FichajeMotivo.create({ nombre: nombre.trim(), orden, activo });
    return ok(res, nuevo, 'Motivo creado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar
router.put('/:id', verifyToken, authorizeRoles(...staff), async (req, res) => {
  try {
    const { id } = req.params;
    const motivo = await FichajeMotivo.findByPk(id);
    if (!motivo) return fail(res, 404, 'Motivo no encontrado');

    const payload = {
      nombre: req.body.nombre?.trim() ?? motivo.nombre,
      orden: req.body.orden ?? motivo.orden,
      activo: typeof req.body.activo === 'undefined' ? motivo.activo : req.body.activo
    };
    await FichajeMotivo.update(payload, { where: { id } });
    const actualizado = await FichajeMotivo.findByPk(id);
    return ok(res, actualizado, 'Motivo actualizado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar (solo admin)
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const deleted = await FichajeMotivo.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'Motivo no encontrado');
    return ok(res, null, 'Motivo eliminado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
