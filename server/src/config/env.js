const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habitmaster',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  corsOrigin: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

if (!env.jwtSecret) {
  if (env.isProduction) {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }
  env.jwtSecret = 'dev_only_insecure_secret';
  if (!env.isTest) {
    console.warn('[env] JWT_SECRET no definido; usando secreto inseguro de desarrollo');
  }
}

module.exports = env;
