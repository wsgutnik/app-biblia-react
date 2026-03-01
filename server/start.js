require('dotenv').config();

const { bootstrapDatabaseUrl } = require('./scripts/bootstrapDatabaseUrl');

async function startServer() {
  try {
    await bootstrapDatabaseUrl();
    require('./index');
  } catch (err) {
    console.error('Falha ao preparar DATABASE_URL para iniciar o servidor:', err.message);
    process.exit(1);
  }
}

startServer();
