const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const FichajeMotivo = sequelize.define('FichajeMotivo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  activo: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  orden: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'fa_fichaje_motivo',
  timestamps: false
});

module.exports = FichajeMotivo;
