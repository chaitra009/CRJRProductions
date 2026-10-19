import React, { useState } from 'react';
import { PatientProfile, MealPlanItem, BiomarkerRecord, UserRecord } from '../types';
import { LabReportParser } from './LabReportParser';
import { 
  Heart, 
  Activity, 
  Droplets, 
  CheckCircle, 
  Shield, 
  Utensils, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  History,
  TrendingUp
} from 'lucide-react';

interface MemberConsoleProps {
  user: UserRecord;
  patient: PatientProfile | null;
  approvedMeals: MealPlanItem[];
  biomarkers: BiomarkerRecord[];
  onAddBiomarker: (record: BiomarkerRecord) => void;
}

export const MemberConsole: React.FC<MemberConsoleProps> = ({
  user,
  patient,
  approvedMeals,
  biomarkers,
  onAddBiomarker,
}) => {
  const [activeTab, setActiveTab] = useState<'meals' | 'clinical'>('meals');
  const [waterGlasses, setWaterGlasses] = useState<number>(5);
  const [showParser, setShowParser] = useState(false);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === today.toLowerCase());
  const patientBiomarkers = biomarkers.filter(b => b.patientId === (user.uid || user.id));

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 font-sans">
        <Heart className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Patient Profile Missing</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          We couldn't find a clinical profile for your account. Please contact your Household Admin to initialize your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-teal-400 bg-teal-400/10 border border-teal-500/20 px-2 py-0.5 rounded-full mb-2 uppercase tracking-widest font-bold">
              <Shield className="w-3 h-3" />
              <span>Personal Care Companion</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Your personalized, doctor-approved nutrition and health dashboard.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Household Condition</div>
            <div className="text-teal-400 font-bold bg-teal-400/5 border border-teal-500/20 px-3 py-1 rounded-lg text-sm">
              {patient.primaryCondition}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('meals')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'meals' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Daily Menu & Nutrition</span>
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'clinical' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>My Clinical Health ({patientBiomarkers.length})</span>
        </button>
      </div>

      {/* Tab 1: Daily Menu & Hydration */}
      {activeTab === 'meals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase text-slate-500 font-bold tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Vetted Daily Menu: {today}
              </h2>
            </div>

            <div className="space-y-3">
              {todaysMeals.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <Utensils className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium italic">No approved meals scheduled for today yet.</p>
                </div>
              ) : (
                todaysMeals.map((meal) => (
                  <div key={meal.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-200 transition-colors shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-teal-700 font-bold text-[10px] uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {meal.mealType}
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                        <Shield className="w-3 h-3" /> Clinically Approved
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">{meal.dishName}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{meal.baseRecipe}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">Dietary Benefits</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{meal.flavorCompensation}</p>
                      </div>

                      {meal.individualPortionNotes && meal.individualPortionNotes[user.id] && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] font-mono text-teal-600 uppercase font-bold block mb-1">Your Personal Portion Target</span>
                          <p className="text-sm font-bold text-slate-900">{meal.individualPortionNotes[user.id]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar: Health Markers & Hydration */}
          <div className="space-y-6">
            {/* Hydration Tracker */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-500" /> Daily Hydration
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 bg-sky-50 px-2 py-0.5 rounded text-sky-700">
                  {waterGlasses}/8
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <button
                    key={g}
                    onClick={() => setWaterGlasses(g)}
                    className={`h-9 rounded-lg transition-all cursor-pointer border ${
                      g <= waterGlasses
                        ? 'bg-sky-500 border-sky-600 text-white font-mono text-xs font-bold shadow-sm'
                        : 'bg-white border-slate-200 hover:border-sky-300 text-slate-400 font-mono text-xs'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight italic text-center">
                Adequate water intake assists in renal filtration and glucose management.
              </p>
            </div>

            {/* Quick Biomarkers View */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-xs font-mono uppercase text-slate-500 font-bold block tracking-widest border-b border-slate-100 pb-2">
                Clinical Benchmarks
              </span>

              <div className="space-y-2.5">
                {patientBiomarkers.slice(0, 4).map((bm) => (
                  <div key={bm.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 text-[11px] block">{bm.markerName}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-medium">Target: {bm.referenceRange}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {bm.value} <span className="text-[9px] text-slate-400">{bm.unit}</span>
                      </span>
                    </div>
                  </div>
                ))}
                {patientBiomarkers.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No health markers recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Clinical Health Trend & Upload */}
      {activeTab === 'clinical' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  Longitudinal Clinical Review
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Keep your health data accurate for the AI synthesis engine. Upload your latest blood work or pathology report to adjust your nutrition plan.
                </p>
              </div>

              <button
                onClick={() => setShowParser(!showParser)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  showParser 
                    ? 'bg-teal-600 text-white border-teal-700' 
                    : 'bg-white border-slate-200 text-teal-700 hover:border-teal-500 hover:bg-teal-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{showParser ? 'Close Uploader' : 'Add New Lab Report'}</span>
                {showParser ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showParser && (
              <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                <LabReportParser 
                  patient={patient}
                  onAddBiomarker={onAddBiomarker}
                  onSuccess={() => setShowParser(false)}
                  title="Upload Your Latest Clinical Panel"
                  description="VitalPlate uses Gemini 3.8 Flash to extract quantitative data from your PDF or photo report. This data informs your daily meal targets."
                />
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">Health Marker History</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white border-b border-slate-100 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Biomarker</th>
                    <th className="px-6 py-3">Latest Value</th>
                    <th className="px-6 py-3">Target Range</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Date Tested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patientBiomarkers.map((bm) => (
                    <tr key={bm.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{bm.markerName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{bm.category}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                        {bm.value} <span className="text-[10px] text-slate-400">{bm.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{bm.referenceRange}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            bm.status === 'CRITICAL_HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            bm.status === 'ELEVATED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {bm.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 font-mono">{bm.dateTested}</td>
                    </tr>
                  ))}
                  {patientBiomarkers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                        No clinical history recorded. Upload a report to start tracking your progress.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
