const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('[db] No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] HabitMaster escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
