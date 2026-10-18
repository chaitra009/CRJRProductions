import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbManager } from './server/db.js';
import {
  parseClinicalLab,
  auditHomeCookedPlate,
  calculateIngredientSwap,
  generateAudioBriefing,
  reindexMealQueue,
} from './server/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Generous body parsing limits for high-resolution lab report panels and plate photos
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// ==================== HEALTH & ARCHITECTURE INSPECTION ====================

app.get('/api/health', (req: Request, res: Response) => {
  const households = dbManager.listHouseholds();
  const users = dbManager.listUsers();
  const patients = dbManager.listPatients();
  const meals = dbManager.listMeals();
  const plateAudits = dbManager.listPlateAudits();

  res.json({
    status: 'online',
    service: 'VitalPlate APAC Unified Full-Stack Backend',
    pythonVersion: 'Node.js ' + process.version,
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    firestoreProjectId: process.env.FIREBASE_PROJECT_ID || 'crjrproductions',
    firestoreDatabaseId: 'ai-studio-remixvitalplatec',
    stats: {
      householdsCount: households.length,
      usersCount: users.length,
      patientsCount: patients.length,
      mealsCount: meals.length,
      plateAuditsCount: plateAudits.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/backend/architecture', (req: Request, res: Response) => {
  res.json({
    architecture: 'Unified High-Performance Node.js & Vite Full-Stack Engine',
    modules: [
      {
        name: 'AI Intelligence Engine (server/ai.ts)',
        framework: 'Google GenAI SDK (@google/genai)',
        capabilities: [
          'Multimodal Clinical Lab Panel Parsing (Biomarkers, Reference Ranges)',
          'Visual Plate Adherence Auditing (1-10 Oil Sheen, Macro Distribution)',
          'Voice-First Ingredient Swap Reasoning (Clinical Guardrails)',
          'Delta-Only Spoken Kitchen Audio Briefings (8 Asian Dialects/Languages)',
          'Clinical Re-Indexing of Weekly Meal Queues',
        ],
      },
      {
        name: 'Database & Business Logic Layer (server/db.ts)',
        framework: 'Firestore Sync + Local JSON Persistence Cache (.backend_db.json)',
        entities: [
          'Households (Family Home Code system, memberIds array)',
          'Users (Multi-Role RBAC: Admin, Caregiver, Cook, Dietitian, Patient)',
          'Patients (Clinical condition phenotypes, texture needs, sodium/GI limits)',
          'Biomarkers (Quantitative clinical values, status, timestamps)',
          'Meal Plans (Delta directives, approval workflow: DRAFT -> APPROVED)',
          'Plate Audits (Adherence tier, oil observation, feedback in dialect)',
          'Grocery Inventory (Clinical reasoning for pantry staples)',
        ],
      },
      {
        name: 'API Service Gateway (server.ts)',
        framework: 'Express.js HTTP Server on Port 3000',
        endpoints: [
          '/api/health',
          '/api/backend/architecture',
          '/api/parse-lab',
          '/api/audit-plate',
          '/api/ingredient-swap',
          '/api/audio-briefing',
          '/api/reindex-meals',
          '/api/households',
          '/api/users',
          '/api/patients',
          '/api/biomarkers',
          '/api/meals',
          '/api/plate-audits',
          '/api/grocery',
          '/api/seed',
        ],
      },
    ],
    frontendIntegration: 'Direct HTTP REST APIs with instantaneous response times',
  });
});

// ==================== AI ENDPOINTS ====================

app.post('/api/parse-lab', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, textContent } = req.body;
    const data = await parseClinicalLab({ imageBase64, mimeType, textContent });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /api/parse-lab Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audit-plate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, patientProfile, plannedMealName } = req.body;
    const data = await auditHomeCookedPlate({
      imageBase64,
      mimeType,
      patientProfile,
      plannedMealName,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /api/audit-plate Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ingredient-swap', async (req: Request, res: Response) => {
  try {
    const { missingIngredient, dishName, cuisine, clinicalConstraints, dialect } = req.body;
    const data = await calculateIngredientSwap({
      missingIngredient,
      dishName,
      cuisine,
      clinicalConstraints,
      dialect,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /api/ingredient-swap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audio-briefing', async (req: Request, res: Response) => {
  try {
    const { mealName, cuisine, deltaInstructions, dialect, voiceName } = req.body;
    const data = await generateAudioBriefing({
      mealName,
      cuisine,
      deltaInstructions,
      dialect,
      voiceName,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /api/audio-briefing Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reindex-meals', async (req: Request, res: Response) => {
  try {
    const { guardrails, currentMeals, patientProfiles } = req.body;
    const data = await reindexMealQueue({
      guardrails,
      currentMeals,
      patientProfiles,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /api/reindex-meals Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== HOUSEHOLDS ====================

app.get('/api/households', (req: Request, res: Response) => {
  res.json({ success: true, data: dbManager.listHouseholds() });
});

app.post('/api/households', (req: Request, res: Response) => {
  const record = dbManager.saveHousehold(req.body);
  res.json({ success: true, data: record });
});

app.get('/api/households/:idOrCode', (req: Request, res: Response) => {
  const param = req.params.idOrCode;
  let hh = dbManager.getHousehold(param);
  if (!hh) {
    hh = dbManager.getHouseholdByCode(param);
  }
  if (!hh) {
    return res.status(404).json({ success: false, error: 'Household not found' });
  }
  res.json({ success: true, data: hh });
});

// ==================== USERS ====================

app.get('/api/users', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listUsers(householdId) });
});

app.post('/api/users', (req: Request, res: Response) => {
  const user = dbManager.saveUser(req.body);
  res.json({ success: true, data: user });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  const deleted = dbManager.deleteUser(req.params.id, householdId);
  res.json({ success: deleted });
});

// ==================== PATIENTS & BIOMARKERS ====================

app.get('/api/patients', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listPatients(householdId) });
});

app.post('/api/patients', (req: Request, res: Response) => {
  const patient = dbManager.savePatient(req.body);
  res.json({ success: true, data: patient });
});

app.get('/api/biomarkers', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listBiomarkers(patientId, householdId) });
});

app.post('/api/biomarkers', (req: Request, res: Response) => {
  const biomarker = dbManager.saveBiomarker(req.body);
  res.json({ success: true, data: biomarker });
});

// ==================== MEALS & AUDITS ====================

app.get('/api/meals', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listMeals(householdId) });
});

app.post('/api/meals', (req: Request, res: Response) => {
  const meal = dbManager.saveMeal(req.body);
  res.json({ success: true, data: meal });
});

app.patch('/api/meals/:id/status', (req: Request, res: Response) => {
  const { status, notes, reviewer } = req.body;
  const updated = dbManager.updateMealStatus(req.params.id, status, notes, reviewer);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Meal not found' });
  }
  res.json({ success: true, data: updated });
});

app.get('/api/plate-audits', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listPlateAudits(householdId) });
});

app.post('/api/plate-audits', (req: Request, res: Response) => {
  const audit = dbManager.savePlateAudit(req.body);
  res.json({ success: true, data: audit });
});

// ==================== GROCERY ====================

app.get('/api/grocery', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: dbManager.listGroceries(householdId) });
});

app.post('/api/grocery', (req: Request, res: Response) => {
  const item = dbManager.saveGroceryItem(req.body);
  res.json({ success: true, data: item });
});

app.patch('/api/grocery/:id', (req: Request, res: Response) => {
  const updated = dbManager.updateGroceryItem(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Grocery item not found' });
  }
  res.json({ success: true, data: updated });
});

// ==================== SEED DEMO DATA ====================

app.post('/api/seed', (req: Request, res: Response) => {
  const data = dbManager.seedData();
  res.json({
    success: true,
    message: 'Demo dataset successfully seeded for Vance Residence (APAC-8421).',
    data,
  });
});

// ==================== VITE CLIENT INTEGRATION ====================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

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
    console.log(`VitalPlate APAC Server listening at http://0.0.0.0:${PORT}`);
    console.log(`- Health Check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`- Architecture: http://0.0.0.0:${PORT}/api/backend/architecture`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
