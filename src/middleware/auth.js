const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { fail } = require('../helpers/responses');
const { auth } = require('../config/env');

// Valida JWT y que coincida con el token guardado en BD
function verifyToken(req, res, next) {
  const token =
    req.cookies?.token ||
    (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!token) {
    if (req.accepts('html')) return res.redirect('/');
    return fail(res, 401, 'Token no proporcionado');
  }

  jwt.verify(token, auth.jwtSecret, async (err, payload) => {
    if (err) {
      if (req.accepts('html')) return res.redirect('/');
      return fail(res, 403, 'Token inválido o expirado');
    }

    try {
      const userDb = await Usuario.findByPk(payload.id);
      const tokenMatch = userDb?.token === token;
      const active = userDb?.activo;

      if (!userDb || !tokenMatch || !active) {
        // Limpia cookie si no es válido o está desactivado
        res.clearCookie('token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });
        if (req.accepts('html')) return res.redirect('/');
        return fail(res, 403, 'Token inválido');
      }

      req.user = payload;
      next();
    } catch (dbErr) {
      return fail(res, 500, 'Error validando sesión');
    }
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 403, 'Usuario no autenticado');
    if (!roles.includes(req.user.rol))
      return fail(res, 403, 'No tienes permisos suficientes');
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };
