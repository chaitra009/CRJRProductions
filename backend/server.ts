import { createBackendApp } from './app.js';
import { BACKEND_PORT, firebaseConfig } from './config.js';
import { backendDb } from './db.js';

const app = createBackendApp();

async function startStandaloneBackend() {
  console.log('====================================================');
  console.log('  VitalPlate APAC Standalone Backend Server');
  console.log('====================================================');
  console.log(`[Config] Target Firestore DB: ${firebaseConfig.firestoreDatabaseId}`);
  console.log(`[Config] GCP Project ID:      ${firebaseConfig.projectId}`);

  // Test Firestore DB connection
  const dbStatus = await backendDb.testFirestore();
  console.log(`[Database Connection] Live Firestore: ${dbStatus.connected ? 'ONLINE' : 'FALLBACK/OFFLINE'} (${dbStatus.details})`);

  app.listen(BACKEND_PORT, '0.0.0.0', () => {
    console.log(`[Backend Active] Server listening on http://0.0.0.0:${BACKEND_PORT}`);
    console.log(`- Health Check:    http://0.0.0.0:${BACKEND_PORT}/api/health`);
    console.log(`- Database Status: http://0.0.0.0:${BACKEND_PORT}/api/db/status`);
    console.log(`- Architecture:    http://0.0.0.0:${BACKEND_PORT}/api/backend/architecture`);
    console.log('====================================================');
  });
}

startStandaloneBackend().catch((err) => {
  console.error('[Backend Fatal Error]:', err);
  process.exit(1);
});
