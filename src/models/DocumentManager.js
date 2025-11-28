// src/models/DocumentManager.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Cliente = require('./Cliente');

const DocumentManager = sequelize.define('DocumentManager', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'active' },
}, {
  tableName: 'document_managers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

DocumentManager.belongsTo(Cliente, { foreignKey: 'client_id', as: 'cliente' });

module.exports = DocumentManager;
