// src/models/Material.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Material = sequelize.define('Material', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  descripcion: { type: DataTypes.STRING(100), allowNull: true },
  idcloud: { type: DataTypes.STRING(35), allowNull: true }
}, {
  tableName: 'fa_material',
  timestamps: false
});

module.exports = Material;
