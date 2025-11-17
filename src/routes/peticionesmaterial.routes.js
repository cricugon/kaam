// src/routes/peticionesmaterial.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const PeticionMaterial = require('../models/PeticionMaterial');
const Material = require('../models/Material');
const Trabajador = require('../models/Trabajador');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];

// Listar todas
router.get('/', protect, async (_req, res) => {
  try {
    const items = await PeticionMaterial.findAll({
      order: [['id', 'DESC']],
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Obtener por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await PeticionMaterial.findByPk(req.params.id, {
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    if (!item) return fail(res, 404, 'Petición no encontrada');
    return ok(res, item);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});
const requireRelations = (body) => {
  if (!body.idfa_material) return 'Falta indicar el material (idfa_material)';
  if (!body.idpersonal) return 'Falta indicar el trabajador (idpersonal)';
  return null;
};
// Listar por trabajador
router.get('/trabajador/:id', protect, async (req, res) => {
  try {
    const items = await PeticionMaterial.findAll({
      where: { idpersonal: req.params.id },
      order: [['id', 'DESC']],
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear
router.post('/', protect, async (req, res) => {
  try {
    const relError = requireRelations(req.body);
    if (relError) return fail(res, 400, relError);

    const nuevo = await PeticionMaterial.create(req.body);
    return ok(res, nuevo, 'Petición de material creada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const current = await PeticionMaterial.findByPk(id);
    if (!current) return fail(res, 404, 'Petición no encontrada');

    const payload = { ...current.toJSON(), ...req.body };

    // no permitir validar si está anulada y no permitir anular si ya está validada
    if (payload.firmado && current.cancelada) return fail(res, 400, 'No puedes validar una petición anulada');
    if (payload.cancelada && current.firmado) return fail(res, 400, 'No puedes anular una petición ya validada');

    const relError = requireRelations(payload);
    if (relError) return fail(res, 400, relError);

    await PeticionMaterial.update(payload, { where: { id } });
    const item = await PeticionMaterial.findByPk(id, {
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    return ok(res, item, 'Petición de material actualizada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await PeticionMaterial.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'Petición no encontrada');
    return ok(res, null, 'Petición de material eliminada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
