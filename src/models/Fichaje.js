// src/models/Fichaje.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Trabajador = require('./Trabajador');
const Cliente = require('./Cliente');
const Proyecto = require('./Proyecto');

const Fichaje = sequelize.define('Fichaje', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idpersonal: { type: DataTypes.INTEGER, allowNull: false },          // FK -> Trabajador
  descripcion: { type: DataTypes.STRING(150), allowNull: true },
  coord_latitud: { type: DataTypes.STRING(25), allowNull: true },
  coord_longitud: { type: DataTypes.STRING(25), allowNull: true },
  idcliente: { type: DataTypes.INTEGER, allowNull: true },            // FK -> Cliente
  idobra: { type: DataTypes.INTEGER, allowNull: true },               // FK -> Proyecto
  idfa_horar: { type: DataTypes.INTEGER, allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  hora_inicio: { type: DataTypes.TIME, allowNull: true },
  hora_fin: { type: DataTypes.TIME, allowNull: true },
  iniciada: { type: DataTypes.TINYINT, allowNull: true },
  segundos: { type: DataTypes.INTEGER, allowNull: true },
  minutos: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
  horas: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
  segundos_informe: { type: DataTypes.INTEGER, allowNull: true },
  horas_informe: { type: DataTypes.INTEGER, allowNull: true },
  minutos_informe: { type: DataTypes.INTEGER, allowNull: true },
  localizacion_error: { type: DataTypes.TINYINT, allowNull: true },
  localizacion_error_fin: { type: DataTypes.TINYINT, allowNull: true },
  idcloud: { type: DataTypes.STRING(35), allowNull: true },
  coord_latitud_fin: { type: DataTypes.STRING(25), allowNull: true },
  coord_longitud_fin: { type: DataTypes.STRING(25), allowNull: true }
}, {
  tableName: 'fa_fichaje',
  timestamps: false
});

Fichaje.belongsTo(Trabajador, { foreignKey: 'idpersonal', as: 'trabajador' });
Trabajador.hasMany(Fichaje, { foreignKey: 'idpersonal', as: 'fichajes' });

Fichaje.belongsTo(Cliente, { foreignKey: 'idcliente', as: 'cliente' });
Cliente.hasMany(Fichaje, { foreignKey: 'idcliente', as: 'fichajes' });

Fichaje.belongsTo(Proyecto, { foreignKey: 'idobra', as: 'obra' });
Proyecto.hasMany(Fichaje, { foreignKey: 'idobra', as: 'fichajes' });

module.exports = Fichaje;
