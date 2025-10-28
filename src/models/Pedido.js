// src/models/Pedido.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Cliente = require('./Cliente');

const Pedido = sequelize.define('Pedido', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serie_pedido: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  pedcli: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pedclili: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  npedido: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pedido: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  serie: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  nalbaran: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: true
  },
  idcliente: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'fa_cliente',
      key: 'id'
    }
  },
  idobra: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nombrefiscal: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  nombreobra: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  tajoyzona: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  kgpedidototal: {
    type: DataTypes.DOUBLE(12, 3),
    allowNull: true
  },
  kgpedido: {
    type: DataTypes.DOUBLE(12, 3),
    allowNull: true
  },
  kgmontados: {
    type: DataTypes.DOUBLE(12, 3),
    allowNull: true
  },
  kgpendientes: {
    type: DataTypes.DOUBLE(12, 3),
    allowNull: true
  },
  porc_computable: {
    type: DataTypes.DOUBLE(6, 2),
    allowNull: true
  },
  porc_nomontar: {
    type: DataTypes.DOUBLE(6, 2),
    allowNull: true
  },
  porc_pendiente: {
    type: DataTypes.DOUBLE(6, 2),
    allowNull: true
  },
  idcloud: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'fa_pedidos',
  timestamps: false
});

// 🔗 Relaciones
Pedido.belongsTo(Cliente, { foreignKey: 'idcliente', as: 'cliente' });
Cliente.hasMany(Pedido, { foreignKey: 'idcliente', as: 'pedidos' });

module.exports = Pedido;
