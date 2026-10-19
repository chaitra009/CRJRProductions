import React, { useState, useRef, useEffect } from 'react';
import { MealPlanItem, SupportedDialect, AudioBriefingData, IngredientSwapResult } from '../types';
import {
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  HelpCircle,
  Flame,
  Globe2,
} from 'lucide-react';

interface CookStationProps {
  approvedMeals: MealPlanItem[];
  allMeals: MealPlanItem[];
  defaultLanguage: SupportedDialect;
}

const DIALECTS: Array<{ label: string; value: SupportedDialect; flag: string }> = [
  { label: 'Hindi (हिन्दी)', value: 'Hindi', flag: '�🇳' },
  { label: 'Kannada (ಕನ್ನಡ)', value: 'Kannada', flag: '🇮�' },
  { label: 'Tamil (தமிழ்)', value: 'Tamil', flag: '🇮🇳' },
  { label: 'Singapore English', value: 'Singapore', flag: '��' },
  { label: '日本語 (Japanese)', value: 'Japanese', flag: '��' },
  { label: 'English', value: 'English', flag: '🌐' },
];

export const CookStation: React.FC<CookStationProps> = ({
  approvedMeals,
  allMeals,
  defaultLanguage,
}) => {
  const [selectedMealId, setSelectedMealId] = useState<string>(approvedMeals[0]?.id || '');
  const [activeLanguage, setActiveLanguage] = useState<SupportedDialect>(defaultLanguage || 'English');

  // Audio briefing state
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBriefing, setAudioBriefing] = useState<AudioBriefingData | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Push-to-talk voice swap state
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [swapQuery, setSwapQuery] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<IngredientSwapResult | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  const todaysMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === today.toLowerCase());
  const tomorrowsMeals = approvedMeals.filter(m => m.dayOfWeek.toLowerCase() === tomorrow.toLowerCase());

  const currentMeal = todaysMeals.find((m) => m.id === selectedMealId) || todaysMeals[0] || tomorrowsMeals[0];
  const unapprovedMeals = allMeals.filter((m) => m.approvalStatus !== 'APPROVED_ACTIVE');
  const hasOnlyUnapproved = approvedMeals.length === 0 && allMeals.length > 0;

  // Trigger audio briefing load when dish or language changes
  const handleLoadBriefing = async () => {
    if (!currentMeal) return;
    setIsLoadingAudio(true);
    try {
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
      if (json.success && json.data) {
        setAudioBriefing(json.data);
        if (json.data.audioBase64) {
          playAudioBase64(json.data.audioBase64);
        } else {
          speakWithBrowser(json.data.scriptPhonetic || json.data.scriptEnglishTranslation);
        }
      }
    } catch (err) {
      console.error('Audio briefing error:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const playAudioBase64 = (base64Wav: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audioUrl = `data:audio/wav;base64,${base64Wav}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      // Fallback
      if (audioBriefing) {
        speakWithBrowser(audioBriefing.scriptPhonetic || audioBriefing.scriptEnglishTranslation);
      }
    };
    audio.play();
  };

  const speakWithBrowser = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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

  // Push-to-Talk Speech Recognition
  const startPushToTalk = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListeningMic(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang =
        activeLanguage === 'Japanese'
          ? 'ja-JP'
          : activeLanguage === 'Tamil'
          ? 'ta-IN'
          : activeLanguage === 'Hindi'
          ? 'hi-IN'
          : activeLanguage === 'Kannada'
          ? 'kn-IN'
          : 'en-US';

      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListeningMic(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSwapQuery(transcript);
        executeIngredientSwap(transcript);
      };
      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);

      recognition.start();
    } catch {
      setIsListeningMic(true);
    }
  };

  const executeIngredientSwap = async (queryText: string) => {
    if (!queryText.trim() || !currentMeal) return;
    setIsSwapping(true);
    setSwapError(null);

    try {
      const res = await fetch('/api/ingredient-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingIngredient: queryText,
          dishName: currentMeal.dishName,
          cuisine: currentMeal.cuisine,
          dialect: activeLanguage,
          clinicalConstraints: {
            pcosInsulinResistance: true,
            hypertensionSodiumRestricted: true,
            renalPurineRestricted: true,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Swap calculation failed');

      setSwapResult(json.data);
      // Play brief spoken dialect instruction
      if (json.data.cookDialectInstruction) {
        speakWithBrowser(json.data.cookDialectInstruction);
      }
    } catch (err: any) {
      setSwapError(err.message || 'Failed to find clinically approved substitution.');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Persona 2: The Domestic Cook / Eldercare Helper</span>
              <span>·</span>
              <span>The Cook&apos;s Station</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Clinic-to-Kitchen: Meal Preparation &amp; Audio Briefing
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Spoken audio briefings in your language focusing on clinical adjustments and special cooking instructions.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-teal-400" /> DIALECT:
            </span>
            <select
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value as SupportedDialect)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-700 rounded-xl bg-slate-950 text-white focus:outline-none cursor-pointer"
            >
              {DIALECTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.flag} {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gatekeeper Security Notice */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-teal-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Gatekeeper Enforced: Only displaying meals signed off by Clinical Dietitian.</span>
          </div>
          {unapprovedMeals.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>{unapprovedMeals.length} DRAFT MEALS LOCKED AWAITING SIGN-OFF</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Active Dish Selection + 20-Second Delta Audio Station */}
      {hasOnlyUnapproved ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Weekly Plan Locked</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            Vertex AI has calculated the family diet plan, but it is currently awaiting review and sign-off by the Clinical Dietitian.
          </p>
          <div className="pt-4 border-t border-slate-100 mt-6">
            <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest">Awaiting Approval For:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {unapprovedMeals.map(m => (
                <span key={m.id} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                  {m.dishName}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Meal Queue */}
        <div className="space-y-6">
          {/* Today's Meals */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase text-teal-600 font-bold tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              TODAY'S COOKING ({todaysMeals.length})
            </h2>
            <div className="space-y-2">
              {todaysMeals.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-dashed">No meals scheduled for today.</p>
              ) : (
                todaysMeals.map((meal) => {
                  const isSelected = meal.id === currentMeal?.id;
                  return (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setSelectedMealId(meal.id);
                        setAudioBriefing(null);
                        setSwapResult(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-[10px] uppercase ${isSelected ? 'text-teal-300' : 'text-teal-700'}`}>
                          {meal.mealType}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {meal.cuisine}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-1.5 line-clamp-2">{meal.dishName}</h3>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Tomorrow's Prep */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              TOMORROW'S PREP ({tomorrowsMeals.length})
            </h2>
            <div className="space-y-2">
              {tomorrowsMeals.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic px-1">No prep scheduled for tomorrow.</p>
              ) : (
                tomorrowsMeals.map((meal) => {
                  const isSelected = meal.id === currentMeal?.id;
                  return (
                    <button
                      key={meal.id}
                      onClick={() => {
                        setSelectedMealId(meal.id);
                        setAudioBriefing(null);
                        setSwapResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
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
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Middle & Right: The Audio Briefing Deck & Voice Swap */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Audio Briefing Card */}
          {currentMeal ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-teal-700 font-semibold">
                    DELTA-ONLY BRIEFING · {currentMeal.cuisine}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {currentMeal.dishName}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {currentMeal.baseRecipe}
                  </p>
                </div>

                <button
                  onClick={isPlayingAudio ? handleStopAudio : handleLoadBriefing}
                  disabled={isLoadingAudio}
                  className={`px-4 py-2.5 rounded-xl font-medium text-xs shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                  }`}
                >
                  {isLoadingAudio ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isPlayingAudio ? (
                    <Square className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span>
                    {isLoadingAudio
                      ? 'Synthesizing...'
                      : isPlayingAudio
                      ? 'Stop Audio'
                      : `Play 20s Briefing in ${activeLanguage}`}
                  </span>
                </button>
              </div>

              {/* Advanced Family Synthesis: Separation Instructions */}
              {currentMeal.separationInstructions && currentMeal.separationInstructions.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>FORK-IN-THE-ROAD: CLINICAL SEPARATION STEPS</span>
                  </div>
                  <div className="space-y-2">
                    {currentMeal.separationInstructions.map((si, idx) => (
                      <div key={idx} className="bg-white/80 p-3 rounded-lg border border-amber-100 flex items-start gap-3">
                        <div className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5">
                          Separate
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900">{si.step}</p>
                          <p className="text-xs text-slate-700">{si.action}</p>
                          <p className="text-[10px] text-amber-800 italic">Reason: {si.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Member Portion Notes */}
              {currentMeal.individualPortionNotes && Object.keys(currentMeal.individualPortionNotes).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(currentMeal.individualPortionNotes).map(([patientId, note]) => {
                    return (
                      <div key={patientId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[10px] shrink-0">
                           {patientId.substring(0, 2).toUpperCase()}
                         </div>
                         <div>
                           <p className="text-[10px] font-mono text-slate-500 uppercase">Portion Target</p>
                           <p className="text-xs font-semibold text-slate-900">{note}</p>
                         </div>
                      </div>
                    );
                  })}
                </div>
              )}

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

              {/* Doctor-Ordered Delta Directives */}
              <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                    SPECIAL COOKING INSTRUCTIONS &amp; CLINICAL DELTAS
                  </h3>
                <div className="space-y-1.5">
                  {currentMeal.deltaDirectives.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 flex items-start gap-2.5 font-medium"
                    >
                      <span className="text-teal-700 font-mono font-bold">{idx + 1}.</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dialect Script & Phonetic Display */}
              {audioBriefing && (
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-sans">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>SPOKEN TRANSCRIPT ({activeLanguage})</span>
                    <span>Gemini 3.8 Flash Audio</span>
                  </div>

                  <p className="text-base font-medium text-teal-200 leading-relaxed">
                    &ldquo;{audioBriefing.scriptInDialect}&rdquo;
                  </p>

                  <div className="text-xs text-slate-300 font-mono bg-slate-800/80 p-2.5 rounded-lg">
                    <span className="text-slate-400">Phonetics: </span>
                    {audioBriefing.scriptPhonetic}
                  </div>

                  <div className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">English: </span>
                    {audioBriefing.scriptEnglishTranslation}
                  </div>
                </div>
              )}

              {/* Flavor Compensation Card */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Cultural Flavor Compensation Guidance</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {currentMeal.flavorCompensation}
                </p>
                {currentMeal.textureGuidance && (
                  <p className="text-xs text-amber-800 font-medium pt-1 border-t border-amber-200/60">
                    <span className="font-semibold">Senior Texture Note: </span>
                    {currentMeal.textureGuidance}
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
              No approved dishes available. Please check Dietitian console to approve meals.
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
};
