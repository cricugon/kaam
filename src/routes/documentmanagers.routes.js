// src/routes/documentmanagers.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const DocumentManager = require('../models/DocumentManager');
const DocumentDefinition = require('../models/DocumentDefinition');
const DocumentItem = require('../models/DocumentItem');
const Cliente = require('../models/Cliente');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];

const managerIncludes = [
  { model: Cliente, as: 'cliente', attributes: ['id', 'nombrefiscal', 'nombrecomercial', 'cifnif'] },
  {
    model: DocumentItem,
    as: 'items',
    include: [{ model: DocumentDefinition, as: 'definition', attributes: ['id', 'category', 'title'] }],
    order: [['id', 'ASC']]
  }
];

// Listar gestores documentales
router.get('/', protect, async (_req, res) => {
  try {
    const managers = await DocumentManager.findAll({
      order: [['id', 'DESC']],
      include: managerIncludes
    });
    return ok(res, managers);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Obtener gestor por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const manager = await DocumentManager.findByPk(req.params.id, { include: managerIncludes });
    if (!manager) return fail(res, 404, 'Gestor documental no encontrado');
    return ok(res, manager);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear gestor y clonar definiciones activas
router.post('/', protect, async (req, res) => {
  try {
    const { client_id, name, status } = req.body;
    if (!client_id) return fail(res, 400, 'Falta client_id');

    const exists = await DocumentManager.findOne({ where: { client_id } });
    if (exists) return fail(res, 400, 'El cliente ya tiene un gestor documental');

    const manager = await DocumentManager.create({
      client_id,
      name: name || `Gestor documental ${client_id}`,
      status: status || 'active'
    });

    const definitions = await DocumentDefinition.findAll({ where: { is_active: true } });
    if (definitions.length) {
      const payload = definitions.map(def => ({
        document_manager_id: manager.id,
        document_definition_id: def.id,
        status: 'pending'
      }));
      await DocumentItem.bulkCreate(payload);
    }

    const full = await DocumentManager.findByPk(manager.id, { include: managerIncludes });
    return ok(res, full, 'Gestor documental creado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar gestor (nombre/estado)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {};
    if (req.body.name !== undefined) payload.name = req.body.name;
    if (req.body.status !== undefined) payload.status = req.body.status;

    if (Object.keys(payload).length === 0) return fail(res, 400, 'Nada que actualizar');

    const [n] = await DocumentManager.update(payload, { where: { id } });
    if (!n) return fail(res, 404, 'Gestor documental no encontrado');

    const manager = await DocumentManager.findByPk(id, { include: managerIncludes });
    return ok(res, manager, 'Gestor documental actualizado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Borrar gestor (y sus items)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    await DocumentItem.destroy({ where: { document_manager_id: id } });
    const deleted = await DocumentManager.destroy({ where: { id } });
    if (!deleted) return fail(res, 404, 'Gestor documental no encontrado');
    return ok(res, null, 'Gestor documental eliminado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Listar items de un gestor
router.get('/:id/items', protect, async (req, res) => {
  try {
    const items = await DocumentItem.findAll({
      where: { document_manager_id: req.params.id },
      include: [{ model: DocumentDefinition, as: 'definition', attributes: ['id', 'category', 'title'] }],
      order: [['id', 'ASC']]
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

module.exports = router;
