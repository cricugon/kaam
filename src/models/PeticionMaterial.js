// src/models/PeticionMaterial.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Material = require('./Material');
const Trabajador = require('./Trabajador');

const PeticionMaterial = sequelize.define('PeticionMaterial', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  descripcion: { type: DataTypes.STRING(100), allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  hora: { type: DataTypes.TIME, allowNull: true },
  idpersonal: { type: DataTypes.INTEGER, allowNull: false },      // FK -> Trabajador
  idfa_material: { type: DataTypes.INTEGER, allowNull: false },    // FK -> Material
  unidades: { type: DataTypes.BIGINT, allowNull: true },
  talla: { type: DataTypes.STRING(20), allowNull: true },
  enviado: { type: DataTypes.TINYINT, allowNull: true },
  recibido: { type: DataTypes.TINYINT, allowNull: true },
  firmado: { type: DataTypes.TINYINT, allowNull: true },
  firma: { type: DataTypes.STRING(250), allowNull: true },
  idcloud: { type: DataTypes.STRING(35), allowNull: true },
  cancelada: { type: DataTypes.TINYINT, allowNull: true }
}, {
  tableName: 'fa_peticion', // cambia si tu tabla usa otro nombre
  timestamps: false
});

// Relaciones
PeticionMaterial.belongsTo(Material, { foreignKey: 'idfa_material', as: 'material' });
PeticionMaterial.belongsTo(Trabajador, { foreignKey: 'idpersonal', as: 'trabajador' });

module.exports = PeticionMaterial;
