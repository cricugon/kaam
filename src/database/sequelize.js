const { Sequelize } = require('sequelize');
const { db } = require('../config/env');

const sequelize = new Sequelize(db.name, db.user, db.pass, {
  host: db.host,
  port: db.port,
  dialect: 'mysql', // compatible con MariaDB
  logging: false,
  define: {
    timestamps: false
  }
});

module.exports = sequelize;
