import { Router, Request, Response } from 'express';
import { backendDb } from './db.js';
import {
  parseClinicalLab,
  analyzeHouseholdCuisineAndGenerateDiet,
  translateDietInstructions,
  generateAudioBriefing,
  calculateIngredientSwap,
  auditHomeCookedPlate,
  reindexMealQueue,
} from './ai.js';
import { firebaseConfig } from './config.js';

export const apiRouter = Router();

// ==================== 1. HEALTH & ARCHITECTURE ====================

apiRouter.get('/health', async (req: Request, res: Response) => {
  const households = backendDb.listHouseholds();
  const users = backendDb.listUsers();
  const patients = backendDb.listPatients();
  const meals = backendDb.listMeals();
  const plateAudits = backendDb.listPlateAudits();

  res.json({
    status: 'online',
    service: 'VitalPlate APAC Standalone Backend API Resource',
    version: '2.5.0',
    runtime: 'Node.js ' + process.version,
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    firestore: {
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      connected: backendDb.isFirestoreConnected,
    },
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

apiRouter.get('/db/status', async (req: Request, res: Response) => {
  const status = await backendDb.testFirestore();
  res.json({
    success: true,
    data: status,
  });
});

apiRouter.get('/backend/architecture', (req: Request, res: Response) => {
  res.json({
    architecture: 'Dedicated Standalone Backend API Resource (Node.js/Express + Cloud Firestore + Vertex/Gemini AI)',
    modules: [
      {
        name: 'Database Connector & Persistence (backend/db.ts)',
        framework: 'Google Cloud Firestore SDK (@firebase/firestore) + Disk Cache',
        capabilities: [
          'Direct Firestore connectivity to ai-studio-remixvitalplatec-beb36462-0cd2-4b7f-8b1f-84d8d822b318',
          'Automatic dual persistence: live Firestore cloud sync + local cache',
          'Entity management for Households, Members, Patients, Biomarkers, Meals, Audits, Groceries',
        ],
      },
      {
        name: 'AI Intelligence & Clinical Reasoning (backend/ai.ts)',
        framework: 'Google GenAI SDK (@google/genai)',
        capabilities: [
          'Multimodal Clinical Lab Panel Parsing (OCR Biomarker Extraction)',
          'Vertex/Gemini Cuisine Clinical Suitability Analysis for Household Cohorts',
          'Diet Table Gatekeeper Generation (DRAFT_PENDING -> APPROVED_ACTIVE)',
          'Multi-lingual cooking directives translation in 8 regional languages',
          '20-second delta spoken audio briefings in native scripts',
          'Hands-free push-to-talk mic ingredient substitutions with flavor compensation',
          'Multimodal plate photo auditor (1-10 surface oil sheen & macro distribution)',
        ],
      },
      {
        name: 'REST API Service Gateway (backend/routes.ts)',
        framework: 'Express Router running standalone or embedded in Vite',
        endpoints: [
          '/api/health',
          '/api/db/status',
          '/api/backend/architecture',
          '/api/households',
          '/api/users',
          '/api/patients',
          '/api/biomarkers',
          '/api/meals',
          '/api/plate-audits',
          '/api/grocery',
          '/api/generate-household-diet',
          '/api/translate-instructions',
          '/api/ingredient-swap',
          '/api/audio-briefing',
          '/api/audit-plate',
          '/api/reindex-meals',
          '/api/seed',
        ],
      },
    ],
    frontendIntegration: 'Decoupled REST API client with zero direct database coupling in UI',
  });
});

// ==================== 2. HOUSEHOLDS ====================

apiRouter.get('/households', (req: Request, res: Response) => {
  res.json({ success: true, data: backendDb.listHouseholds() });
});

apiRouter.post('/households', async (req: Request, res: Response) => {
  const record = await backendDb.saveHousehold(req.body);
  res.json({ success: true, data: record });
});

apiRouter.get('/households/:idOrCode', (req: Request, res: Response) => {
  const param = req.params.idOrCode;
  let hh = backendDb.getHousehold(param);
  if (!hh) {
    hh = backendDb.getHouseholdByCode(param);
  }
  if (!hh) {
    return res.status(404).json({ success: false, error: 'Household not found' });
  }
  res.json({ success: true, data: hh });
});

apiRouter.post('/households/:id/members', async (req: Request, res: Response) => {
  const householdId = req.params.id;
  const user = await backendDb.saveUser({
    ...req.body,
    householdId,
  });
  res.json({ success: true, data: user });
});

// ==================== 3. USERS / MEMBERS ====================

apiRouter.get('/users', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listUsers(householdId) });
});

apiRouter.post('/users', async (req: Request, res: Response) => {
  const user = await backendDb.saveUser(req.body);
  res.json({ success: true, data: user });
});

apiRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  const deleted = await backendDb.deleteUser(req.params.id, householdId);
  res.json({ success: deleted });
});

// ==================== 4. PATIENTS & BIOMARKERS (MEMBER REPORTS) ====================

apiRouter.get('/patients', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listPatients(householdId) });
});

apiRouter.post('/patients', async (req: Request, res: Response) => {
  const patient = await backendDb.savePatient(req.body);
  res.json({ success: true, data: patient });
});

apiRouter.get('/biomarkers', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listBiomarkers(patientId, householdId) });
});

apiRouter.post('/biomarkers', async (req: Request, res: Response) => {
  const biomarker = await backendDb.saveBiomarker(req.body);
  res.json({ success: true, data: biomarker });
});

apiRouter.post('/parse-lab', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, textContent } = req.body;
    const data = await parseClinicalLab({ imageBase64, mimeType, textContent });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /parse-lab Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 5. HOUSEHOLD DIET GENERATION & GATEKEEPER ====================

apiRouter.post('/generate-household-diet', async (req: Request, res: Response) => {
  try {
    const { householdId, householdName, region, patients, biomarkers, availableCuisines, availableAppliances } = req.body;

    const result = await analyzeHouseholdCuisineAndGenerateDiet({
      householdId: householdId || 'hh-prime',
      householdName: householdName || 'Household',
      region: region || 'SINGAPORE',
      patients: patients || backendDb.listPatients(householdId),
      biomarkers: biomarkers || backendDb.listBiomarkers(undefined, householdId),
      availableCuisines,
      availableAppliances,
    });

    const savedMeals = [];
    if (result.generatedDraftMeals && Array.isArray(result.generatedDraftMeals)) {
      for (const draft of result.generatedDraftMeals) {
        const meal = await backendDb.saveMeal({
          ...draft,
          householdId: householdId || 'hh-prime',
          approvalStatus: 'DRAFT_PENDING',
        });
        savedMeals.push(meal);
      }
    }

    res.json({
      success: true,
      data: {
        clinicalSummary: result.clinicalSummary,
        cuisineRecommendations: result.cuisineRecommendations,
        meals: savedMeals,
      },
    });
  } catch (err: any) {
    console.error('[API /generate-household-diet Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/meals', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listMeals(householdId) });
});

apiRouter.post('/meals', async (req: Request, res: Response) => {
  const meal = await backendDb.saveMeal(req.body);
  res.json({ success: true, data: meal });
});

apiRouter.patch('/meals/:id/status', async (req: Request, res: Response) => {
  const { status, notes, reviewer } = req.body;
  const updated = await backendDb.updateMealStatus(req.params.id, status, notes, reviewer);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Meal not found' });
  }
  res.json({ success: true, data: updated });
});

// ==================== 6. MULTI-LANGUAGE INSTRUCTIONS & AUDIOS ====================

apiRouter.post('/translate-instructions', async (req: Request, res: Response) => {
  try {
    const { dishName, deltaDirectives, targetLanguage } = req.body;
    const data = await translateDietInstructions({
      dishName,
      deltaDirectives,
      targetLanguage,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /translate-instructions Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/audio-briefing', async (req: Request, res: Response) => {
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
    console.error('[API /audio-briefing Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/ingredient-swap', async (req: Request, res: Response) => {
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
    console.error('[API /ingredient-swap Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/audit-plate', async (req: Request, res: Response) => {
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
    console.error('[API /audit-plate Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/reindex-meals', async (req: Request, res: Response) => {
  try {
    const { guardrails, currentMeals, patientProfiles } = req.body;
    const data = await reindexMealQueue({
      guardrails,
      currentMeals,
      patientProfiles,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /reindex-meals Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 7. PLATE AUDITS & GROCERY ====================

apiRouter.get('/plate-audits', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listPlateAudits(householdId) });
});

apiRouter.post('/plate-audits', async (req: Request, res: Response) => {
  const audit = await backendDb.savePlateAudit(req.body);
  res.json({ success: true, data: audit });
});

apiRouter.get('/grocery', (req: Request, res: Response) => {
  const householdId = req.query.householdId as string | undefined;
  res.json({ success: true, data: backendDb.listGroceries(householdId) });
});

apiRouter.post('/grocery', async (req: Request, res: Response) => {
  const item = await backendDb.saveGroceryItem(req.body);
  res.json({ success: true, data: item });
});

apiRouter.patch('/grocery/:id', async (req: Request, res: Response) => {
  const updated = await backendDb.updateGroceryItem(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Grocery item not found' });
  }
  res.json({ success: true, data: updated });
});

// ==================== 8. SEED DATA ====================

apiRouter.post('/seed', (req: Request, res: Response) => {
  const data = backendDb.seedData();
  res.json({
    success: true,
    message: 'Demo dataset successfully seeded for Vance Residence (APAC-8421).',
    data,
  });
});
