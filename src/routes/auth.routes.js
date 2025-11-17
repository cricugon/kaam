const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { auth } = require('../config/env');
const { ok, fail } = require('../helpers/responses');
const Usuario = require('../models/Usuario');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Usuario.findOne({ where: { username } });
    if (!user || !user.activo) return fail(res, 401, 'Credenciales no válidas');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, 401, 'Credenciales no válidas');

    const payload = { id: user.id, username: user.username, rol: user.rol };
    const token = jwt.sign(payload, auth.jwtSecret, { expiresIn: auth.jwtExpires });

    // Opcional: persistir token y fecha (tu tabla ya dispone de campos)
    await Usuario.update({ token, datetoken: new Date() }, { where: { id: user.id } });
    res.cookie('token', token, {
      httpOnly: true,   // No accesible desde JS
      secure: false,    // true si usas HTTPS
      sameSite: 'lax',
      path: '/',        // disponible en toda la app
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    return ok(res, { token, user: payload }, 'Login correcto');
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

module.exports = router;
