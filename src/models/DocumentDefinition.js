// src/models/DocumentDefinition.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const DocumentDefinition = sequelize.define('DocumentDefinition', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category: { type: DataTypes.STRING(120), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'document_definitions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = DocumentDefinition;
