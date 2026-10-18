import React, { useState } from 'react';
import { X, Database, RefreshCw, CheckCircle2, ShieldCheck, Flame, Layers } from 'lucide-react';
import { HouseholdRecord, UserRecord, PatientProfile, BiomarkerRecord, MealPlanItem } from '../types';

interface DatabaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
  isDbConnected: boolean;
  households: HouseholdRecord[];
  users: UserRecord[];
  patients: PatientProfile[];
  biomarkers: BiomarkerRecord[];
  meals: MealPlanItem[];
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({
  isOpen,
  onClose,
  isDbConnected,
  households,
  users,
  patients,
  biomarkers,
  meals,
}) => {
  const [activeCollection, setActiveCollection] = useState<'households' | 'users' | 'patients' | 'biomarkers' | 'meals'>('households');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base flex items-center gap-2">
                <span>Cloud Firestore Database Inspector</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                    isDbConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isDbConnected ? 'CONNECTED' : 'STANDBY'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                ai-studio-remixvitalplatec-beb36462-0cd2-4b7f-8b1f-84d8d822b318
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collection Selector */}
        <div className="px-6 border-b border-slate-800 flex gap-2 py-3 bg-slate-950 text-xs overflow-x-auto">
          {[
            { key: 'households', label: `households (${households.length})` },
            { key: 'users', label: `users (${users.length})` },
            { key: 'patients', label: `patients (${patients.length})` },
            { key: 'biomarkers', label: `biomarkers (${biomarkers.length})` },
            { key: 'meals', label: `meal_plans (${meals.length})` },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCollection(c.key as any)}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors ${
                activeCollection === c.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              /{c.label}
            </button>
          ))}
        </div>

        {/* JSON Viewer */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-emerald-400 bg-slate-950">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(
              activeCollection === 'households'
                ? households
                : activeCollection === 'users'
                ? users
                : activeCollection === 'patients'
                ? patients
                : activeCollection === 'biomarkers'
                ? biomarkers
                : meals,
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};
