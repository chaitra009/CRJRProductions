import React, { useState, useRef, useEffect } from 'react';
import { LabReportParser } from './LabReportParser';
import * as backendApi from '../services/backendApi';
import {
  PatientProfile,
  BiomarkerRecord,
  GroceryItem,
  RegionalRegion,
  MealPlanItem,
  SupportedDialect,
  AudioBriefingData,
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
  PackageX,
  Clock,
  ShoppingBag,
  Play,
  Square,
  Globe2,
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
  approvedMeals: MealPlanItem[];
  allMeals: MealPlanItem[];
}

const CUISINE_OPTIONS = [
  'South Indian Traditional',
  'North Indian Traditional',
  'Sino-Singaporean',
  'Washoku (Japanese)',
  'Western Healthy',
];

const APPLIANCE_OPTIONS = [
  'Idli Steamer / Wet Grinder',
  'Pressure Cooker / Instant Pot',
  'Induction Cooktop',
  'Roti Maker / Tava',
  'Air Fryer',
  'Traditional Wok / Kadai',
];

const LANGUAGE_OPTIONS = [
  { label: 'Hindi (हिन्दी)', value: 'Hindi', flag: '🇮🇳' },
  { label: 'Kannada (ಕನ್ನಡ)', value: 'Kannada', flag: '🇮🇳' },
  { label: 'Tamil (தமிழ்)', value: 'Tamil', flag: '🇮🇳' },
  { label: 'Singapore English', value: 'Singapore', flag: '🇸🇬' },
  { label: '日本語 (Japanese)', value: 'Japanese', flag: '🇯🇵' },
  { label: 'English', value: 'English', flag: '🌐' },
];

const DIALECTS: Array<{ label: string; value: SupportedDialect; flag: string }> = LANGUAGE_OPTIONS as any;

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
  approvedMeals,
  allMeals,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'approved' | 'upload' | 'pantry' | 'profile'>('approved');
  
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

  // Approved Meals State
  const [selectedMealId, setSelectedMealId] = useState<string>('');

  useEffect(() => {
    console.log('CaregiverConsole mounted/updated. approvedMeals count:', approvedMeals.length);
    if (approvedMeals.length > 0 && !selectedMealId) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const tMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === today.toLowerCase());
      if (tMeals.length > 0) {
        setSelectedMealId(tMeals[0].id);
      } else {
        setSelectedMealId(approvedMeals[0].id);
      }
    }
  }, [approvedMeals, selectedMealId]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBriefing, setAudioBriefing] = useState<AudioBriefingData | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<SupportedDialect>((cookLanguage as SupportedDialect) || 'English');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const patientBiomarkers = biomarkers.filter((b) => b.patientId === selectedPatientId);

  // Meal categorization
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  const todaysMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === today.toLowerCase());
  const tomorrowsMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === tomorrow.toLowerCase());
  const currentMeal = todaysMeals.find((m) => m.id === selectedMealId) || todaysMeals[0] || tomorrowsMeals[0];

  // Trigger audio briefing load
  const handleLoadBriefing = async () => {
    if (!currentMeal) {
      console.warn('No meal selected for briefing');
      return;
    }
    setIsLoadingAudio(true);
    setAudioBriefing(null);
    try {
      console.log('--- Audio Briefing Request ---');
      console.log('Dish:', currentMeal.dishName);
      console.log('Dialect:', activeLanguage);

      const res = await fetch('/api/audio-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealName: currentMeal.dishName,
          cuisine: currentMeal.cuisine,
          deltaInstructions: currentMeal.deltaDirectives,
          dialect: activeLanguage,
        }),
      });
      const json = await res.json();
      console.log('--- Audio Briefing Response ---', json);

      if (json.success && json.data) {
        setAudioBriefing(json.data);
        if (json.data.audioBase64) {
          playAudioBase64(json.data.audioBase64);
        } else {
          // Using the script in dialect for the browser voice if available
          const textToSpeak = json.data.scriptInDialect || json.data.scriptPhonetic || json.data.scriptEnglishTranslation;
          speakWithBrowser(textToSpeak);
        }
      }
    } catch (err) {
      console.error('Audio briefing error:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Regional Focus
  const handleUpdateRegion = (r: RegionalRegion) => {
    onUpdateRegion(r);
    // Persist to backend immediately
    backendApi.createOrUpdateHousehold({
      id: currentPatient?.householdId || 'hh-active',
      region: r,
      activeCuisines,
      activeAppliances,
      defaultCookLanguage: cookLanguage,
      name: '', 
      homeCode: '',
      memberIds: [],
      createdAt: '',
    } as any).catch(err => console.error('Failed to update household region:', err));
  };

  const handleToggleCuisine = (c: string) => {
    onToggleCuisine(c);
    const newCuisines = activeCuisines.includes(c) 
      ? activeCuisines.filter(x => x !== c)
      : [...activeCuisines, c];
    
    backendApi.createOrUpdateHousehold({
      id: currentPatient?.householdId || 'hh-active',
      region: householdRegion,
      activeCuisines: newCuisines,
      activeAppliances,
      defaultCookLanguage: cookLanguage,
    } as any).catch(err => console.error('Failed to update household cuisines:', err));
  };

  const handleToggleAppliance = (app: string) => {
    onToggleAppliance(app);
    const newApps = activeAppliances.includes(app)
      ? activeAppliances.filter(x => x !== app)
      : [...activeAppliances, app];
      
    backendApi.createOrUpdateHousehold({
      id: currentPatient?.householdId || 'hh-active',
      region: householdRegion,
      activeCuisines,
      activeAppliances: newApps,
      defaultCookLanguage: cookLanguage,
    } as any).catch(err => console.error('Failed to update household appliances:', err));
  };

  const handleUpdateCookLanguage = (lang: string) => {
    onUpdateCookLanguage(lang);
    backendApi.createOrUpdateHousehold({
      id: currentPatient?.householdId || 'hh-active',
      region: householdRegion,
      activeCuisines,
      activeAppliances,
      defaultCookLanguage: lang,
    } as any).catch(err => console.error('Failed to update household language:', err));
  };

  const playAudioBase64 = (base64Wav: string) => {
    console.log('Playing audio from base64...');
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audioUrl = `data:audio/wav;base64,${base64Wav}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
  };

  const speakWithBrowser = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map dialect to BCP-47 language tag
    const langMap: Record<string, string> = {
      'Hindi': 'hi-IN',
      'Tamil': 'ta-IN',
      'Japanese': 'ja-JP',
      'Kannada': 'kn-IN',
      'Singapore': 'en-SG',
      'English': 'en-US'
    };
    
    utterance.lang = langMap[activeLanguage] || 'en-US';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  // Grocery Low Stock items based on consumption patterns (depletion <= 3 days or out of stock)
  const lowStockItems = groceryItems.filter(
    (g) =>
      g.isLowStock ||
      !g.inPantryStock ||
      (g.daysRemaining !== undefined && g.daysRemaining <= 3) ||
      (g.currentStockLevel !== undefined &&
        g.thresholdStockLevel !== undefined &&
        g.currentStockLevel <= g.thresholdStockLevel)
  );

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
          setActiveTab('upload');
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
      setActiveTab('upload');
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
              <span>Household Caregiver Console</span>
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
              No patients registered yet. Household meals are calculated based on general health guidelines.
            </div>
          )}
        </div>
      </div>

      {/* LOW STOCK ALERT - CLEAN MODERN DASHBOARD WIDGET */}
      {lowStockItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700 shrink-0">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                    Low Stock Alerts
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {lowStockItems.length} items
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingredients nearing depletion. Update stock to align with dietary recipes.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('pantry')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Open Pantry Inventory</span>
            </button>
          </div>

          {/* Cards for items nearing depletion */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3.5">
            {lowStockItems.map((item) => {
              const days = item.daysRemaining !== undefined ? item.daysRemaining : (item.inPantryStock ? 2 : 0);
              const isUrgentDepleted = days === 0 || !item.inPantryStock;
              
              return (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 flex items-center gap-1 ${
                          isUrgentDepleted
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : days === 1
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {isUrgentDepleted ? 'Depleted' : `${days} Day${days > 1 ? 's' : ''} Left`}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Category: <span className="text-slate-400 font-sans">{item.category}</span>
                      {item.currentStockLevel !== undefined && (
                        <span className="ml-2 text-slate-400">
                          ({item.currentStockLevel}{item.unit || 'g'} left)
                        </span>
                      )}
                    </div>

                    {item.dailyConsumptionRate && (
                      <p className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 mt-2 font-mono">
                        Usage: {item.dailyConsumptionRate}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-500 mt-1.5 italic line-clamp-2">
                      Clinical Need: {item.clinicalReason}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Required: {item.quantityNeeded}
                    </span>
                    <button
                      onClick={() => onTogglePantryStock(item.id)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>{item.inPantryStock ? 'Mark Restocked' : 'Restock Now'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Internal Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'approved' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Approved Meal Plans ({approvedMeals.length})
        </button>
   {/*}    <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'upload' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Multimodal Lab Parser
        </button>
        */}
        <button
          onClick={() => setActiveTab('pantry')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pantry' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>Grocery Consolidation ({groceryItems.length})</span>
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
              {lowStockItems.length} Low
            </span>
          )}
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

      {/* TAB 1: BIOMARKER VAULT IS REMOVED */}
      
      {/* TAB: APPROVED MEAL PLANS */}
      {activeTab === 'approved' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Meal Queue */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-xs font-mono uppercase text-teal-600 font-bold tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                TODAY'S COOKING ({todaysMeals.length})
              </h2>
              <div className="space-y-2">
                {todaysMeals.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-dashed">No meals scheduled for today.</p>
                ) : (
                  todaysMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => setSelectedMealId(meal.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all text-xs cursor-pointer ${
                        meal.id === selectedMealId
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-[10px] uppercase ${meal.id === selectedMealId ? 'text-teal-300' : 'text-teal-700'}`}>
                          {meal.mealType}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${meal.id === selectedMealId ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {meal.cuisine}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-1.5 line-clamp-2">{meal.dishName}</h3>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                TOMORROW'S PREP ({tomorrowsMeals.length})
              </h2>
              <div className="space-y-2">
                {tomorrowsMeals.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic px-1">No prep scheduled for tomorrow.</p>
                ) : (
                  tomorrowsMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => setSelectedMealId(meal.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                        meal.id === selectedMealId
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] uppercase text-slate-500">
                          {meal.dayOfWeek} · {meal.mealType}
                        </span>
                      </div>
                      <h3 className="font-medium text-xs mt-1 truncate">{meal.dishName}</h3>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Instructions & Briefing */}
          <div className="lg:col-span-2 space-y-6">
            {currentMeal ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-teal-700 font-semibold">
                      CLINICAL BRIEFING · {currentMeal.cuisine}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">{currentMeal.dishName}</h2>
                    <p className="text-xs text-slate-600 mt-1">{currentMeal.baseRecipe}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Language Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1">
                        <Globe2 className="w-3.5 h-3.5 text-teal-600" /> DIALECT:
                      </span>
                      <select
                        value={activeLanguage}
                        onChange={(e) => setActiveLanguage(e.target.value as SupportedDialect)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {DIALECTS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.flag} {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (isPlayingAudio) {
                          handleStopAudio();
                        } else {
                          handleLoadBriefing();
                        }
                      }}
                      disabled={isLoadingAudio}
                      className={`px-4 py-2.5 rounded-xl font-medium text-xs shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                        isPlayingAudio ? 'bg-rose-600 text-white shadow-md' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                      }`}
                    >
                      {isLoadingAudio ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isPlayingAudio ? (
                        <Square className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                      <span>{isLoadingAudio ? 'Synthesizing...' : isPlayingAudio ? 'Stop Audio' : 'Play'}</span>
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                    SPECIAL COOKING INSTRUCTIONS &amp; CLINICAL DELTAS
                  </h3>
                  <div className="space-y-1.5">
                    {currentMeal.deltaDirectives.map((d, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 flex items-start gap-2.5 font-medium">
                        <span className="text-teal-700 font-mono font-bold">{idx + 1}.</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio Script Display */}
                {audioBriefing && (
                  <div className="space-y-4">
                    {/* Soundwave Animation during playback */}
                    {isPlayingAudio && (
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-center gap-1.5 h-12">
                        {[40, 70, 30, 90, 50, 80, 60, 100, 45, 85, 35, 75, 95, 55].map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-teal-600 rounded-full animate-pulse"
                            style={{
                              height: `${h}%`,
                              animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                            }}
                          />
                        ))}
                        <span className="text-xs font-mono text-teal-800 ml-3">
                          Speaking in {activeLanguage}...
                        </span>
                      </div>
                    )}
                    
                    <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-sans">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>SPOKEN TRANSCRIPT ({activeLanguage})</span>
                      </div>
                      <p className="text-base font-medium text-teal-200 leading-relaxed">&ldquo;{audioBriefing.scriptInDialect}&rdquo;</p>
                      <div className="text-xs text-slate-300 font-mono bg-slate-800/80 p-2.5 rounded-lg">
                        <span className="text-slate-400">Phonetics: </span>{audioBriefing.scriptPhonetic}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
                No approved dishes available.
              </div>
            )}
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
                    {items.map((item) => {
                      const isLow = item.isLowStock || !item.inPantryStock || (item.daysRemaining !== undefined && item.daysRemaining <= 3);
                      return (
                        <div
                          key={item.id}
                          className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                            isLow ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-rose-500' : 'hover:bg-slate-50/60'
                          }`}
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-medium ${
                                    item.purchased ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {item.name}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                  ({item.quantityNeeded})
                                </span>
                                {isLow && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 font-mono flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {item.daysRemaining !== undefined ? `${item.daysRemaining}d remaining` : 'LOW STOCK'}
                                  </span>
                                )}
                              </div>
                              {item.dailyConsumptionRate && (
                                <p className="text-[11px] text-amber-700 font-mono mt-0.5">
                                  Usage: {item.dailyConsumptionRate}
                                </p>
                              )}
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
                                  : 'bg-rose-100 border-rose-200 text-rose-800 font-semibold hover:bg-rose-200'
                              }`}
                            >
                              {item.inPantryStock ? 'Already in Pantry' : 'Depleted - Need to Buy'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                {(['SINGAPORE', 'JAPAN', 'SOUTH_INDIA', 'NORTH_INDIA', 'SOUTHEAST_ASIA'] as RegionalRegion[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleUpdateRegion(r)}
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
                      onClick={() => handleToggleCuisine(c)}
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
                      onClick={() => handleToggleAppliance(app)}
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
                  onChange={(e) => handleUpdateCookLanguage(e.target.value)}
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
