const { port } = require('./config/env');
const app = require('./app');
const { checkConnection } = require('./database/connection');

(async () => {
  try {
    await checkConnection();
    app.listen(port, () => console.log(`API ERP-Kaam escuchando en :${port}`));
  } catch (err) {
    console.error('Error iniciando servidor:');
    console.error(err); // 👈 muestra el error completo (stack + detalles)
    process.exit(1);
  }
})();
