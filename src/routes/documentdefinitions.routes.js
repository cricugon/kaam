// src/routes/documentdefinitions.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const DocumentDefinition = require('../models/DocumentDefinition');
const DocumentItem = require('../models/DocumentItem');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];

// Listar definiciones (catálogo maestro)
router.get('/', protect, async (_req, res) => {
  try {
    const defs = await DocumentDefinition.findAll({
      order: [
        ['category', 'ASC'],
        ['title', 'ASC']
      ]
    });
    return ok(res, defs);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear definición
router.post('/', protect, async (req, res) => {
  try {
    const { category, title } = req.body;
    if (!category || !title) return fail(res, 400, 'Faltan category y title');
    const def = await DocumentDefinition.create(req.body);
    return ok(res, def, 'Definición creada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar definición
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const [n] = await DocumentDefinition.update(req.body, { where: { id } });
    if (!n) return fail(res, 404, 'Definición no encontrada');
    const def = await DocumentDefinition.findByPk(id);
    return ok(res, def, 'Definición actualizada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar definición (solo si no tiene instancias creadas)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const usages = await DocumentItem.count({ where: { document_definition_id: id } });
    if (usages > 0) {
      return fail(res, 400, 'No se puede eliminar: hay documentos creados con esta definición');
    }
    const deleted = await DocumentDefinition.destroy({ where: { id } });
    if (!deleted) return fail(res, 404, 'Definición no encontrada');
    return ok(res, null, 'Definición eliminada');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
