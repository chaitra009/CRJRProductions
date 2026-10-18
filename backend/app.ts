import express, { Express } from 'express';
import { apiRouter } from './routes.js';

export function createBackendApp(): Express {
  const app = express();

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Generous limit for medical PDF scans and plate photos
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Mount routes on both /api and root / for flexible standalone or full-stack proxying
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}
