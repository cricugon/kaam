// src/models/DocumentItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const DocumentManager = require('./DocumentManager');
const DocumentDefinition = require('./DocumentDefinition');

const DocumentItem = sequelize.define('DocumentItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  document_manager_id: { type: DataTypes.INTEGER, allowNull: false },
  document_definition_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pending' },
  file_path: { type: DataTypes.STRING(500) },
  uploaded_by: { type: DataTypes.INTEGER },
  uploaded_at: { type: DataTypes.DATE },
  reviewed_by: { type: DataTypes.INTEGER },
  reviewed_at: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'document_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

DocumentItem.belongsTo(DocumentManager, { foreignKey: 'document_manager_id', as: 'manager' });
DocumentItem.belongsTo(DocumentDefinition, { foreignKey: 'document_definition_id', as: 'definition' });
DocumentManager.hasMany(DocumentItem, { foreignKey: 'document_manager_id', as: 'items' });
DocumentDefinition.hasMany(DocumentItem, { foreignKey: 'document_definition_id', as: 'items' });

module.exports = DocumentItem;
