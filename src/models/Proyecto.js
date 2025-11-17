// src/models/Proyecto.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const Cliente = require('./Cliente');

const Proyecto = sequelize.define('Proyecto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idcliente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fa_cliente',
      key: 'id'
    }
  },
  idkaam: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nombreproyecto: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  codigoproyecto: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  cifnif: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  pais: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  codpostal: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  codprovincia: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  provincia: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  poblacion: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  telefono2: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  fax: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(250),
    allowNull: true
  },
  web: {
    type: DataTypes.STRING(250),
    allowNull: true
  },
  movil: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  contacto: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  cargocontacto: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  codigo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  empresa: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idcloud: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  coord_latitud: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  coord_longitud: {
    type: DataTypes.STRING(25),
    allowNull: true
  }
}, {
  tableName: 'fa_proyecto',
  timestamps: false
});

// 🔗 Relaciones
Proyecto.belongsTo(Cliente, { foreignKey: 'idcliente', as: 'cliente' });
Cliente.hasMany(Proyecto, { foreignKey: 'idcliente', as: 'proyectos' });

module.exports = Proyecto;
