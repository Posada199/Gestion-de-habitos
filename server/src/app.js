const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const apiRoutes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
if (env.corsOrigin.length) {
  app.use(cors({ origin: env.corsOrigin }));
}
if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}
app.use(express.json({ limit: '10kb' }));

app.use('/api', apiRoutes);
app.use('/api', notFound);

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
