const ok = (res, data = null, message = 'Operación completada') =>
  res.json({ success: true, message, data });

const fail = (res, status = 400, message = 'Petición inválida') =>
  res.status(status).json({ success: false, message });

module.exports = { ok, fail };
