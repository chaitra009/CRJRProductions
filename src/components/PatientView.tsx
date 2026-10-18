import React, { useState } from 'react';
import { MealPlanItem, PatientProfile, BiomarkerRecord } from '../types';
import { Heart, Droplets, CheckCircle2, AlertCircle, Sun, Moon, Utensils } from 'lucide-react';

interface PatientViewProps {
  patient: PatientProfile;
  approvedMeals: MealPlanItem[];
  biomarkers: BiomarkerRecord[];
}

export const PatientView: React.FC<PatientViewProps> = ({
  patient,
  approvedMeals,
  biomarkers,
}) => {
  const [waterCups, setWaterCups] = useState(4);
  const targetWaterCups = 8;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* High-Contrast Senior Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-3">
        <div className="flex items-center gap-2 text-teal-400 font-mono text-xs">
          <span>DAILY HEALTH & MEAL GUIDE</span>
          <span>·</span>
          <span>HOUSEHOLD CARE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Good day, {patient?.name || 'Arthur'}!
        </h1>
        <p className="text-sm text-slate-300 max-w-xl">
          Here is your personalized, doctor-approved meal plan for today. Every dish has been prepared to match your texture needs and heart-safe sodium targets.
        </p>

        {/* Clinical Quick Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold">
            {patient?.primaryCondition || 'Hypertension & Dysphagia'}
          </span>
          {patient?.textureNeeds && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              {patient.textureNeeds}
            </span>
          )}
          {patient?.targetSodiumMg && (
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              Daily Sodium &lt; {patient.targetSodiumMg} mg
            </span>
          )}
        </div>
      </div>

      {/* Hydration Tracker */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Daily Hydration Goal</h3>
          </div>
          <span className="text-xs font-mono text-blue-400 font-bold">
            {waterCups} of {targetWaterCups} Glasses
          </span>
        </div>

        <div className="flex items-center gap-2">
          {Array.from({ length: targetWaterCups }).map((_, i) => (
            <button
              key={i}
              onClick={() => setWaterCups(i + 1)}
              className={`h-10 flex-1 rounded-xl transition-all ${
                i < waterCups
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
            >
              💧
            </button>
          ))}
        </div>
      </div>

      {/* Today's Approved Meals */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Utensils className="w-5 h-5 text-teal-400" />
          <span>Today's Dietitian-Approved Dishes</span>
        </h3>

        {approvedMeals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
            Your clinical dietitian is currently reviewing today's meal queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-6 rounded-3xl bg-slate-900 border border-teal-500/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-teal-400 uppercase">
                    {meal.dayOfWeek} · {meal.mealType}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Approved
                  </span>
                </div>

                <h4 className="text-xl font-bold text-white">{meal.dishName}</h4>
                <div className="text-xs text-amber-300 font-medium">
                  {meal.textureGuidance || 'Soft-simmered for comfortable chewing.'}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-mono">
                  <span>Sodium: ~{meal.estimatedSodiumMg}mg</span>
                  <span>GI Index: {meal.estimatedGI}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
