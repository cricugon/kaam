// src/routes/proyectos.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Proyecto = require('../models/Proyecto');
const Cliente = require('../models/Cliente');

const router = express.Router();

/** Listar todos los proyectos */
router.get('/', verifyToken, authorizeRoles('admin', 'editor'), async (_req, res) => {
  try {
    const proyectos = await Proyecto.findAll({
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombrefiscal'] }],
      order: [['id', 'DESC']]
    });
    return ok(res, proyectos);
  } catch (err) { return fail(res, 500, err.message); }
});

/** Obtener proyecto por ID */
router.get('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const proyecto = await Proyecto.findByPk(req.params.id, {
      include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nombrefiscal'] }]
    });
    if (!proyecto) return fail(res, 404, 'Proyecto no encontrado');
    return ok(res, proyecto);
  } catch (err) { return fail(res, 500, err.message); }
});

/** Crear nuevo proyecto */
router.post('/', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { idcliente } = req.body;
    const cliente = await Cliente.findByPk(idcliente);
    if (!cliente) return fail(res, 400, 'El cliente especificado no existe');

    const nuevo = await Proyecto.create(req.body);
    return ok(res, nuevo, 'Proyecto creado correctamente');
  } catch (err) { return fail(res, 400, err.message); }
});

/** Actualizar proyecto */
router.put('/:id', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const [n] = await Proyecto.update(req.body, { where: { id: req.params.id } });
    if (n === 0) return fail(res, 404, 'Proyecto no encontrado o sin cambios');
    const actualizado = await Proyecto.findByPk(req.params.id);
    return ok(res, actualizado, 'Proyecto actualizado correctamente');
  } catch (err) { return fail(res, 400, err.message); }
});

/** Eliminar proyecto */
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const eliminado = await Proyecto.destroy({ where: { id: req.params.id } });
    if (!eliminado) return fail(res, 404, 'Proyecto no encontrado');
    return ok(res, null, 'Proyecto eliminado correctamente');
  } catch (err) { return fail(res, 400, err.message); }
});
/** Listar proyectos por cliente */
router.get('/cliente/:idcliente', verifyToken, authorizeRoles('admin', 'editor'), async (req, res) => {
  try {
    const { idcliente } = req.params;

    const proyectos = await Proyecto.findAll({
      where: { idcliente },
      order: [['id', 'DESC']],
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombrefiscal'] }
      ]
    });

    if (!proyectos || proyectos.length === 0)
      return fail(res, 404, 'No se encontraron proyectos para este cliente');

    return ok(res, proyectos);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});


module.exports = router;
