const express = require('express');
const router = express.Router();

const Pedido = require('../models/Pedido');
const Albaran = require('../models/Albaran');

/**
 * Crear un albarán desde un pedido
 * Copiando SOLO los campos relevantes del pedido
 */
router.post('/', async (req, res) => {
  try {
    const { pedidoId } = req.body;

    // 1) Buscar el pedido
    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // 2) Crear nuevo albarán copiando campos del pedido
    const albaran = await Albaran.create({
      serie: pedido.serie,
      nalbaran: pedido.nalbaran,   // RELACIÓN REAL
      fecha: new Date(),
      pedidoId: pedido.id,
      idcliente: pedido.idcliente,
      idobra: pedido.idobra,
      nombrefiscal: pedido.nombrefiscal,
      nombrecomercial: pedido.nombreobra,
      direccion: null,              // o vacío si lo quieres
      codpostal: null,
      codprovincia: null,
      provincia: null,
      poblacion: null,

      cifnif: null,
      telefono: null,
      email: null,
      web: null,
      movil: null,

      contacto: null,
      cargocontacto: null,
      pais: null,

      observacion: null,
      observacion1: null,

      idcloud: pedido.idcloud,
      codigokaam: null,

      coord_latitud: null,
      coord_longitud: null,

      idfa_cami: null,
      idfa_hoja: null,

      albaran_url: null,
      firma_url: null,
      firmante_descarga: null,
      firmante_dni: null,
      coment_descarga: null,
      fecha_descarga: null,

      etiquetas: null,
      etiquetas_descarga: null,
      codbar: null,
      coord_latitud_descarga: null,
      coord_longitud_descarga: null
    });

    return res.json({ ok: true, albaran });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear albarán' });
  }
});

/**
 * Obtener todos los albaranes de un pedido
 */
router.get('/pedido/:pedidoId', async (req, res) => {
  try {
    const { pedidoId } = req.params;

    const albaranes = await Albaran.findAll({
      where: { pedidoId },
      order: [['fecha', 'DESC']]
    });

    return res.json({ ok: true, albaranes });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error obteniendo albaranes' });
  }
});

/**
 * Obtener un albarán por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const albaran = await Albaran.findByPk(req.params.id);

    if (!albaran) {
      return res.status(404).json({ error: 'Albarán no encontrado' });
    }

    return res.json({ ok: true, albaran });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener el albarán' });
  }
});

/**
 * Editar un albarán
 */
router.put('/:id', async (req, res) => {
  try {
    const albaran = await Albaran.findByPk(req.params.id);

    if (!albaran) {
      return res.status(404).json({ error: 'Albarán no encontrado' });
    }

    await albaran.update(req.body);

    return res.json({ ok: true, albaran });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error actualizando albarán' });
  }
});

/**
 * Eliminar un albarán
 */
router.delete('/:id', async (req, res) => {
  try {
    const albaran = await Albaran.findByPk(req.params.id);

    if (!albaran) {
      return res.status(404).json({ error: 'Albarán no encontrado' });
    }

    await albaran.destroy();

    return res.json({ ok: true, msg: 'Albarán eliminado' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error eliminando albarán' });
  }
});


module.exports = router;
