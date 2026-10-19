import React, { useState, useRef } from 'react';
import { MealPlanItem, PatientProfile, PlateAuditRecord, BiomarkerRecord } from '../types';
import * as backendApi from '../services/backendApi';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  Sliders,
  FileCheck,
  Eye,
  TrendingUp,
  User,
  Activity,
  History,
} from 'lucide-react';

interface DietitianConsoleProps {
  householdId?: string;
  meals: MealPlanItem[];
  onUpdateMealApproval: (
    mealId: string,
    status: 'APPROVED_ACTIVE' | 'REVISION_REQUIRED',
    notes?: string
  ) => void;
  patients: PatientProfile[];
  biomarkers: BiomarkerRecord[];
  onReindexMeals: (updatedMeals: MealPlanItem[]) => void;
  plateAudits: PlateAuditRecord[];
  onAddPlateAudit: (audit: PlateAuditRecord) => void;
}

export const DietitianConsole: React.FC<DietitianConsoleProps> = ({
  householdId,
  meals,
  onUpdateMealApproval,
  patients,
  biomarkers,
  onReindexMeals,
  plateAudits,
  onAddPlateAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'gatekeeper' | 'sliders' | 'audit' | 'clinical'>('gatekeeper');
  const [selectedClinicalPatientId, setSelectedClinicalPatientId] = useState<string>(patients[0]?.id || '');
  const [householdAnalysis, setHouseholdAnalysis] = useState<any>(null);

  // Fetch household analysis on tab change or mount
  React.useEffect(() => {
    if (activeTab === 'clinical' && householdId) {
      backendApi.fetchHouseholdClinicalAnalysis(householdId)
        .then(res => {
          if (res) setHouseholdAnalysis(res);
        })
        .catch(err => console.error('Failed to fetch clinical analysis:', err));
    }
  }, [activeTab, householdId]);

  // Row editing state
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editDishName, setEditDishName] = useState<string>('');
  const [editBaseRecipe, setEditBaseRecipe] = useState<string>('');
  const [editCuisine, setEditCuisine] = useState<string>('');
  const [editSodium, setEditSodium] = useState<number>(0);
  const [editGI, setEditGI] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Sliders state
  const [sodiumCeiling, setSodiumCeiling] = useState<number>(1400);
  const [maxGI, setMaxGI] = useState<number>(45);
  const [restrictPotassium, setRestrictPotassium] = useState<boolean>(true);
  const [restrictPurine, setRestrictPurine] = useState<boolean>(true);
  const [seniorSoftTexture, setSeniorSoftTexture] = useState<boolean>(true);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [reindexSuccess, setReindexSuccess] = useState<string | null>(null);

  // Plate Photo Audit State
  const [auditImageBase64, setAuditImageBase64] = useState<string | null>(null);
  const [isAuditingPlate, setIsAuditingPlate] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [lastAuditResult, setLastAuditResult] = useState<any | null>(null);
  const auditFileRef = useRef<HTMLInputElement>(null);

  const startEditing = (meal: any) => {
    setEditingMealId(meal.id);
    setEditDishName(meal.dishName);
    setEditBaseRecipe(meal.baseRecipe);
    setEditCuisine(meal.cuisine);
    setEditSodium(meal.estimatedSodiumMg);
    setEditGI(meal.estimatedGI);
    setEditNotes(meal.dietitianNotes || '');
  };

  const handleSaveRow = (mealId: string) => {
    const updated = meals.map((m) => {
      if (m.id === mealId) {
        return {
          ...m,
          dishName: editDishName,
          baseRecipe: editBaseRecipe,
          cuisine: editCuisine,
          estimatedSodiumMg: editSodium,
          estimatedGI: editGI,
          dietitianNotes: editNotes,
        };
      }
      return m;
    });
    onReindexMeals(updated);
    setEditingMealId(null);
  };

  // Re-indexing triggered by guardrail sliders
  const handleApplyGuardrails = async () => {
    setIsReindexing(true);
    setReindexSuccess(null);

    try {
      const res = await fetch('/api/reindex-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          guardrails: {
            maxSodiumPerMeal: Math.round(sodiumCeiling / 3),
            maxGI,
            restrictPotassium,
            restrictPurine,
            seniorSoftTexture,
          },
          currentMeals: meals,
          patientProfiles: patients,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Re-indexing failed');

      if (json.data.reindexedMeals) {
        onReindexMeals(json.data.reindexedMeals);
        const synthesisNote = json.data.clinicalSynthesisNote || '';
        setReindexSuccess(
          `Successfully synthesized 70% family overlap across ${json.data.reindexedMeals.length} dishes. ${synthesisNote}`
        );
        setActiveTab('gatekeeper');
      }
    } catch (err: any) {
      console.error('Re-index error:', err);
    } finally {
      setIsReindexing(false);
    }
  };

  // Handle meal photo upload for multimodal inspection
  const handlePlateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAuditImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run multimodal plate photo audit via Gemini 3.8 Flash
  const runPlateAudit = async () => {
    if (!auditImageBase64) return;
    setIsAuditingPlate(true);
    setAuditError(null);

    try {
      const res = await fetch('/api/audit-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: auditImageBase64,
          patientProfile: {
            patient1: 'Ananya (PCOS with severe insulin resistance, low GI target <45)',
            patient2: 'Mr. Tan (72yo, Stage 2 Hypertension, eGFR 58, sodium <1400mg, soft texture)',
          },
          plannedMealName: 'Home-cooked Asian meal with steamed fish, greens, and grains',
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Audit analysis failed');

      const auditData = json.data;
      setLastAuditResult(auditData);

      onAddPlateAudit({
        id: `audit-${Date.now()}`,
        householdId: 'hh-apac-8421',
        mealName: 'Audited Lunch Plate',
        imageUrl: auditImageBase64,
        overallAdherenceScore: auditData.overallAdherenceScore,
        adherenceTier: auditData.adherenceTier,
        oilSheenScore: auditData.oilSheenRating.score,
        oilObservation: auditData.oilSheenRating.observation,
        fiberPercentage: auditData.portionAudit.fiberPercentage,
        proteinPercentage: auditData.portionAudit.proteinPercentage,
        carbPercentage: auditData.portionAudit.carbPercentage,
        clinicalViolations: auditData.clinicalViolations || [],
        positiveHighlights: auditData.positiveHighlights || [],
        cookFeedback: auditData.cookStationFeedback,
        auditedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setAuditError(err.message || 'Error auditing plate photo.');
    } finally {
      setIsAuditingPlate(false);
    }
  };

  // Quick sample photo simulator for demonstration
  const handleLoadSamplePlatePhoto = () => {
    // Generate a minimal mock SVG-based image data url of a balanced healthy plate
    const svgPlate = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <circle cx="200" cy="200" r="180" fill="#f8fafc" stroke="#cbd5e1" stroke-width="6"/>
      <path d="M 200,200 L 200,20 A 180,180 0 0,1 380,200 Z" fill="#bbf7d0" stroke="#86efac" stroke-width="2"/>
      <text x="260" y="120" font-family="sans-serif" font-size="14" fill="#166534">50% Greens</text>
      <path d="M 200,200 L 380,200 A 180,180 0 0,1 200,380 Z" fill="#fed7aa" stroke="#fdba74" stroke-width="2"/>
      <text x="260" y="290" font-family="sans-serif" font-size="14" fill="#9a3412">25% Protein</text>
      <path d="M 200,200 L 200,380 A 180,180 0 0,1 20,200 Z" fill="#e0e7ff" stroke="#c7d2fe" stroke-width="2"/>
      <text x="80" y="290" font-family="sans-serif" font-size="14" fill="#3730a3">25% Millet</text>
      <circle cx="200" cy="200" r="24" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    </svg>`;
    const base64 = `data:image/svg+xml;base64,${btoa(svgPlate)}`;
    setAuditImageBase64(base64);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Clinical Dietitian &amp; Advisor Console</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Clinical Guardrails, Diet Sign-Off &amp; Plate Audit
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review, adjust, and sign off on household meal tables based on patient biomarkers and targets.
            </p>
          </div>
        </div>

        {/* Clinical Guardrail Summary Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>Sodium Limit: &lt;{sodiumCeiling} mg/day</span>
            <span>·</span>
            <span>Max Glycemic Index: &lt;{maxGI}</span>
            <span>·</span>
            <span>Low Purine (Uric Acid &lt;6.0)</span>
            <span>·</span>
            <span>Senior Soft Mastication Mode</span>
          </div>

          <button
            onClick={() => setActiveTab('sliders')}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Adjust Guardrails
          </button>
        </div>
      </div>

      {/* Internal Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('gatekeeper')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'gatekeeper' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Diet Approval Table ({meals.length} Meals)
        </button>
        <button
          onClick={() => setActiveTab('sliders')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'sliders' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          One-Click Clinical Guardrails
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'audit' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Plate Photo Vision Audit ({plateAudits.length})
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'clinical' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Patient Clinical Review</span>
        </button>
      </div>

      {/* TAB 1: DIET APPROVAL TABLE */}
      {activeTab === 'gatekeeper' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Household Weekly Meal Table &amp; Sign-off Handles
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Review each meal against patient biomarkers. Only approved dishes appear in the domestic cook&apos;s active queue.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500">
              STATUS: {meals.filter((m) => m.approvalStatus === 'APPROVED_ACTIVE').length} APPROVED ·{' '}
              {meals.filter((m) => m.approvalStatus === 'DRAFT_PENDING').length} PENDING REVIEW
            </div>
          </div>

          {patients.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">No Household Members Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Please ask the Household Admin to add members and upload their lab reports before starting the clinical review.
              </p>
            </div>
          ) : (
            /* Meals Table */
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Meal / Schedule</th>
                  <th className="px-4 py-3">Dish &amp; Base Recipe</th>
                  <th className="px-4 py-3">Cuisine</th>
                  <th className="px-4 py-3">Estimated Na</th>
                  <th className="px-4 py-3">Estimated GI</th>
                  <th className="px-4 py-3">Dietitian Approval Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meals.map((meal) => {
                  const isApproved = meal.approvalStatus === 'APPROVED_ACTIVE';
                  const isPending = meal.approvalStatus === 'DRAFT_PENDING';
                  const isRejected = meal.approvalStatus === 'REVISION_REQUIRED';

                  if (editingMealId === meal.id) {
                    return (
                      <tr key={meal.id} className="bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                          <div>{meal.dayOfWeek}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{meal.mealType}</div>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs space-y-2">
                          <input
                            type="text"
                            value={editDishName}
                            onChange={(e) => setEditDishName(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-900 font-semibold"
                            placeholder="Dish Name"
                          />
                          <textarea
                            value={editBaseRecipe}
                            onChange={(e) => setEditBaseRecipe(e.target.value)}
                            className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-700"
                            placeholder="Base Recipe"
                            rows={2}
                          />
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-800"
                            placeholder="Dietitian Notes / Feedback"
                          />
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <input
                            type="text"
                            value={editCuisine}
                            onChange={(e) => setEditCuisine(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-900"
                            placeholder="Cuisine"
                          />
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editSodium}
                              onChange={(e) => setEditSodium(parseInt(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-900 font-semibold text-right"
                            />
                            <span className="text-[10px] text-slate-500 font-mono">mg</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <input
                            type="number"
                            value={editGI}
                            onChange={(e) => setEditGI(parseInt(e.target.value) || 0)}
                            className="w-12 px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 bg-white text-slate-900 font-semibold text-right"
                          />
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500 font-mono">EDITING...</span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveRow(meal.id)}
                              className="px-2.5 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 font-semibold transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMealId(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={meal.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                        <div>{meal.dayOfWeek}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{meal.mealType}</div>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900">{meal.dishName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {meal.baseRecipe}
                        </div>
                        {meal.dietitianNotes && (
                          <div className="text-[11px] text-teal-800 bg-teal-50/60 p-1 rounded mt-1 border border-teal-100">
                            <strong>Dietitian:</strong> {meal.dietitianNotes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-600">
                        {meal.cuisine}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        <span
                          className={`font-semibold ${
                            meal.estimatedSodiumMg > 500 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {meal.estimatedSodiumMg} mg
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        <span
                          className={`font-semibold ${
                            meal.estimatedGI > 50 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {meal.estimatedGI}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-semibold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isApproved && <Check className="w-3 h-3 text-emerald-600" />}
                          {isPending && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {isRejected && <X className="w-3 h-3 text-rose-600" />}
                          {meal.approvalStatus.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isApproved ? (
                            <span className="text-[11px] font-medium text-slate-400 inline-flex items-center gap-1 font-mono">
                              🔒 FROZEN
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(meal)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
                                title="Edit meal details"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  onUpdateMealApproval(
                                    meal.id,
                                    'APPROVED_ACTIVE',
                                    meal.dietitianNotes || 'Clinically validated: Sodium & GI within limits.'
                                  )
                                }
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Approve for domestic cook"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>

                              {!isRejected && (
                                <button
                                  onClick={() =>
                                    onUpdateMealApproval(
                                      meal.id,
                                      'REVISION_REQUIRED',
                                      'Revision Requested: Modify sodium seasoning or replace refined grains.'
                                    )
                                  }
                                  className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded text-xs font-medium transition-colors cursor-pointer"
                                  title="Reject and request revision"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* TAB 2: ONE-CLICK CLINICAL GUARDRAILS */}
      {activeTab === 'sliders' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              70% Family Overlap Synthesis
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Vertex AI analyzes all household member reports to find a common clinical baseline. Adjust guardrails to re-calculate the "Fork-in-the-road" instructions for the cook.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            
            {/* Slider 1: Sodium */}
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-slate-700 font-semibold">
                  Daily Sodium Ceiling
                </label>
                <span className="text-base font-mono font-bold text-teal-800">
                  {sodiumCeiling} mg/day
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="2400"
                step="50"
                value={sodiumCeiling}
                onChange={(e) => setSodiumCeiling(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                AHA / ESC Hypertension target: &lt;1,500mg/day. Enforces kokum, dashi, and citrus flavor compensation.
              </p>
            </div>

            {/* Slider 2: Glycemic Index */}
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase text-slate-700 font-semibold">
                  Glycemic Index Threshold (Max GI)
                </label>
                <span className="text-base font-mono font-bold text-teal-800">
                  GI &lt; {maxGI}
                </span>
              </div>
              <input
                type="range"
                min="35"
                max="60"
                step="1"
                value={maxGI}
                onChange={(e) => setMaxGI(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                PCOS &amp; Insulin Resistance target: &lt;45. Replaces polished white rice with foxtail, barnyard, or steel-cut oats.
              </p>
            </div>

            {/* Toggle 1: Potassium */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-mono uppercase font-semibold text-slate-900 block">
                  Zero High-Potassium Greens
                </span>
                <span className="text-[11px] text-slate-500">
                  Critical for Stage 3 CKD to prevent hyperkalemia (restricts raw spinach, raw banana stem).
                </span>
              </div>
              <button
                onClick={() => setRestrictPotassium(!restrictPotassium)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  restrictPotassium ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    restrictPotassium ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Purines */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-mono uppercase font-semibold text-slate-900 block">
                  Strict Purine Ceiling (Uric Acid Control)
                </span>
                <span className="text-[11px] text-slate-500">
                  Eliminates organ meats, anchovies, and beer/yeast broths to prevent gout flares.
                </span>
              </div>
              <button
                onClick={() => setRestrictPurine(!restrictPurine)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  restrictPurine ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    restrictPurine ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Senior Soft Texture */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl md:col-span-2">
              <div>
                <span className="text-xs font-mono uppercase font-semibold text-slate-900 block">
                  Senior Citizen Mastication Comfort (Soft Texture Mode)
                </span>
                <span className="text-[11px] text-slate-500">
                  Instructs domestic helper to simmer millets to congee softness and steam fish/tofu to tender chawanmushi texture.
                </span>
              </div>
              <button
                onClick={() => setSeniorSoftTexture(!seniorSoftTexture)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  seniorSoftTexture ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    seniorSoftTexture ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Changes will re-index the upcoming weekly meal queue using Gemini 3.8 Flash.
            </span>
            <button
              onClick={handleApplyGuardrails}
              disabled={isReindexing}
              className="px-5 py-2.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {isReindexing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isReindexing ? 'Re-indexing Meals...' : 'Re-index Weekly Meal Queue'}</span>
            </button>
          </div>

          {reindexSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              {reindexSuccess}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLATE PHOTO VISION AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Multimodal Plate Photo Adherence Audit
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Ingest daily plate photos from the kitchen. Gemini 3.8 Flash evaluates visible oil sheen, portion balance (fiber vs protein vs carb), and hidden sodium gravies.
              </p>
            </div>

            <button
              onClick={handleLoadSamplePlatePhoto}
              className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
            >
              Load Sample Plate Photo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Upload Box */}
            <div className="space-y-4">
              <div
                onClick={() => auditFileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-500 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <input
                  ref={auditFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePlateImageUpload}
                  className="hidden"
                />
                {auditImageBase64 ? (
                  <div className="space-y-3">
                    <img
                      src={auditImageBase64}
                      alt="Plate Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-sm object-cover"
                    />
                    <p className="text-xs text-teal-700 font-medium">Click to change photograph</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                      Upload home meal photo or take camera snap
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Audits oil glisten, portion ratios, and gravy density
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={runPlateAudit}
                disabled={!auditImageBase64 || isAuditingPlate}
                className="w-full py-2.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAuditingPlate ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{isAuditingPlate ? 'Auditing with Gemini Vision...' : 'Audit Meal Adherence'}</span>
              </button>

              {auditError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {auditError}
                </div>
              )}
            </div>

            {/* Audit Results Panel */}
            <div className="space-y-4">
              {lastAuditResult ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase text-slate-500">
                      CLINICAL VISION AUDIT
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        lastAuditResult.overallAdherenceScore >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      ADHERENCE: {lastAuditResult.overallAdherenceScore} / 100
                    </span>
                  </div>

                  {/* Oil Sheen & Portions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Visible Oil Sheen
                      </span>
                      <span className="text-xl font-mono font-bold text-slate-900">
                        {lastAuditResult.oilSheenRating.score} / 10
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {lastAuditResult.oilSheenRating.observation}
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Portion Distribution
                      </span>
                      <div className="text-xs font-mono font-semibold text-slate-900 mt-1 space-y-0.5">
                        <div>Fiber Greens: {lastAuditResult.portionAudit.fiberPercentage}%</div>
                        <div>Protein: {lastAuditResult.portionAudit.proteinPercentage}%</div>
                        <div>Carbs: {lastAuditResult.portionAudit.carbPercentage}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Cook feedback */}
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-teal-900 block">
                      Direct Cook Feedback:
                    </span>
                    <p className="text-teal-800">{lastAuditResult.cookStationFeedback}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                  <FileCheck className="w-8 h-8 text-slate-300 mb-2" />
                  <span>Upload a meal photo to receive an objective multimodal clinical audit.</span>
                </div>
              )}
            </div>

          </div>

          {/* Historical Audits */}
          {plateAudits.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                RECENT AUDIT LOGS ({plateAudits.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plateAudits.map((a) => (
                  <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{a.mealName}</span>
                      <span className="font-mono text-teal-800 font-bold">
                        {a.overallAdherenceScore}%
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 text-[11px]">{a.cookFeedback}</p>
                    <span className="text-[10px] font-mono text-slate-400 block">{a.auditedAt.split('T')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PATIENT CLINICAL REVIEW */}
      {activeTab === 'clinical' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Patient Clinical Deep-Dive & Lab History
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Select a member to review their longitudinal clinical biomarkers, lab ingestion history, and medical guardrails.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-slate-500 font-bold">Member:</span>
              <select
                value={selectedClinicalPatientId}
                onChange={(e) => setSelectedClinicalPatientId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-sm"
              >
                <option value="">Select Member...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {householdAnalysis && (
            <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>AI Clinical Overlap Analysis (Household Level)</span>
              </div>
              <p className="text-sm text-teal-900 leading-relaxed italic">
                "{householdAnalysis.analysis}"
              </p>
              <div className="flex items-center gap-4 pt-2 text-[10px] text-teal-700 font-mono">
                <span>Last Updated: {householdAnalysis.updatedAt}</span>
              </div>
            </div>
          )}

          {selectedClinicalPatientId ? (
            <div className="space-y-6">
              {(() => {
                const patient = patients.find(p => p.id === selectedClinicalPatientId);
                const patientBiomarkers = biomarkers.filter(b => b.patientId === selectedClinicalPatientId);
                
                if (!patient) return null;

                return (
                  <>
                    {/* Patient Overview Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-xl">
                            {patient.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{patient.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-xs font-mono text-teal-400">{patient.primaryCondition}</span>
                              <span className="text-xs text-slate-500">|</span>
                              <span className="text-xs text-slate-400">Age: {patient.age}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Sodium Limit</span>
                            <span className="text-lg font-bold text-teal-400">{patient.targetSodiumMg} mg/day</span>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Max Glycemic Index</span>
                            <span className="text-lg font-bold text-teal-400">{patient.targetMaxGI} GI</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center text-center space-y-2">
                        <History className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900">Lab Reports</h4>
                        <p className="text-xs text-slate-500">
                          {patientBiomarkers.length} active biomarkers extracted across {new Set(patientBiomarkers.map(b => b.labProvider)).size} clinical providers.
                        </p>
                      </div>
                    </div>

                    {/* Biomarkers Trend Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-widest flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" />
                          Longitudinal Biomarker Data
                        </h4>
                      </div>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Marker Name</th>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3">Latest Value</th>
                              <th className="px-4 py-3">Target Range</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Date Tested</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {patientBiomarkers.map((bm) => (
                              <tr key={bm.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-900">{bm.markerName}</td>
                                <td className="px-4 py-3 text-slate-500">{bm.category}</td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-900">{bm.value} {bm.unit}</td>
                                <td className="px-4 py-3 text-slate-500 font-mono">{bm.referenceRange}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    bm.status === 'CRITICAL_HIGH' ? 'bg-rose-100 text-rose-700' :
                                    bm.status === 'ELEVATED' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {bm.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400 font-mono">{bm.dateTested}</td>
                              </tr>
                            ))}
                            {patientBiomarkers.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                  No clinical biomarkers found for this member. Upload a lab report in the Admin Console.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
              <User className="w-12 h-12 text-slate-200 mb-3" />
              <span>Select a household member above to start clinical review.</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
