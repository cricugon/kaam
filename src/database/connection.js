const sequelize = require('./sequelize');

async function checkConnection() {
  await sequelize.authenticate();
  return true;
}

module.exports = { checkConnection, sequelize };
