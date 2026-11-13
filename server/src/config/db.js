const mongoose = require('mongoose');
const env = require('./env');

async function connectDB(uri = env.mongodbUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  if (!env.isTest) {
    console.log(`[db] MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
  }
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, disconnectDB, isDBConnected };
