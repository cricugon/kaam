const jwt = require('jsonwebtoken');
const { auth } = require('../config/env');
const { fail } = require('../helpers/responses');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'Token requerido');

  try {
    const decoded = jwt.verify(token, auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return fail(res, 401, 'Token inválido o expirado');
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'No autenticado');
    if (!roles.includes(req.user.rol)) return fail(res, 403, 'Permisos insuficientes');
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };
