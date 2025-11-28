const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Fichaje = require('./Fichaje');

const FichajePausa = sequelize.define('FichajePausa', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  idfichaje: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fin: { type: DataTypes.TIME, allowNull: true },
  motivo: { type: DataTypes.STRING(50), allowNull: true },

}, { tableName: 'fa_fichaje_pausa', timestamps: false });

FichajePausa.belongsTo(Fichaje, { foreignKey: 'idfichaje', as: 'fichaje' });
Fichaje.hasMany(FichajePausa, { foreignKey: 'idfichaje', as: 'pausas' });

module.exports = FichajePausa;
