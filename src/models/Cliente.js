// src/models/Cliente.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Cliente = sequelize.define('Cliente', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombrefiscal: { type: DataTypes.STRING(150), allowNull: true },
  nombrecomercial: { type: DataTypes.STRING(150), allowNull: true },
  cifnif: { type: DataTypes.STRING(50), allowNull: true },
  pais: { type: DataTypes.STRING(150), allowNull: true },
  direccion: { type: DataTypes.STRING(150), allowNull: true },
  codpostal: { type: DataTypes.STRING(20), allowNull: true },
  codprovincia: { type: DataTypes.STRING(2), allowNull: true },
  provincia: { type: DataTypes.STRING(150), allowNull: true },
  poblacion: { type: DataTypes.STRING(150), allowNull: true },
  telefono: { type: DataTypes.STRING(150), allowNull: true },
  telefono2: { type: DataTypes.STRING(150), allowNull: true },
  fax: { type: DataTypes.STRING(150), allowNull: true },
  email: { type: DataTypes.STRING(250), allowNull: true },
  web: { type: DataTypes.STRING(250), allowNull: true },
  movil: { type: DataTypes.STRING(150), allowNull: true },
  contacto: { type: DataTypes.STRING(150), allowNull: true },
  cargocontacto: { type: DataTypes.STRING(150), allowNull: true },
  codigo: { type: DataTypes.INTEGER, allowNull: true },
  empresa: { type: DataTypes.INTEGER, allowNull: true },
  idcloud: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'fa_cliente',   // 👈 nombre real de la tabla
  timestamps: false
});

module.exports = Cliente;
