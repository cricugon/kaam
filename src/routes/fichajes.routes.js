// src/routes/fichajes.routes.js
const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { ok, fail } = require('../helpers/responses');
const Fichaje = require('../models/Fichaje');
const Trabajador = require('../models/Trabajador');
const Cliente = require('../models/Cliente');
const Proyecto = require('../models/Proyecto');

const router = express.Router();
const protect = [verifyToken, authorizeRoles('admin', 'editor')];
const workerProtect = [verifyToken]; // el handler valida el rol manualmente
const staffRoles = ['admin', 'editor'];
const dayjs = require('dayjs');            // si no lo usas aún, instala e importa
const FichajePausa = require('../models/FichajePausa');
const includeModels = [
  { model: Trabajador, as: 'trabajador' },
  { model: Cliente, as: 'cliente' },
  { model: Proyecto, as: 'obra' },
  { model: FichajePausa, as: 'pausas' }          // NUEVO
];

const ensureRelations = async (body) => {
  if (!body.idpersonal) return 'Falta indicar el trabajador (idpersonal)';
  if (!await Trabajador.findByPk(body.idpersonal)) return 'El trabajador indicado no existe';
  if (body.idcliente && !await Cliente.findByPk(body.idcliente)) return 'El cliente indicado no existe';
  if (body.idobra && !await Proyecto.findByPk(body.idobra)) return 'La obra indicada no existe';
  return null;
};

const findActiveFichaje = async (idpersonal) =>
  Fichaje.findOne({
    where: { idpersonal, hora_fin: null },
    order: [['id', 'DESC']],
    include: includeModels
  });

const workerAuth = [verifyToken]; // handler valida rol trabajador
router.get('/trabajador/:id/activo', verifyToken, async (req, res) => {
  const role = (req.user?.rol || '').toLowerCase();
  const workerId = req.params.id;

  if (role === 'trabajador' && String(req.user.idpersonal) !== workerId) {
    return fail(res, 403, 'No puedes consultar fichajes de otro trabajador');
  }
  if (!staffRoles.includes(role) && role !== 'trabajador') {
    return fail(res, 403, 'No tienes permisos suficientes');
  }

  try {
    const activo = await findActiveFichaje(workerId);
    return ok(res, activo || null);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});
router.post('/iniciar', verifyToken, async (req, res) => {
  try {
    const role = (req.user?.rol || '').toLowerCase();
    if (role !== 'trabajador') return fail(res, 403, 'Sólo los trabajadores pueden iniciar fichajes');

    const idpersonal = req.user.idpersonal;
    if (!idpersonal) return fail(res, 400, 'Tu usuario no está vinculado a un trabajador');

    const activo = await findActiveFichaje(idpersonal);
    if (activo) return fail(res, 400, 'Ya tienes un fichaje en curso');

    const payload = {
      idpersonal,
      descripcion: 'Trabajo',
      fecha: req.body.fecha || dayjs().format('YYYY-MM-DD'),
      hora_inicio: req.body.hora_inicio || dayjs().format('HH:mm:ss'),
      idcliente: req.body.idcliente || null,
      idobra: req.body.idobra || null,
      coord_latitud: req.body.coord_latitud || null,
      coord_longitud: req.body.coord_longitud || null
    };

    const relError = await ensureRelations(payload);
    if (relError) return fail(res, 400, relError);

    const nuevo = await Fichaje.create(payload);
    const item = await Fichaje.findByPk(nuevo.id, { include: includeModels });
    return ok(res, item, 'Fichaje iniciado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});
router.post('/pausar', verifyToken, async (req, res) => {
  try {
    const role = (req.user?.rol || '').toLowerCase();
    if (role !== 'trabajador') return fail(res, 403, 'Sólo el trabajador puede pausar su fichaje');

    const activo = await findActiveFichaje(req.user.idpersonal);
    if (!activo) return fail(res, 400, 'No hay fichaje activo para pausar');

    const pausaAbierta = activo.pausas?.find(p => !p.hora_fin);
    if (pausaAbierta) return fail(res, 400, 'Ya existe una pausa activa');

    const motivo = (req.body?.motivo || '').trim() || 'Pausa';
    if (motivo.toLowerCase() === 'trabajo')
      return fail(res, 400, 'La pausa no puede ser de tipo Trabajo');

    const pausa = await FichajePausa.create({
      idfichaje: activo.id,
      fecha: dayjs().format('YYYY-MM-DD'),
      hora_inicio: dayjs().format('HH:mm:ss'),
      motivo
    });


    return ok(res, pausa, 'Fichaje pausado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});
router.post('/reanudar', verifyToken, async (req, res) => {
  try {
    const role = (req.user?.rol || '').toLowerCase();
    if (role !== 'trabajador') return fail(res, 403, 'Sólo el trabajador puede reanudar');

    const activo = await findActiveFichaje(req.user.idpersonal);
    if (!activo) return fail(res, 400, 'No hay fichaje activo');

    const pausaActiva = activo.pausas?.find(p => !p.hora_fin);
    if (!pausaActiva) return fail(res, 400, 'No hay pausa activa');

    const horaFin = dayjs().format('HH:mm:ss');
    await FichajePausa.update({ hora_fin: horaFin }, { where: { id: pausaActiva.id } });

    const pausaActualizada = await FichajePausa.findByPk(pausaActiva.id);
    const duracionSegundos = dayjs(`${pausaActualizada.fecha} ${pausaActualizada.hora_fin}`)
      .diff(dayjs(`${pausaActualizada.fecha} ${pausaActualizada.hora_inicio}`), 'second');

    return ok(res, { ...pausaActualizada.toJSON(), segundos: duracionSegundos }, 'Fichaje reanudado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});
router.post('/parar', verifyToken, async (req, res) => {
  try {
    const role = (req.user?.rol || '').toLowerCase();
    if (role !== 'trabajador') return fail(res, 403, 'Sólo el trabajador puede parar su fichaje');

    const activo = await findActiveFichaje(req.user.idpersonal);
    if (!activo) return fail(res, 400, 'No hay fichaje activo');

    const now = dayjs();
    const horaFin = req.body?.hora_fin || now.format('HH:mm:ss');

    // Cierra pausa abierta si existe
    const pausaActiva = activo.pausas?.find(p => !p.hora_fin);
    if (pausaActiva) {
      
      await FichajePausa.update(
        { hora_fin: horaFin },
        { where: { id: pausaActiva.id } }
      );
    }
    const { coord_latitud_fin = null, coord_longitud_fin = null } = req.body || {};

    await Fichaje.update(
      
      { hora_fin: horaFin,
        coord_latitud_fin,
        coord_longitud_fin
      },
      { where: { id: activo.id } }
    );

    const finalizado = await Fichaje.findByPk(activo.id, { include: includeModels });
    return ok(res, finalizado, 'Fichaje finalizado');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Listar todos los fichajes (admin/editor)
router.get('/', protect, async (_req, res) => {
  try {
    const items = await Fichaje.findAll({
      order: [['id', 'DESC']],
      include: includeModels
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Listar fichajes por trabajador
router.get('/trabajador/:id', workerProtect, async (req, res) => {
  const role = (req.user?.rol || '').toLowerCase();
  const isWorker = role === 'trabajador';

  if (!isWorker && !staffRoles.includes(role)) {
    return fail(res, 403, 'No tienes permisos suficientes');
  }

  if (isWorker && String(req.user.idpersonal) !== req.params.id) {
    return fail(res, 403, 'No puedes ver fichajes de otro trabajador');
  }

  try {
    const items = await Fichaje.findAll({
      where: { idpersonal: req.params.id },
      order: [['id', 'DESC']],
      include: includeModels
    });
    return ok(res, items);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Obtener un fichaje por ID
router.get('/:id', workerProtect, async (req, res) => {
  try {
    const item = await Fichaje.findByPk(req.params.id, { include: includeModels });
    if (!item) return fail(res, 404, 'Fichaje no encontrado');
    return ok(res, item);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// Crear un fichaje (trabajador sólo para sí mismo)
router.post('/', verifyToken, async (req, res) => {
  try {
    const role = (req.user?.rol || '').toLowerCase();
    const isWorker = role === 'trabajador';

    if (!isWorker && !staffRoles.includes(role)) {
      return fail(res, 403, 'No tienes permisos suficientes');
    }
    if (isWorker) {
      req.body.idpersonal = req.user.idpersonal;
    }

    const relError = await ensureRelations(req.body);
    if (relError) return fail(res, 400, relError);

    const nuevo = await Fichaje.create(req.body);
    const item = await Fichaje.findByPk(nuevo.id, { include: includeModels });
    return ok(res, item, 'Fichaje registrado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Actualizar un fichaje
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const current = await Fichaje.findByPk(id);
    if (!current) return fail(res, 404, 'Fichaje no encontrado');

    const role = (req.user?.rol || '').toLowerCase();
    const isWorker = role === 'trabajador';

    if (isWorker && String(current.idpersonal) !== String(req.user.idpersonal)) {
      return fail(res, 403, 'No puedes modificar este fichaje');
    }
    if (!isWorker && !staffRoles.includes(role)) {
      return fail(res, 403, 'No tienes permisos suficientes');
    }

    const payload = { ...current.toJSON(), ...req.body };
    const relError = await ensureRelations(payload);
    if (relError) return fail(res, 400, relError);

    await Fichaje.update(payload, { where: { id } });
    const item = await Fichaje.findByPk(id, { include: includeModels });
    return ok(res, item, 'Fichaje actualizado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});

// Eliminar un fichaje (admin/editor)
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Fichaje.destroy({ where: { id: req.params.id } });
    if (!deleted) return fail(res, 404, 'Fichaje no encontrado');
    return ok(res, null, 'Fichaje eliminado correctamente');
  } catch (err) {
    return fail(res, 400, err.message);
  }
});


const computeWorkedSeconds = (fichaje) => {
  if (!fichaje.hora_inicio) return 0;
  const start = dayjs(`${fichaje.fecha} ${fichaje.hora_inicio}`);
  const end = fichaje.hora_fin ? dayjs(`${fichaje.fecha} ${fichaje.hora_fin}`) : dayjs();
  let total = end.diff(start, 'second');
  (fichaje.pausas || []).forEach(p => {
    if (!p.hora_inicio || !p.hora_fin) return;
    const pauseStart = dayjs(`${p.fecha || fichaje.fecha} ${p.hora_inicio}`);
    const pauseEnd = dayjs(`${p.fecha || fichaje.fecha} ${p.hora_fin}`);
    total -= Math.max(0, pauseEnd.diff(pauseStart, 'second'));
  });
  return Math.max(0, total);
};
module.exports = router;
