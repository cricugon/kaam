const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { auth } = require('./config/env');
const { verifyToken } = require('./middleware/auth');
const Usuario = require('./models/Usuario');
const modulesConfig = require('./config/modules');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const clientesRoutes = require('./routes/clientes.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const proyectosRoutes = require('./routes/proyectos.routes');
const albaranesRoutes = require('./routes/albaranes.routes');
const trabajadoresRoutes = require('./routes/trabajadores.routes');
const materialesRoutes = require('./routes/materiales.routes');
const peticionesMaterialRoutes = require('./routes/peticionesmaterial.routes'); // new
const fichajesRoutes = require('./routes/fichajes.routes');

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // debe ir antes de las rutas

// Comprueba si hay cookie JWT válida y coincide con BD
async function hasValidToken(req) {
  const token = req.cookies?.token;
  if (!token) return false;
  try {
    const payload = jwt.verify(token, auth.jwtSecret);
    const userDb = await Usuario.findByPk(payload.id);
    return !!(userDb && userDb.token === token && userDb.activo);
  } catch {
    return false;
  }
}

// Página por defecto: si hay sesión válida, va al dashboard
app.get('/', async (req, res) => {
  if (await hasValidToken(req)) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Endpoint para que el front sepa qué módulos mostrar (protegido)
app.get('/api/config/modules', verifyToken, (_req, res) =>
  res.json({ success: true, modules: modulesConfig })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
if (modulesConfig.clientes) app.use('/api/clientes', clientesRoutes);
if (modulesConfig.proyectos) app.use('/api/proyectos', proyectosRoutes);
if (modulesConfig.pedidos) {
  app.use('/api/pedidos', pedidosRoutes);
  app.use('/api/albaranes', albaranesRoutes);
}
if (modulesConfig.trabajadores) app.use('/api/trabajadores', trabajadoresRoutes);
if (modulesConfig.materiales) {
  app.use('/api/materiales', materialesRoutes);
  app.use('/api/peticiones-material', peticionesMaterialRoutes);
}
if (modulesConfig.fichajes) app.use('/api/fichajes', fichajesRoutes);
// Ruta de test
app.get('/health', (_req, res) => res.json({ ok: true }));

// Ruta protegida (solo si el token es válido)
app.get('/dashboard', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
app.get('/dashboard.html', verifyToken, (_req, res) => {
  // Asegura que la variante con .html también requiere sesión
  res.redirect('/dashboard');
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Logout: limpia cookie y marca token inválido en BD
app.get('/logout', async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, auth.jwtSecret);
      await Usuario.update(
        { token: null, datetoken: null },
        { where: { id: payload.id } }
      );
    } catch (err) {
      console.error('No se pudo invalidar el token en BD:', err.message);
    }
  }

  const clearOptsBase = {
    httpOnly: true,
    secure: false, // pon true si usas HTTPS
    sameSite: 'lax',
    path: '/',
  };
  const clearOptsWithDomain = {
    ...clearOptsBase,
    domain: req.hostname,
  };

  res.clearCookie('token', clearOptsBase);
  res.clearCookie('token', clearOptsWithDomain);
  res.clearCookie('token', { ...clearOptsBase, path: '/api/auth' });
  res.clearCookie('token', { ...clearOptsWithDomain, path: '/api/auth' });
  res.clearCookie('token', { ...clearOptsBase, path: '/api' });
  res.clearCookie('token', { ...clearOptsWithDomain, path: '/api' });

  res.cookie('token', '', {
    ...clearOptsBase,
    maxAge: 0,
    expires: new Date(0),
  });
  return res.redirect('/');
});

// Middleware final (404)
app.use(async (req, res) => {
  if (req.accepts('html') && (await hasValidToken(req))) {
    return res.redirect('/dashboard');
  }
  res.status(404).redirect('/');
});

module.exports = app;
