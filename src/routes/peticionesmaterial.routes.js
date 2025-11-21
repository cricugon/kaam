// src/routes/peticionesmaterial.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const PeticionMaterial = require('../models/PeticionMaterial');
const Material = require('../models/Material');
const Trabajador = require('../models/Trabajador');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];
const workerProtect = [verifyToken]; // valida rol dentro de cada handler

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
// Listar por trabajador
router.get('/trabajador/:id', workerProtect, async (req, res) => {
  const isWorker = req.user.rol === 'trabajador';
  if (isWorker && String(req.user.idpersonal) !== req.params.id) {
    return fail(res, 403, 'No puedes ver peticiones de otro trabajador');
  }

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


// Obtener por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await PeticionMaterial.findByPk(req.params.id, {
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    if (!item) return fail(res, 404, 'PeticiÃ³n no encontrada');
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


// Crear
// Crear (admin/editor o trabajador para sÃ­ mismo)
router.post('/', verifyToken, async (req, res) => {
  try {

    const role = (req.user?.rol || '').toLowerCase();
    
    const isWorker = role === 'trabajador';
    if (!isWorker && !['admin', 'editor'].includes(role)) {
      return fail(res, 403, 'No tienes permisos suficientes');
    }
    if (isWorker) {
      req.body.idpersonal = req.user.idpersonal;
    }

    const relError = requireRelations(req.body);
    if (relError) return fail(res, 400, relError);

    const nuevo = await PeticionMaterial.create(req.body);
    return ok(res, nuevo, 'PeticiÃ³n de material creada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});


// Actualizar
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const current = await PeticionMaterial.findByPk(id);
    if (!current) return fail(res, 404, 'Petición no encontrada');

    const role = (req.user?.rol || '').toLowerCase();
    const isWorker = role === 'trabajador';

    // si es trabajador, sólo puede tocar sus peticiones
    if (isWorker && String(current.idpersonal) !== String(req.user.idpersonal)) {
      return fail(res, 403, 'No puedes modificar esta petición');
    }

    // si no es admin/editor ni trabajador, prohibido
    if (!isWorker && !['admin','editor'].includes(role)) {
      return fail(res, 403, 'No tienes permisos suficientes');
    }

    const payload = { ...current.toJSON(), ...req.body };

    // no permitir validar si estÃ¡ anulada y no permitir anular si ya estÃ¡ validada
    if (payload.firmado && current.cancelada) return fail(res, 400, 'No puedes validar una peticiÃ³n anulada');
    if (payload.cancelada && current.firmado) return fail(res, 400, 'No puedes anular una peticiÃ³n ya validada');

    const relError = requireRelations(payload);
    if (relError) return fail(res, 400, relError);

    await PeticionMaterial.update(payload, { where: { id } });
    const item = await PeticionMaterial.findByPk(id, {
      include: [
        { model: Material, as: 'material' },
        { model: Trabajador, as: 'trabajador' }
      ]
    });
    return ok(res, item, 'PeticiÃ³n de material actualizada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await PeticionMaterial.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'PeticiÃ³n no encontrada');
    return ok(res, null, 'PeticiÃ³n de material eliminada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;

