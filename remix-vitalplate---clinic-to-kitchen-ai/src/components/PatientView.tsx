import React, { useState } from 'react';
import { PatientProfile, MealPlanItem, BiomarkerRecord } from '../types';
import { Heart, Activity, Droplets, CheckCircle, Shield, Utensils } from 'lucide-react';

interface PatientViewProps {
  patients: PatientProfile[];
  approvedMeals: MealPlanItem[];
  biomarkers: BiomarkerRecord[];
}

export const PatientView: React.FC<PatientViewProps> = ({
  patients,
  approvedMeals,
  biomarkers,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [waterGlasses, setWaterGlasses] = useState<number>(5);

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const patientBiomarkers = biomarkers.filter((b) => b.patientId === (currentPatient?.id || ''));

  if (!currentPatient) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 font-sans">
        <Heart className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">No Patient Profile Registered</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          There are currently no patient or senior records in this household. Please ask your Household Head to register a member in the users table or upload a clinical lab report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Persona 4: The Patient / Senior Citizen Self</span>
              <span>·</span>
              <span>Personal Care Companion</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Welcome, {currentPatient?.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Your doctor-approved meals, health milestones, and daily nourishment.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg shrink-0">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  selectedPatientId === p.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Condition highlight */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-teal-800 font-medium">
            <Shield className="w-4 h-4 text-teal-600" />
            <span>Active Care Focus: {currentPatient?.primaryCondition}</span>
          </div>
          {currentPatient?.textureNeeds && (
            <span className="text-slate-500 font-mono">
              Texture: {currentPatient.textureNeeds}
            </span>
          )}
        </div>
      </div>

      {/* Grid: Approved Meals & Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Approved Meals for Today */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Utensils className="w-4 h-4 text-teal-600" />
              DOCTOR-APPROVED MEALS FOR TODAY
            </h2>
            <span className="text-xs text-slate-500">All dishes vetted by Clinical Dietitian</span>
          </div>

          <div className="space-y-3">
            {approvedMeals.slice(0, 3).map((meal) => (
              <div
                key={meal.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-teal-700 font-bold uppercase">
                    {meal.dayOfWeek} · {meal.mealType}
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-mono font-medium flex items-center gap-1 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Dietitian Signed Off
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {meal.dishName}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {meal.baseRecipe}
                </p>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-700 text-[11px] uppercase font-mono block">
                    Why this nourishes you:
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    {meal.flavorCompensation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Health Milestones & Hydration */}
        <div className="space-y-6">
          
          {/* Hydration Tracker */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-500" /> Daily Hydration
              </span>
              <span className="text-xs font-mono font-bold text-slate-900">
                {waterGlasses} / 8 Glasses
              </span>
            </div>

            <div className="flex items-center justify-between gap-1 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                <button
                  key={g}
                  onClick={() => setWaterGlasses(g)}
                  className={`flex-1 h-8 rounded transition-all cursor-pointer ${
                    g <= waterGlasses
                      ? 'bg-sky-500 text-white font-mono text-xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400 font-mono text-xs'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Adequate hydration supports kidney filtration (eGFR) and reduces uric acid crystallization.
            </p>
          </div>

          {/* Key Biomarkers Monitored */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <span className="text-xs font-mono uppercase text-slate-500 font-semibold block">
              Tracked Clinical Markers
            </span>

            <div className="space-y-2">
              {patientBiomarkers.slice(0, 4).map((bm) => (
                <div
                  key={bm.id}
                  className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block">{bm.markerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Target: {bm.referenceRange}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">
                      {bm.value} {bm.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
