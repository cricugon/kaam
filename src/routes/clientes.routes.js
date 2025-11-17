// src/routes/clientes.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Cliente = require('../models/Cliente');
const { Op } = require('sequelize');

const router = express.Router();

/** Listar */
router.get('/', verifyToken, authorizeRoles('admin', 'editor'), async (_req, res) => {
  try {
    const clientes = await Cliente.findAll({ order: [['id', 'DESC']] });
    return ok(res, clientes);
  } catch (err) { return fail(res, 500, err.message); }
});
/** Buscar clientes por texto (para autocompletado) */
router.get('/buscar', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const texto = req.query.texto || "";

    const clientes = await Cliente.findAll({
      where: {
        nombrefiscal: { [Op.like]: `%${texto}%` }
      },
      limit: 20,
      order: [['nombrefiscal', 'ASC']]
    });

    return ok(res, clientes);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

/** Obtener por ID */
router.get('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return fail(res, 404, 'Cliente no encontrado');
    return ok(res, cliente);
  } catch (err) { return fail(res, 500, err.message); }
});

/** Crear */
router.post('/', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const nuevo = await Cliente.create(req.body);
    return ok(res, nuevo, 'Cliente creado correctamente');
  } catch (err) { return fail(res, 400, err.message); }
});

/** Actualizar */
router.put('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Actualizando cliente ID:', id);
    console.log('Body recibido:', req.body);

    const [n] = await Cliente.update(req.body, { where: { id } });
    console.log('Filas afectadas:', n);

    if (n === 0) return fail(res, 404, 'Cliente no encontrado o sin cambios');

    const cliente = await Cliente.findByPk(id);
    return ok(res, cliente, 'Cliente actualizado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});


/** Eliminar */
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const eliminado = await Cliente.destroy({ where: { id: req.params.id } });
    if (!eliminado) return fail(res, 404, 'Cliente no encontrado');
    return ok(res, null, 'Cliente eliminado correctamente');
  } catch (err) { return fail(res, 400, err.message); }
});

module.exports = router;
