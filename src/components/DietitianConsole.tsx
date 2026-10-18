import React, { useState, useRef } from 'react';
import { MealPlanItem, PatientProfile, PlateAuditRecord } from '../types';
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
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface DietitianConsoleProps {
  meals: MealPlanItem[];
  onUpdateMealApproval: (
    mealId: string,
    status: 'APPROVED_ACTIVE' | 'REVISION_REQUIRED' | 'DRAFT_PENDING',
    notes?: string
  ) => void;
  patients: PatientProfile[];
  onReindexMeals: (updatedMeals: MealPlanItem[]) => void;
  plateAudits: PlateAuditRecord[];
  onAddPlateAudit: (audit: PlateAuditRecord) => void;
}

export const DietitianConsole: React.FC<DietitianConsoleProps> = ({
  meals,
  onUpdateMealApproval,
  patients,
  onReindexMeals,
  plateAudits,
  onAddPlateAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'gatekeeper' | 'sliders' | 'audit'>('gatekeeper');

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

  // Approval reviewer state
  const [dietitianNotesMap, setDietitianNotesMap] = useState<Record<string, string>>({});

  const handleApplyGuardrails = async () => {
    setIsReindexing(true);
    setReindexSuccess(null);

    try {
      const res = await fetch('/api/reindex-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        setReindexSuccess(
          `Successfully re-indexed ${json.data.reindexedMeals.length} dishes against updated clinical boundaries.`
        );
        setActiveTab('gatekeeper');
      }
    } catch (err: any) {
      console.error('Re-index error:', err);
    } finally {
      setIsReindexing(false);
    }
  };

  const handlePlateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAuditImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunPlateAudit = async () => {
    if (!auditImageBase64) return;
    setIsAuditingPlate(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/audit-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: auditImageBase64,
          mimeType: 'image/jpeg',
          patientProfile: patients[0],
          plannedMealName: meals[0]?.dishName || 'Steamed Barramundi with Foxtail Millet',
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Audit failed');

      setLastAuditResult(json.data);
      onAddPlateAudit({
        id: `aud-${Date.now()}`,
        householdId: meals[0]?.householdId || 'hh-prime',
        mealPlanId: meals[0]?.id,
        mealName: meals[0]?.dishName || 'Home-Cooked Dish',
        imageUrl: auditImageBase64,
        overallAdherenceScore: json.data.overallAdherenceScore || 92,
        adherenceTier: json.data.adherenceTier || 'OPTIMAL',
        oilSheenScore: json.data.oilSheenScore || 2,
        oilObservation: json.data.oilObservation || 'Controlled surface sheen.',
        fiberPercentage: json.data.fiberPercentage || 45,
        proteinPercentage: json.data.proteinPercentage || 30,
        carbPercentage: json.data.carbPercentage || 25,
        clinicalViolations: json.data.clinicalViolations || [],
        positiveHighlights: json.data.positiveHighlights || [],
        cookFeedback: json.data.cookStationFeedback || '',
        auditedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setAuditError(err.message);
    } finally {
      setIsAuditingPlate(false);
    }
  };

  const pendingMeals = meals.filter((m) => m.approvalStatus === 'DRAFT_PENDING');
  const approvedMeals = meals.filter((m) => m.approvalStatus === 'APPROVED_ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono">
              CLINICAL DIETITIAN GATEKEEPER
            </span>
            <span className="text-xs text-slate-400">· Strict "No Approval, No Cooking" Protocol</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Diet Table Gatekeeper & Adherence Audits</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Review draft meal queues generated by AI cuisine analysis, enforce clinical guardrails (sodium, low-GI grains, purines), sign off on menus, and audit home-cooked plate photos for oil sheen and portion balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Pending Review</div>
            <div className="text-lg font-bold font-mono text-amber-400">{pendingMeals.length} Dishes</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Active Approved</div>
            <div className="text-lg font-bold font-mono text-emerald-400">{approvedMeals.length} Dishes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('gatekeeper')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'gatekeeper'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Diet Table Sign-off ({pendingMeals.length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('sliders')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'sliders'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Clinical Guardrail Sliders</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Multimodal Plate Vision Audit</span>
        </button>
      </div>

      {/* Tab 1: Diet Table Gatekeeper */}
      {activeTab === 'gatekeeper' && (
        <div className="space-y-4">
          {meals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
              No meal plans currently submitted for this household.
            </div>
          ) : (
            <div className="space-y-4">
              {meals.map((meal) => {
                const isApproved = meal.approvalStatus === 'APPROVED_ACTIVE';
                const isPending = meal.approvalStatus === 'DRAFT_PENDING';

                return (
                  <div
                    key={meal.id}
                    className={`p-6 rounded-2xl border transition-all ${
                      isApproved
                        ? 'bg-slate-900 border-emerald-500/30'
                        : isPending
                        ? 'bg-slate-900 border-amber-500/40 shadow-lg'
                        : 'bg-slate-900 border-rose-500/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 uppercase">
                            {meal.dayOfWeek} · {meal.mealType}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 font-medium">
                            {meal.cuisine}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {meal.approvalStatus}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{meal.dishName}</h3>
                        {meal.baseRecipe && (
                          <p className="text-xs text-slate-400 italic">Base: {meal.baseRecipe}</p>
                        )}
                      </div>

                      {/* Approval Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={() =>
                                onUpdateMealApproval(
                                  meal.id,
                                  'APPROVED_ACTIVE',
                                  dietitianNotesMap[meal.id] || 'Verified clinically compliant.'
                                )
                              }
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Sign Off & Approve</span>
                            </button>
                            <button
                              onClick={() =>
                                onUpdateMealApproval(
                                  meal.id,
                                  'REVISION_REQUIRED',
                                  dietitianNotesMap[meal.id] || 'Revision requested: check sodium levels.'
                                )
                              }
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Request Revision</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>SIGNED OFF · VISIBLE IN KITCHEN</span>
                            </span>
                            <button
                              onClick={() => onUpdateMealApproval(meal.id, 'DRAFT_PENDING', 'Re-opened for review.')}
                              className="text-[11px] text-slate-400 hover:text-slate-200 underline ml-2"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Directives & Delta Guidance */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-slate-400 font-semibold text-[11px]">Doctor-Ordered Clinical Deltas:</span>
                        <ul className="space-y-1">
                          {meal.deltaDirectives.map((d, i) => (
                            <li key={i} className="text-slate-300 flex items-start gap-1.5">
                              <span className="text-teal-400">·</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-amber-400 font-semibold text-[11px]">Flavor Compensation & Senior Texture:</span>
                        <p className="text-slate-300">{meal.flavorCompensation || 'Natural umami via kombu and ginger.'}</p>
                        {meal.textureGuidance && (
                          <p className="text-amber-300/80 text-[11px] mt-1">Texture: {meal.textureGuidance}</p>
                        )}
                      </div>
                    </div>

                    {/* Review Notes Input */}
                    {isPending && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Dietitian notes for household & cook (optional)..."
                          value={dietitianNotesMap[meal.id] || ''}
                          onChange={(e) =>
                            setDietitianNotesMap({ ...dietitianNotesMap, [meal.id]: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sliders & Re-indexing */}
      {activeTab === 'sliders' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl space-y-6">
          <div>
            <h3 className="font-semibold text-white text-base">Clinical Boundary Thresholds</h3>
            <p className="text-xs text-slate-400 mt-1">
              Adjust parameters to trigger automatic re-indexing across upcoming household meal queues.
            </p>
          </div>

          {reindexSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {reindexSuccess}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Daily Sodium Ceiling:</span>
                <span className="font-mono text-teal-400 font-bold">{sodiumCeiling} mg/day</span>
              </div>
              <input
                type="range"
                min="1000"
                max="2300"
                step="50"
                value={sodiumCeiling}
                onChange={(e) => setSodiumCeiling(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Maximum Glycemic Index (GI):</span>
                <span className="font-mono text-amber-400 font-bold">&le; {maxGI}</span>
              </div>
              <input
                type="range"
                min="35"
                max="65"
                step="1"
                value={maxGI}
                onChange={(e) => setMaxGI(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={restrictPotassium}
                  onChange={(e) => setRestrictPotassium(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-0"
                />
                <span>Enforce Potassium Restriction (CKD Stage 3+)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={restrictPurine}
                  onChange={(e) => setRestrictPurine(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-0"
                />
                <span>Enforce Low-Purine Protocol (Hyperuricemia & Gout Prevention)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={seniorSoftTexture}
                  onChange={(e) => setSeniorSoftTexture(e.target.checked)}
                  className="rounded border-slate-700 text-teal-600 focus:ring-0"
                />
                <span>Mandate Level 5 Minced & Moist Textures (Senior Dysphagia)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleApplyGuardrails}
            disabled={isReindexing}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isReindexing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Re-Index Household Meals Against Guardrails</span>
          </button>
        </div>
      )}

      {/* Tab 3: Plate Vision Audit */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-base">Multimodal Plate Photo Audit</h3>
            <p className="text-xs text-slate-400">
              Upload a photo of the completed dish from the domestic kitchen to verify surface oil sheen (scale 1-10) and macro distribution.
            </p>

            <input
              ref={auditFileRef}
              type="file"
              accept="image/*"
              onChange={handlePlateImageUpload}
              className="hidden"
            />

            <div
              onClick={() => auditFileRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-950/50"
            >
              {auditImageBase64 ? (
                <img
                  src={auditImageBase64}
                  alt="Audit preview"
                  className="max-h-48 mx-auto rounded-lg object-cover"
                />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-300">Upload Plate Photo</span>
                </>
              )}
            </div>

            <button
              onClick={handleRunPlateAudit}
              disabled={isAuditingPlate || !auditImageBase64}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuditingPlate && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Inspect Plate with Gemini Multimodal Vision</span>
            </button>
          </div>

          {lastAuditResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm">Audit Findings</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                  {lastAuditResult.overallAdherenceScore}% ADHERENCE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Surface Oil Sheen Score:</span>
                  <span className="font-mono text-teal-400 font-bold">{lastAuditResult.oilSheenScore} / 10</span>
                </div>
                <p className="text-slate-300">{lastAuditResult.oilObservation}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Helper Feedback in Native Dialect:</span>
                <p className="text-emerald-400 font-medium">{lastAuditResult.cookStationFeedback}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
