// src/routes/pedidos.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');

const router = express.Router();

// Log para confirmar carga
console.log('🧾 Rutas de PEDIDOS cargadas');

/** 📋 GET /api/pedidos */
router.get('/', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { cliente } = req.query;
    const where = cliente ? { idcliente: cliente } : {};

    const pedidos = await Pedido.findAll({
      where,
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombrecomercial', 'telefono'] }],
      order: [['id', 'DESC']]
    });

    return ok(res, pedidos);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

/** 🔍 GET /api/pedidos/:id */
router.get('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombrecomercial'] }]
    });
    if (!pedido) return fail(res, 404, 'Pedido no encontrado');
    return ok(res, pedido);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

/** ➕ POST /api/pedidos */
/** Crear */
router.post('/', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { idcliente } = req.body;

    // ✅ Verificar que el cliente exista
    const cliente = await Cliente.findByPk(idcliente);
    if (!cliente) {
      return fail(res, 400, `El cliente con ID ${idcliente} no existe`);
    }

    // ✅ Crear pedido
    const nuevo = await Pedido.create(req.body);
    return ok(res, nuevo, 'Pedido creado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});


/** ✏️ PUT /api/pedidos/:id */
router.put('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    const [n] = await Pedido.update(req.body, { where: { id } });
    if (n === 0) return fail(res, 404, 'Pedido no encontrado o sin cambios');
    const pedido = await Pedido.findByPk(id);
    return ok(res, pedido, 'Pedido actualizado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

/** ❌ DELETE /api/pedidos/:id */
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const eliminado = await Pedido.destroy({ where: { id: req.params.id } });
    if (!eliminado) return fail(res, 404, 'Pedido no encontrado');
    return ok(res, null, 'Pedido eliminado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
