const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(150), allowNull: false },
  password: { type: DataTypes.STRING(128), allowNull: false },
  activo: { type: DataTypes.TINYINT, defaultValue: 1 },
  rol: { type: DataTypes.STRING(25), defaultValue: 'usuario' },
  idpersonal: { type: DataTypes.INTEGER, allowNull: true },
  idtransportista: { type: DataTypes.INTEGER, allowNull: true },
  token: { type: DataTypes.STRING(255), allowNull: true },
  datetoken: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'fa_usuarios',
  timestamps: false
});

module.exports = Usuario;
