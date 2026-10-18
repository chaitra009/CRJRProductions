import React, { useState, useRef } from 'react';
import {
  PatientProfile,
  BiomarkerRecord,
  GroceryItem,
  RegionalRegion,
} from '../types';
import {
  Upload,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Plus,
  RefreshCw,
  Sliders,
  Check,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';

interface CaregiverConsoleProps {
  patients: PatientProfile[];
  biomarkers: BiomarkerRecord[];
  onAddBiomarker: (record: BiomarkerRecord) => void;
  groceryItems: GroceryItem[];
  onTogglePantryStock: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  onAddGroceryItem: (item: Omit<GroceryItem, 'id'>) => void;
  householdRegion: RegionalRegion;
  onUpdateRegion: (region: RegionalRegion) => void;
  activeCuisines: string[];
  onToggleCuisine: (cuisine: string) => void;
  activeAppliances: string[];
  onToggleAppliance: (appliance: string) => void;
  cookLanguage: string;
  onUpdateCookLanguage: (lang: string) => void;
}

const CUISINE_OPTIONS = [
  'Washoku (Japanese)',
  'Sino-Singaporean',
  'South Indian',
  'Filipino',
  'Thai',
  'Malay',
];

const APPLIANCE_OPTIONS = [
  'Rice Cooker (Porridge Mode)',
  'Pressure Cooker / Instant Pot',
  'Induction Cooktop',
  'Bamboo Steamer',
  'Air Fryer',
  'Traditional Wok',
];

const LANGUAGE_OPTIONS = [
  { label: 'Tagalog (Philippines)', value: 'Tagalog' },
  { label: '日本語 (Japanese)', value: 'Japanese' },
  { label: '华语 (Mandarin)', value: 'Mandarin' },
  { label: 'Bahasa Indonesia', value: 'Bahasa Indonesia' },
  { label: 'Tamil (தமிழ்)', value: 'Tamil' },
  { label: 'Hindi (हिन्दी)', value: 'Hindi' },
  { label: 'Kannada (ಕನ್ನಡ)', value: 'Kannada' },
  { label: 'English / Singlish', value: 'English' },
];

export const CaregiverConsole: React.FC<CaregiverConsoleProps> = ({
  patients,
  biomarkers,
  onAddBiomarker,
  groceryItems,
  onTogglePantryStock,
  onTogglePurchased,
  onAddGroceryItem,
  householdRegion,
  onUpdateRegion,
  activeCuisines,
  onToggleCuisine,
  activeAppliances,
  onToggleAppliance,
  cookLanguage,
  onUpdateCookLanguage,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'vault' | 'upload' | 'pantry' | 'profile'>('vault');
  
  // Lab upload state
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New grocery item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryItem['category']>('Vegetables & Greens');
  const [newItemQty, setNewItemQty] = useState('');

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const patientBiomarkers = biomarkers.filter((b) => b.patientId === selectedPatientId);

  // Trigger file parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setParseSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/parse-lab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: file.type || 'image/jpeg',
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Extraction failed');

          // Process parsed biomarkers
          const extractedList = json.data.biomarkers || [];
          extractedList.forEach((bm: any, idx: number) => {
            onAddBiomarker({
              id: `extracted-${Date.now()}-${idx}`,
              patientId: selectedPatientId || 'pat-default',
              householdId: currentPatient?.householdId || 'hh-active',
              markerName: bm.markerName,
              category: (bm.category as any) || 'Metabolic & Glycemic',
              value: Number(bm.value) || 0,
              unit: bm.unit || '',
              referenceRange: bm.referenceRange || '',
              status: (bm.status as any) || 'NORMAL',
              clinicalSignificance: bm.clinicalSignificance || json.data.summaryFindings || '',
              dateTested: json.data.reportDate || new Date().toISOString().split('T')[0],
              labProvider: json.data.labProvider || 'Uploaded Lab Panel',
            });
          });

          setParseSuccessMessage(`Successfully extracted ${extractedList.length} biomarkers for ${currentPatient?.name || 'patient'}.`);
          setActiveTab('vault');
        } catch (apiErr: any) {
          setParseError(apiErr.message || 'Error parsing report with Gemini 3.8 Flash.');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read file.');
      setIsParsing(false);
    }
  };

  // Text panel parse
  const handleTextParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setParseSuccessMessage(null);

    try {
      const res = await fetch('/api/parse-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent: rawText }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parsing failed');

      const extractedList = json.data.biomarkers || [];
      extractedList.forEach((bm: any, idx: number) => {
        onAddBiomarker({
          id: `extracted-text-${Date.now()}-${idx}`,
          patientId: selectedPatientId,
          householdId: currentPatient.householdId,
          markerName: bm.markerName,
          category: (bm.category as any) || 'Metabolic & Glycemic',
          value: Number(bm.value) || 0,
          unit: bm.unit || '',
          referenceRange: bm.referenceRange || '',
          status: (bm.status as any) || 'NORMAL',
          clinicalSignificance: bm.clinicalSignificance || json.data.summaryFindings || '',
          dateTested: json.data.reportDate || new Date().toISOString().split('T')[0],
          labProvider: json.data.labProvider || 'Text Lab Panel',
        });
      });

      setParseSuccessMessage(`Extracted ${extractedList.length} biomarkers from clinical notes.`);
      setRawText('');
      setActiveTab('vault');
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse text.');
    } finally {
      setIsParsing(false);
    }
  };

  // Pre-load helper for instant test demo
  const handleLoadSamplePcos = () => {
    setRawText(`SINGAPORE GENERAL HOSPITAL - ENDOCRINE & METABOLIC INVESTIGATION
Patient: Ananya (Female, 28)
Report Date: 12-Oct-2026
Test Name                 Result      Units       Reference Range      Flag
Fasting Serum Insulin     24.2        uIU/mL      < 8.0                CRITICAL HIGH
Fasting Blood Sugar       108         mg/dL       70 - 99              ELEVATED
HOMA-IR Score             4.2         ratio       < 1.5                CRITICAL HIGH
HbA1c                     5.9         %           < 5.6                PRE-DIABETIC
Serum LH                  16.8        mIU/mL      2.0 - 10.0           ELEVATED
Serum FSH                 6.4         mIU/mL      3.0 - 8.0            NORMAL
LH / FSH Ratio            2.6         ratio       1.0 - 1.2            ELEVATED (PCOS)
Free Testosterone         68.4        ng/dL       15.0 - 45.0          ELEVATED
Serum Triglycerides       185         mg/dL       < 150                ELEVATED
HDL Cholesterol           42          mg/dL       > 50                 LOW`);
    setUploadMode('text');
  };

  const handleLoadSampleSenior = () => {
    setRawText(`POLYCLINIC GERIATRIC & CHRONIC CARDIOVASCULAR PANEL
Patient: Mr. Tan (Male, 72)
Report Date: 04-Oct-2026
Test Name                 Result      Units       Reference Range      Flag
Systolic Blood Pressure   148         mmHg        < 120                STAGE 2 HYPERTENSION
Diastolic Blood Pressure  92          mmHg        < 80                 ELEVATED
Serum Uric Acid           7.6         mg/dL       3.5 - 6.0            ELEVATED (GOUT RISK)
Serum Creatinine          1.35        mg/dL       0.70 - 1.20          ELEVATED
eGFR                      58.0        mL/min      > 90                 STAGE 3a CKD
Serum Sodium              141         mEq/L       135 - 145            NORMAL
Serum Potassium           4.6         mEq/L       3.5 - 5.0            NORMAL
Notes: Mastication difficulty reported. Soft-cooked textures advised.`);
    setUploadMode('text');
  };

  const handleAddCustomGrocery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddGroceryItem({
      householdId: currentPatient.householdId,
      name: newItemName.trim(),
      category: newItemCategory,
      quantityNeeded: newItemQty.trim() || '1 unit',
      inPantryStock: false,
      purchased: false,
      clinicalReason: 'Added by Household Caregiver',
    });
    setNewItemName('');
    setNewItemQty('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Patient Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Persona 1: The Household Caregiver</span>
              <span>·</span>
              <span>The &ldquo;Me&rdquo; Console</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Family Biomarker Vault &amp; Kitchen Grounding
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Synchronize clinical lab results, domestic hardware constraints, and pantry stock with the clinical dietitian.
            </p>
          </div>

          {/* Patient Selector Tabs */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedPatientId === p.id
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Condition Ribbon */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {currentPatient ? (
            <div className="flex items-center gap-3">
              <span className="font-semibold text-teal-400">{currentPatient.primaryCondition}</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-300 font-mono">Target Na: &lt;{currentPatient.targetSodiumMg}mg</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-300 font-mono">Max GI: &lt;{currentPatient.targetMaxGI}</span>
              {currentPatient.textureNeeds && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-amber-400 font-medium">{currentPatient.textureNeeds}</span>
                </>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs italic">
              No patients registered yet. Upload a lab panel below to extract clinical biomarkers.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className="px-3.5 py-1.5 text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/20"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Lab Panel
            </button>
          </div>
        </div>
      </div>

      {/* Internal Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'vault' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Biomarker Vault ({patientBiomarkers.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'upload' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Multimodal Lab Parser
        </button>
        <button
          onClick={() => setActiveTab('pantry')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'pantry' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Grocery Consolidation ({groceryItems.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'profile' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Cuisine &amp; Hardware Setup
        </button>
      </div>

      {/* TAB 1: BIOMARKER VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              LONGITUDINAL CLINICAL TARGETS · {currentPatient.name}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Tested across {new Set(patientBiomarkers.map((b) => b.labProvider)).size} Clinical Laboratories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientBiomarkers.map((bm) => {
              const isAlert = bm.status === 'CRITICAL_HIGH' || bm.status === 'ELEVATED';
              return (
                <div
                  key={bm.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-400 uppercase font-mono tracking-wider">
                        {bm.category}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                          bm.status === 'CRITICAL_HIGH'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : bm.status === 'ELEVATED'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {bm.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white mt-2">
                      {bm.markerName}
                    </h3>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                        {bm.value}
                      </span>
                      <span className="text-xs font-mono uppercase text-slate-400">
                        {bm.unit}
                      </span>
                    </div>

                    <div className="mt-1 text-xs font-mono text-slate-400">
                      Target Range: {bm.referenceRange}
                    </div>

                    <p className="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {bm.clinicalSignificance}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{bm.dateTested}</span>
                    <span className="truncate max-w-[140px] text-slate-400">{bm.labProvider}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MULTIMODAL LAB PARSER */}
      {activeTab === 'upload' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Multimodal Lab Ingestion (PDF / Camera / Scans)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Upload messy lab panels or paste clinical text. Gemini 3.8 Flash extracts longitudinal biomarkers and maps them directly against {currentPatient.name}&apos;s clinical targets.
            </p>
          </div>

          {/* Quick Demo Pre-load buttons */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700">Quick Test Panels:</span>
            <button
              onClick={handleLoadSamplePcos}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-800 font-medium cursor-pointer"
            >
              Load Ananya&apos;s PCOS &amp; Insulin Panel
            </button>
            <button
              onClick={handleLoadSampleSenior}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-800 font-medium cursor-pointer"
            >
              Load Mr. Tan&apos;s Senior BP &amp; Renal Panel
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                uploadMode === 'file' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Document (PDF / Image)
            </button>
            <button
              onClick={() => setUploadMode('text')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                uploadMode === 'text' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Report Text
            </button>
          </div>

          {uploadMode === 'file' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-teal-500 hover:bg-slate-50/50 transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Click or drag &amp; drop lab PDF or photograph
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports messy pathology scans, phone camera photos, and digital lab PDFs
              </p>
            </div>
          )}

          {uploadMode === 'text' && (
            <div className="space-y-3">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste lab results or hospital discharge summary text here..."
                rows={8}
                className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleTextParse}
                  disabled={isParsing || !rawText.trim()}
                  className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium inline-flex items-center gap-2"
                >
                  {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isParsing ? 'Extracting with Gemini 3.8...' : 'Extract Quantitative Biomarkers'}
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {isParsing && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
              <span>Analyzing report with Gemini 3.8 Flash multimodal reasoning...</span>
            </div>
          )}

          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parseSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{parseSuccessMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GROCERY CONSOLIDATION */}
      {activeTab === 'pantry' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Automated Weekly Grocery Consolidation
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Scheduled meals cross-referenced with pantry inventory to eliminate duplicate buys and maintain clinically vetted pantry staples.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              PANTRY IN-STOCK: {groceryItems.filter((g) => g.inPantryStock).length} / {groceryItems.length} ITEMS
            </div>
          </div>

          {/* Add custom item form */}
          <form onSubmit={handleAddCustomGrocery} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
            <input
              type="text"
              placeholder="Item name (e.g. Kokum, Millet)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
            >
              <option value="Vegetables & Greens">Vegetables &amp; Greens</option>
              <option value="Grains & Millets">Grains &amp; Millets</option>
              <option value="Proteins & Dal">Proteins &amp; Dal</option>
              <option value="Condiments & Umami">Condiments &amp; Umami</option>
              <option value="Pantry Essentials">Pantry Essentials</option>
            </select>
            <input
              type="text"
              placeholder="Quantity (e.g. 500g)"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
            >
              Add Item
            </button>
          </form>

          {/* Grocery items table grouped by category */}
          <div className="space-y-4 pt-2">
            {(['Grains & Millets', 'Proteins & Dal', 'Vegetables & Greens', 'Condiments & Umami', 'Pantry Essentials'] as GroceryItem['category'][]).map((cat) => {
              const items = groceryItems.filter((g) => g.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {cat}
                  </h3>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onTogglePurchased(item.id)}
                            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                              item.purchased
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {item.purchased && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <span
                              className={`text-xs font-medium ${
                                item.purchased ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 font-mono">
                              ({item.quantityNeeded})
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {item.clinicalReason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => onTogglePantryStock(item.id)}
                            className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                              item.inPantryStock
                                ? 'bg-teal-50 border-teal-200 text-teal-800 font-medium'
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {item.inPantryStock ? 'Already in Pantry' : 'Need to Buy'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CUISINE & HARDWARE SETUP */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cuisine &amp; Kitchen Hardware Profile
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Ground all generated dishes in your home&apos;s active hardware and cultural seasoning palette across Singapore, Japan, India, and Southeast Asia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            {/* Regional Focus */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Household Geography
              </label>
              <div className="space-y-1.5">
                {(['SINGAPORE', 'JAPAN', 'INDIA', 'SOUTHEAST_ASIA'] as RegionalRegion[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdateRegion(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      householdRegion === r
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Cuisines */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Active Cultural Cuisines
              </label>
              <div className="space-y-1.5">
                {CUISINE_OPTIONS.map((c) => {
                  const active = activeCuisines.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => onToggleCuisine(c)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-teal-50 border-teal-300 text-teal-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{c}</span>
                      {active && <Check className="w-3.5 h-3.5 text-teal-700" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Appliances */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase text-slate-500 font-semibold">
                Available Kitchen Hardware
              </label>
              <div className="space-y-1.5">
                {APPLIANCE_OPTIONS.map((app) => {
                  const active = activeAppliances.includes(app);
                  return (
                    <button
                      key={app}
                      onClick={() => onToggleAppliance(app)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{app}</span>
                      {active && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-mono uppercase text-slate-500 font-semibold block mb-2">
                  Domestic Cook Spoken Dialect
                </label>
                <select
                  value={cookLanguage}
                  onChange={(e) => onUpdateCookLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
