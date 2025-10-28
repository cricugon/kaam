const express = require('express');
const bcrypt = require('bcrypt');
const { ok, fail } = require('../helpers/responses');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const Usuario = require('../models/Usuario');

const router = express.Router();

// GET /api/usuarios
router.get('/', verifyToken, authorizeRoles('admin'), async (_req, res) => {
  try {
    const usuarios = await Usuario.findAll({ attributes: { exclude: ['password'] } });
    return ok(res, usuarios);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// POST /api/usuarios
router.post('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { username, email, password, rol = 'usuario', activo = 1 } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const nuevo = await Usuario.create({ username, email, password: hash, rol, activo });
    return ok(res, { id: nuevo.id, username, email, rol, activo }, 'Usuario creado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// PUT /api/usuarios/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Permitir que el propio usuario se actualice; otros campos solo admin
    if (req.user.rol !== 'admin' && Number(req.user.id) !== Number(id)) {
      return fail(res, 403, 'Permisos insuficientes');
    }

    const data = { ...req.body };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    await Usuario.update(data, { where: { id } });
    const actualizado = await Usuario.findByPk(id, { attributes: { exclude: ['password'] } });
    return ok(res, actualizado, 'Usuario actualizado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await Usuario.destroy({ where: { id } });
    return ok(res, null, 'Usuario eliminado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

module.exports = router;
