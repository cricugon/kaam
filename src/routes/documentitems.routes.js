// src/routes/documentitems.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const DocumentItem = require('../models/DocumentItem');
const DocumentDefinition = require('../models/DocumentDefinition');
const DocumentManager = require('../models/DocumentManager');

const router = express.Router();
const adminOnly = [verifyToken, authorizeRoles('admin', 'editor')];

const itemInclude = [
  { model: DocumentDefinition, as: 'definition', attributes: ['id', 'category', 'title'] },
  { model: DocumentManager, as: 'manager', attributes: ['id', 'client_id', 'name', 'status'] }
];

// Obtener item
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const item = await DocumentItem.findByPk(req.params.id, { include: itemInclude });
    if (!item) return fail(res, 404, 'Documento no encontrado');
    return ok(res, item);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Listar items por gestor
router.get('/manager/:managerId', verifyToken, async (req, res) => {
  try {
    const items = await DocumentItem.findAll({
      where: { document_manager_id: req.params.managerId },
      include: [{ model: DocumentDefinition, as: 'definition', attributes: ['id', 'category', 'title'] }],
      order: [['id', 'ASC']]
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Subir/actualizar archivo (cliente)
router.put('/:id/upload', verifyToken, async (req, res) => {
  try {
    const { file_path, notes } = req.body;
    if (!file_path) return fail(res, 400, 'Falta file_path');

    const item = await DocumentItem.findByPk(req.params.id);
    if (!item) return fail(res, 404, 'Documento no encontrado');

    await item.update({
      file_path,
      notes: notes ?? item.notes,
      status: 'in_review',
      uploaded_by: req.user.id,
      uploaded_at: new Date()
    });

    const refreshed = await DocumentItem.findByPk(req.params.id, { include: itemInclude });
    return ok(res, refreshed, 'Documento enviado para revisión');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Revisar (validar/rechazar) por admin/editor
router.put('/:id/review', adminOnly, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['validated', 'rejected'];
    if (!allowed.includes(status)) {
      return fail(res, 400, `Estado no permitido. Usa: ${allowed.join(', ')}`);
    }

    const item = await DocumentItem.findByPk(req.params.id);
    if (!item) return fail(res, 404, 'Documento no encontrado');

    await item.update({
      status,
      notes: notes ?? item.notes,
      reviewed_by: req.user.id,
      reviewed_at: new Date()
    });

    const refreshed = await DocumentItem.findByPk(req.params.id, { include: itemInclude });
    return ok(res, refreshed, `Documento ${status}`);
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
