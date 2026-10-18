import { createServer as createViteServer } from 'vite';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createBackendApp } from './backend/app.js';
import { backendDb } from './backend/db.js';
import { firebaseConfig } from './backend/config.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize the backend application resource
const app = createBackendApp();

// Mount Vite in development or static assets in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  console.log(`[Backend DB Engine] Target Firestore DB: ${firebaseConfig.firestoreDatabaseId}`);
  const dbStatus = await backendDb.testFirestore();
  console.log(`[Backend DB Engine] Firestore Status: ${dbStatus.connected ? 'ONLINE' : 'FALLBACK'} (${dbStatus.details})`);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VitalPlate Full-Stack Application listening on http://0.0.0.0:${PORT}`);
    console.log(`- Backend API Gateway: http://0.0.0.0:${PORT}/api/health`);
    console.log(`- Firestore Status:    http://0.0.0.0:${PORT}/api/db/status`);
    console.log(`- Standalone command:  npm run backend (runs backend/server.ts separately)`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Startup Error]:', err);
  process.exit(1);
});
