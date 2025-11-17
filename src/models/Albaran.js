// src/models/Albaran.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Pedido = require('./Pedido');

const Albaran = sequelize.define('Albaran', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serie: DataTypes.STRING(3),
  nalbaran: DataTypes.INTEGER,
  fecha: DataTypes.DATE,
  idcliente: DataTypes.INTEGER,
  idobra: DataTypes.INTEGER,
  pedidoId: {
  type: DataTypes.INTEGER,
  allowNull: true
  },
  nombrefiscal: DataTypes.STRING(150),
  nombrecomercial: DataTypes.STRING(150),
  direccion: DataTypes.STRING(150),
  codpostal: DataTypes.STRING(20),
  codprovincia: DataTypes.STRING(2),
  provincia: DataTypes.STRING(150),
  poblacion: DataTypes.STRING(150),
  cifnif: DataTypes.STRING(50),
  telefono: DataTypes.STRING(150),
  email: DataTypes.STRING(250),
  web: DataTypes.STRING(250),
  movil: DataTypes.STRING(150),
  contacto: DataTypes.STRING(150),
  cargocontacto: DataTypes.STRING(150),
  pais: DataTypes.STRING(150),
  observacion: DataTypes.STRING(500),
  observacion1: DataTypes.STRING(500),
  codigokaam: DataTypes.INTEGER,
  idcloud: DataTypes.STRING(100),
  coord_latitud: DataTypes.STRING(25),
  coord_longitud: DataTypes.STRING(25),
  idfa_cami: DataTypes.INTEGER,
  idfa_hoja: DataTypes.INTEGER,
  albaran_url: DataTypes.STRING(250),
  firma_url: DataTypes.STRING(250),
  firmante_descarga: DataTypes.STRING(125),
  firmante_dni: DataTypes.STRING(25),
  coment_descarga: DataTypes.STRING(250),
  fecha_descarga: DataTypes.DATE,
  etiquetas: DataTypes.INTEGER,
  etiquetas_descarga: DataTypes.INTEGER,
  codbar: DataTypes.STRING(13),
  coord_latitud_descarga: DataTypes.STRING(25),
  coord_longitud_descarga: DataTypes.STRING(25),

  // Relación con Pedido
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fa_pedidos',
      key: 'id'
    }
  }
}, {
  tableName: 'fa_albacli',
  timestamps: false
});

// RELACIÓN
Pedido.hasMany(Albaran, { foreignKey: 'pedidoId', as: 'albaranes' });
Albaran.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

module.exports = Albaran;
