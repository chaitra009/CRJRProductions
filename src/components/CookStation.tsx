import React, { useState, useRef } from 'react';
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
  { label: 'Tagalog', value: 'Tagalog', flag: '🇵🇭' },
  { label: '日本語 (Japanese)', value: 'Japanese', flag: '🇯🇵' },
  { label: '华语 (Mandarin)', value: 'Mandarin', flag: '🇨🇳' },
  { label: 'Bahasa Indonesia', value: 'Bahasa Indonesia', flag: '🇮🇩' },
  { label: 'Tamil (தமிழ்)', value: 'Tamil', flag: '🇮🇳' },
  { label: 'Hindi (हिन्दी)', value: 'Hindi', flag: '🇮🇳' },
  { label: 'Kannada (ಕನ್ನಡ)', value: 'Kannada', flag: '🇮🇳' },
  { label: 'English', value: 'English', flag: '🌐' },
];

export const CookStation: React.FC<CookStationProps> = ({
  approvedMeals,
  allMeals,
  defaultLanguage,
}) => {
  const [selectedMealId, setSelectedMealId] = useState<string>(approvedMeals[0]?.id || '');
  const [activeLanguage, setActiveLanguage] = useState<SupportedDialect>(defaultLanguage || 'Tagalog');

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

  const currentMeal = approvedMeals.find((m) => m.id === selectedMealId) || approvedMeals[0];
  const unapprovedMeals = allMeals.filter((m) => m.approvalStatus !== 'APPROVED_ACTIVE');

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
        speakWithBrowser(json.data.scriptPhonetic || json.data.scriptEnglishTranslation);
      }
    } catch (err) {
      console.error('Audio briefing error:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const speakWithBrowser = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const handleMicToggle = () => {
    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSwapQuery('Walang toyo, anong pwedeng ipalit? (No soy sauce, what can substitute?)');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang =
        activeLanguage === 'Tagalog'
          ? 'tl-PH'
          : activeLanguage === 'Japanese'
          ? 'ja-JP'
          : activeLanguage === 'Mandarin'
          ? 'zh-CN'
          : activeLanguage === 'Bahasa Indonesia'
          ? 'id-ID'
          : activeLanguage === 'Tamil'
          ? 'ta-IN'
          : activeLanguage === 'Hindi'
          ? 'hi-IN'
          : activeLanguage === 'Kannada'
          ? 'kn-IN'
          : 'en-US';

      recognition.onstart = () => setIsListeningMic(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSwapQuery(transcript);
        handleSwapRequest(transcript);
      };
      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleSwapRequest = async (overrideQuery?: string) => {
    const query = overrideQuery || swapQuery;
    if (!query.trim()) return;

    setIsSwapping(true);
    setSwapError(null);
    try {
      const res = await fetch('/api/ingredient-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingIngredient: query,
          dishName: currentMeal?.dishName || 'Steamed Barramundi',
          cuisine: currentMeal?.cuisine || 'Hainanese Heritage',
          clinicalConstraints: { sodiumLimit: '<1200mg', condition: 'Senior Hypertension' },
          dialect: activeLanguage,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Swap calculation failed');
      setSwapResult(json.data);

      if (json.data.cookDialectInstruction) {
        speakWithBrowser(json.data.cookDialectInstruction);
      }
    } catch (err: any) {
      setSwapError(err.message);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
              DOMESTIC COOK'S STATION
            </span>
            <span className="text-xs text-slate-400">· Gatekeeper Approved Dishes Only</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Delta Briefings & Voice Ingredient Swaps</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Never generic recipes: only doctor-ordered adjustments (oil, salt, grain, texture) delivered in your native language via 20-second audio briefings and hands-free push-to-talk mic.
          </p>
        </div>

        {/* Dialect Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <Globe2 className="w-4 h-4 text-slate-400 ml-1.5" />
          <div className="flex flex-wrap gap-1">
            {DIALECTS.map((d) => (
              <button
                key={d.value}
                onClick={() => setActiveLanguage(d.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeLanguage === d.value
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{d.flag} </span>
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {approvedMeals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <Lock className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Approved Meals Ready for Cooking</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Under the Gatekeeper Protocol ("No Approval, No Cooking"), meals currently in draft status must be signed off by the Clinical Dietitian before appearing in the kitchen.
          </p>
          {unapprovedMeals.length > 0 && (
            <div className="text-xs font-mono text-amber-400">
              {unapprovedMeals.length} dishes awaiting dietitian sign-off.
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Approved Dishes Queue */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase font-mono text-slate-400">
              Today's Approved Kitchen Queue ({approvedMeals.length})
            </h3>
            <div className="space-y-2">
              {approvedMeals.map((meal) => {
                const isSelected = meal.id === currentMeal?.id;
                return (
                  <div
                    key={meal.id}
                    onClick={() => {
                      setSelectedMealId(meal.id);
                      setAudioBriefing(null);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/50 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 uppercase">
                        {meal.dayOfWeek} · {meal.mealType}
                      </span>
                      <span className="text-teal-400 font-medium">{meal.cuisine}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1">{meal.dishName}</h4>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{meal.deltaDirectives.length} medical deltas</span>
                      <span className="text-emerald-400 font-mono">Approved</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Audio Briefing & Push-to-Talk Mic */}
          <div className="lg:col-span-2 space-y-4">
            {currentMeal && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-400 uppercase">
                      {currentMeal.dayOfWeek} · {currentMeal.mealType}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                      VERIFIED BY DIETITIAN
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">{currentMeal.dishName}</h2>
                  <p className="text-xs text-slate-400 mt-1">{currentMeal.baseRecipe}</p>
                </div>

                {/* 20s Delta Audio Player */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-white">
                        20-Second Delta Audio Briefing ({activeLanguage})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPlayingAudio ? (
                        <button
                          onClick={handleStopAudio}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleLoadBriefing}
                          disabled={isLoadingAudio}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isLoadingAudio ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                          )}
                          <span>Play Audio Briefing</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {audioBriefing && (
                    <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Native Script:</span>
                        <div className="text-amber-300 font-medium mt-0.5">{audioBriefing.scriptInDialect}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Phonetic Romanization:</span>
                        <div className="text-slate-300 italic mt-0.5">{audioBriefing.scriptPhonetic}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">English Translation:</span>
                        <div className="text-slate-400 mt-0.5">{audioBriefing.scriptEnglishTranslation}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Medical Deltas List */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-semibold text-white text-xs">Medical Directives to Follow:</h4>
                  <ul className="space-y-1.5">
                    {currentMeal.deltaDirectives.map((d, i) => (
                      <li key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">#{i + 1}</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Flavor Compensation Card */}
                {currentMeal.flavorCompensation && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                    <span className="font-bold text-amber-400">Flavor Compensation Tip: </span>
                    <span className="text-amber-200">{currentMeal.flavorCompensation}</span>
                  </div>
                )}

                {/* Push-to-Talk Ingredient Swap */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">Missing an Ingredient? Push-to-Talk Mic</h4>
                      <p className="text-[11px] text-slate-400">Ask in your language (e.g. "Walang toyo, anong ipalit?")</p>
                    </div>

                    <button
                      onClick={handleMicToggle}
                      className={`p-3 rounded-full transition-all shadow-md ${
                        isListeningMic
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                      }`}
                    >
                      {isListeningMic ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or type missing ingredient (e.g. Light soy sauce, white rice, mirin)..."
                      value={swapQuery}
                      onChange={(e) => setSwapQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSwapRequest()}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                    />
                    <button
                      onClick={() => handleSwapRequest()}
                      disabled={isSwapping || !swapQuery.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50"
                    >
                      {isSwapping ? 'Analyzing...' : 'Ask AI'}
                    </button>
                  </div>

                  {swapResult && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Recommended Clinical Swap:</span>
                        <span className="text-emerald-400 font-mono font-medium">Safe for Sodium & GI</span>
                      </div>
                      <div className="text-amber-300 font-semibold">{swapResult.bestSwap.substituteName}</div>
                      <div className="text-slate-300">Ratio: {swapResult.bestSwap.ratio}</div>
                      <div className="text-slate-400">{swapResult.bestSwap.flavorProfileNote}</div>
                      {swapResult.cookDialectInstruction && (
                        <div className="p-2.5 rounded bg-amber-500/10 text-amber-200 font-medium border border-amber-500/20">
                          {swapResult.cookDialectInstruction}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
