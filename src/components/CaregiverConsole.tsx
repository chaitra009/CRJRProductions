import React, { useState, useRef } from 'react';
import {
  PatientProfile,
  BiomarkerRecord,
  MealPlanItem,
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
  Languages,
  ShieldCheck,
  Clock,
  Heart,
  ShoppingCart,
} from 'lucide-react';

interface CaregiverConsoleProps {
  patients: PatientProfile[];
  biomarkers: BiomarkerRecord[];
  onAddBiomarker: (record: BiomarkerRecord) => void;
  meals: MealPlanItem[];
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
  onGenerateHouseholdDiet?: () => Promise<void>;
  isGeneratingDiet?: boolean;
}

export const CaregiverConsole: React.FC<CaregiverConsoleProps> = ({
  patients,
  biomarkers,
  onAddBiomarker,
  meals,
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
  onGenerateHouseholdDiet,
  isGeneratingDiet,
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'upload' | 'diet_status' | 'pantry'>('vault');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'pt-arthur');

  // Multi-language instruction state for Caregiver
  const [caregiverLang, setCaregiverLang] = useState<string>('English');
  const [translatedDirectives, setTranslatedDirectives] = useState<Record<string, string[]>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);

  // Lab Upload state
  const [uploadType, setUploadType] = useState<'file' | 'camera' | 'text'>('file');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const [rawTextContent, setRawTextContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New grocery item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryItem['category']>('Vegetables & Greens');
  const [newItemQty, setNewItemQty] = useState('');

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const patientBiomarkers = biomarkers.filter((b) => b.patientId === selectedPatientId);

  // Translation handler for caregiver
  const handleTranslateMeal = async (meal: MealPlanItem, lang: string) => {
    setIsTranslating(meal.id);
    try {
      const res = await fetch('/api/translate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: meal.dishName,
          deltaDirectives: meal.deltaDirectives,
          targetLanguage: lang,
        }),
      });
      const json = await res.json();
      if (json.success && json.data.translatedDirectives) {
        setTranslatedDirectives((prev) => ({
          ...prev,
          [`${meal.id}-${lang}`]: json.data.translatedDirectives,
        }));
      }
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setIsTranslating(null);
    }
  };

  // Lab File upload
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

          const extractedList = json.data.biomarkers || [];
          extractedList.forEach((bm: any, idx: number) => {
            onAddBiomarker({
              id: `extracted-${Date.now()}-${idx}`,
              patientId: selectedPatientId || 'pt-arthur',
              householdId: currentPatient?.householdId || 'hh-prime',
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

          setParseSuccessMessage(`Extracted ${extractedList.length} biomarkers for ${currentPatient?.name || 'patient'}.`);
          setActiveTab('vault');
        } catch (apiErr: any) {
          setParseError(apiErr.message || 'Error parsing report with Gemini.');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setParseError(err.message);
      setIsParsing(false);
    }
  };

  // Lab Raw Text parsing
  const handleTextParse = async () => {
    if (!rawTextContent.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const res = await fetch('/api/parse-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent: rawTextContent }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parsing failed');

      const extractedList = json.data.biomarkers || [];
      extractedList.forEach((bm: any, idx: number) => {
        onAddBiomarker({
          id: `extracted-text-${Date.now()}-${idx}`,
          patientId: selectedPatientId || 'pt-arthur',
          householdId: currentPatient?.householdId || 'hh-prime',
          markerName: bm.markerName,
          category: (bm.category as any) || 'Metabolic & Glycemic',
          value: Number(bm.value) || 0,
          unit: bm.unit || '',
          referenceRange: bm.referenceRange || '',
          status: (bm.status as any) || 'NORMAL',
          clinicalSignificance: bm.clinicalSignificance || json.data.summaryFindings || '',
          dateTested: json.data.reportDate || new Date().toISOString().split('T')[0],
          labProvider: json.data.labProvider || 'Clinical Lab Diagnostics',
        });
      });

      setParseSuccessMessage(`Extracted ${extractedList.length} biomarkers from clinical notes.`);
      setRawTextContent('');
      setActiveTab('vault');
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Generation Hook */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono">
              FAMILY CAREGIVER CONSOLE
            </span>
            <span className="text-xs text-slate-400">· Isolated Clinical Vault</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Medical Lab Ingestion & Household Diet</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload clinical lab panels, track quantitative biomarkers for household seniors and members, and run Vertex/Gemini AI cuisine analysis to tailor chronic care diets.
          </p>
        </div>

        {onGenerateHouseholdDiet && (
          <button
            onClick={onGenerateHouseholdDiet}
            disabled={isGeneratingDiet}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingDiet ? 'animate-spin' : ''}`} />
            <span>{isGeneratingDiet ? 'Analyzing Cuisines...' : 'Synthesize Household Diet Plan'}</span>
          </button>
        )}
      </div>

      {/* Patient Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-medium">Household Patient:</span>
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPatientId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedPatientId === p.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {p.name} ({p.age}y · {p.primaryCondition})
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('vault')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'vault'
              ? 'border-teal-400 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Biomarkers Vault ({patientBiomarkers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-teal-400 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Member Lab Report</span>
        </button>

        <button
          onClick={() => setActiveTab('diet_status')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'diet_status'
              ? 'border-teal-400 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Diet Approval Status ({meals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pantry')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'pantry'
              ? 'border-teal-400 text-teal-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Pantry & Grocery Inventory</span>
        </button>
      </div>

      {/* Tab 1: Biomarker Vault */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          {currentPatient && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-wrap gap-4 items-center justify-between">
              <div>
                <span className="font-semibold text-white text-sm">{currentPatient.name}</span>
                <span className="text-slate-400 ml-2">Age {currentPatient.age}</span>
                <div className="text-teal-400 mt-0.5">{currentPatient.primaryCondition}</div>
              </div>
              <div className="flex gap-2">
                {currentPatient.targetSodiumMg && (
                  <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                    Sodium &lt; {currentPatient.targetSodiumMg}mg
                  </span>
                )}
                {currentPatient.textureNeeds && (
                  <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono">
                    Texture: {currentPatient.textureNeeds}
                  </span>
                )}
              </div>
            </div>
          )}

          {patientBiomarkers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-dashed border-slate-800">
              <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">No biomarkers recorded for this patient yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a lab report or enter biomarkers to evaluate cuisine suitability.</p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium"
              >
                Upload Lab Panel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {patientBiomarkers.map((bm) => (
                <div key={bm.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{bm.markerName}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        bm.status === 'NORMAL'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : bm.status === 'CRITICAL_HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {bm.status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">{bm.value}</span>
                    <span className="text-xs text-slate-400">{bm.unit}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">Ref: {bm.referenceRange}</div>
                  <div className="text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    {bm.clinicalSignificance}
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                    <span>{bm.labProvider}</span>
                    <span>{bm.dateTested}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Upload Lab Panel */}
      {activeTab === 'upload' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-semibold text-white text-base">Multimodal Clinical Lab Panel Uploader</h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF reports, camera smartphone scans, and OCR text panels parsed by Gemini.
            </p>
          </div>

          {parseError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {parseError}
            </div>
          )}

          {parseSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {parseSuccessMessage}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setUploadType('file')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                uploadType === 'file' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Document / Photo File
            </button>
            <button
              onClick={() => setUploadType('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                uploadType === 'text' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Paste Lab Text Panel
            </button>
          </div>

          {uploadType === 'file' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/50"
              >
                <Upload className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">Click to upload report image or PDF</div>
                <div className="text-xs text-slate-500 mt-1">PNG, JPG, PDF up to 30MB</div>
                {isParsing && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-teal-400 font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Parsing biomarkers with Gemini 2.5 Flash...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadType === 'text' && (
            <div className="space-y-3">
              <textarea
                value={rawTextContent}
                onChange={(e) => setRawTextContent(e.target.value)}
                placeholder="Paste lab results or discharge panel text (e.g. Fasting Blood Glucose: 110 mg/dL, Serum Sodium: 144 mmol/L, Creatinine: 1.45 mg/dL)..."
                rows={6}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono"
              />
              <button
                onClick={handleTextParse}
                disabled={isParsing || !rawTextContent.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isParsing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Extract Biomarkers with AI</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Diet Approval Status (Gatekeeper Protocol) */}
      {activeTab === 'diet_status' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div>
              <span className="font-semibold text-white text-sm">Gatekeeper Diet Protocol</span>
              <p className="text-slate-400 mt-0.5">
                Dishes generated for this household start in <span className="text-amber-400 font-mono">DRAFT_PENDING</span>. Once signed off by the Dietitian, they unlock as <span className="text-emerald-400 font-mono">APPROVED_ACTIVE</span> for all members and the cook.
              </p>
            </div>

            {/* Language Selector for Caregiver */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-teal-400" />
              <span className="text-slate-400">View In:</span>
              <select
                value={caregiverLang}
                onChange={(e) => setCaregiverLang(e.target.value)}
                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              >
                <option value="English">English</option>
                <option value="Tagalog">Tagalog</option>
                <option value="Japanese">Japanese 日本語</option>
                <option value="Mandarin">Mandarin 华语</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="Tamil">Tamil தமிழ்</option>
                <option value="Hindi">Hindi हिन्दी</option>
                <option value="Kannada">Kannada ಕನ್ನಡ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meals.map((meal) => {
              const isApproved = meal.approvalStatus === 'APPROVED_ACTIVE';
              const langKey = `${meal.id}-${caregiverLang}`;
              const activeDirectives = translatedDirectives[langKey] || meal.deltaDirectives;

              return (
                <div
                  key={meal.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isApproved
                      ? 'bg-slate-900 border-emerald-500/30'
                      : 'bg-slate-900/60 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono text-slate-400 uppercase">
                        {meal.dayOfWeek} · {meal.mealType}
                      </span>
                      <h4 className="font-bold text-white text-base mt-0.5">{meal.dishName}</h4>
                      <span className="text-xs text-teal-400 font-medium">{meal.cuisine}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>APPROVED ACTIVE</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>AWAITING SIGN-OFF</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Directives in chosen language */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Doctor-Ordered Clinical Deltas:</span>
                      {caregiverLang !== 'English' && !translatedDirectives[langKey] && (
                        <button
                          onClick={() => handleTranslateMeal(meal, caregiverLang)}
                          disabled={isTranslating === meal.id}
                          className="text-[10px] text-teal-400 hover:underline flex items-center gap-1"
                        >
                          {isTranslating === meal.id ? 'Translating...' : `Translate to ${caregiverLang}`}
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {activeDirectives.map((d, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="text-teal-400 shrink-0">·</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Flavor Compensation */}
                  {meal.flavorCompensation && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-amber-400 font-medium">Flavor Compensation: </span>
                      <span className="text-slate-300">{meal.flavorCompensation}</span>
                    </div>
                  )}

                  {/* Gatekeeper Audit Log */}
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                    <span>Sodium: ~{meal.estimatedSodiumMg}mg · GI: {meal.estimatedGI}</span>
                    {meal.dietitianReviewer && (
                      <span className="text-emerald-400 text-[11px]">Signed by: {meal.dietitianReviewer}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Pantry & Grocery */}
      {activeTab === 'pantry' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-3 items-center justify-between text-xs">
            <span className="font-semibold text-white text-sm">Pantry Inventory & Grocery Diff</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add ingredient..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
              <button
                onClick={() => {
                  if (newItemName.trim()) {
                    onAddGroceryItem({
                      householdId: 'hh-prime',
                      name: newItemName.trim(),
                      category: newItemCategory,
                      quantityNeeded: '1 unit',
                      inPantryStock: false,
                      purchased: false,
                      clinicalReason: 'Clinical dietary balance',
                    });
                    setNewItemName('');
                  }
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium"
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {groceryItems.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                </div>
                <div className="text-slate-400">Needed: {item.quantityNeeded}</div>
                <div className="text-[11px] text-teal-400 font-mono">{item.clinicalReason}</div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                    <input
                      type="checkbox"
                      checked={item.inPantryStock}
                      onChange={() => onTogglePantryStock(item.id)}
                      className="rounded border-slate-700 text-teal-600 focus:ring-0"
                    />
                    <span>In Pantry</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={() => onTogglePurchased(item.id)}
                      className="rounded border-slate-700 text-teal-600 focus:ring-0"
                    />
                    <span>Purchased</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
