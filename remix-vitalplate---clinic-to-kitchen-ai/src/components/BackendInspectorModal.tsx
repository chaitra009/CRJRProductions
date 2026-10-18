import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  Code2,
  Sparkles,
} from 'lucide-react';
import {
  getBackendHealth,
  getBackendArchitecture,
  seedDemoDatabase,
  BackendHealthResponse,
  BackendArchitectureResponse,
} from '../services/backendApi';

interface BackendInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRefresh?: () => void;
}

export const BackendInspectorModal: React.FC<BackendInspectorModalProps> = ({
  isOpen,
  onClose,
  onDataRefresh,
}) => {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [architecture, setArchitecture] = useState<BackendArchitectureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'architecture' | 'endpoints' | 'test'>('architecture');

  const refreshBackendData = async () => {
    setLoading(true);
    try {
      const [h, a] = await Promise.all([getBackendHealth(), getBackendArchitecture()]);
      setHealth(h);
      setArchitecture(a);
    } catch (err: any) {
      console.error('Failed to load backend status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshBackendData();
    }
  }, [isOpen]);

  const handleTestPythonAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ingredient-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingIngredient: 'Light Soy Sauce',
          dishName: 'Steamed Barramundi with Ginger & Scallions',
          cuisine: 'Hainanese Heritage',
          clinicalConstraints: { sodiumLimit: '<1200mg', condition: 'Hypertension & Dysphagia' },
          dialect: 'Tagalog',
        }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSeedDemoData = async () => {
    setTesting(true);
    try {
      const data = await seedDemoDatabase();
      setTestResult(JSON.stringify(data, null, 2));
      if (onDataRefresh) onDataRefresh();
      await refreshBackendData();
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Python Backend & Architecture</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  FastAPI 2.0 (Port 8000)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Clean separation: Python AI business logic & DB engine + Modern React display UI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshBackendData}
              disabled={loading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="Refresh Backend Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-indigo-50/40 border-b border-indigo-100/60 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">AI Runtime</div>
              <div className="font-semibold text-slate-800">
                Python {health?.pythonVersion || '3.11'} · Google GenAI
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">DB Persistence</div>
              <div className="font-semibold text-slate-800">
                Firestore & Local JSON Cache
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Gemini Key</div>
              <div className="font-semibold text-slate-800">
                {health?.hasGeminiApiKey ? 'Connected (Gemini 2.5)' : 'Configured / Fallback Active'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Loaded Records</div>
              <div className="font-semibold text-slate-800">
                {health?.stats ? `${health.stats.householdsCount} Homes · ${health.stats.mealsCount} Meals` : 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture Split</span>
          </button>

          <button
            onClick={() => setActiveTab('endpoints')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'endpoints'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Backend API Endpoints</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'test'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Python AI Sandbox</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Split Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Backend Box */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 relative">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-3">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <span>Python Backend (Business Logic & AI)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <span><strong>AI Compatibility Engine:</strong> Google GenAI SDK in Python (multimodal lab parsing, plate photo auditing, ingredient swaps, audio delta generation).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <span><strong>Database & Persistence:</strong> Centralized tables for households, users, patients, biomarkers, meals, and plate audits.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <span><strong>High-Performance REST API:</strong> FastAPI + Uvicorn ASGI server with standard Pydantic models.</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between text-[11px] font-mono text-indigo-700">
                    <span>Directory: backend/</span>
                    <span>Port: 8000</span>
                  </div>
                </div>

                {/* Frontend Box */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 relative">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-sm mb-3">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>Frontend UI (Presentation & Modern UX)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <span><strong>Pure UI Display:</strong> Completely detached from business rules; consumes backend data via typed client (<code>src/services/backendApi.ts</code>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <span><strong>Modern Interface:</strong> Responsive design, zero AI-slop layout, high readability for caregivers, domestic cooks, and seniors.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <span><strong>Real-time State Sync:</strong> Instant UI reactions without page refreshes or blocking operations.</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-teal-100 flex items-center justify-between text-[11px] font-mono text-teal-700">
                    <span>Directory: src/</span>
                    <span>Port: 3000</span>
                  </div>
                </div>

              </div>

              {/* Modules Breakdown */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">Backend Core Modules</h4>
                <div className="space-y-3">
                  {architecture?.modules.map((mod, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{mod.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {mod.framework}
                        </span>
                      </div>
                      {mod.capabilities && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mod.capabilities.map((cap, cIdx) => (
                            <span key={cIdx} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                      {mod.entities && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mod.entities.map((ent, eIdx) => (
                            <span key={eIdx} className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                              {ent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                All client requests route through the Python Backend REST API gateway:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">GET</span>
                  <span className="text-slate-800">/api/health</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">GET</span>
                  <span className="text-slate-800">/api/backend/architecture</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">POST</span>
                  <span className="text-slate-800">/api/parse-lab</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">POST</span>
                  <span className="text-slate-800">/api/audit-plate</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">POST</span>
                  <span className="text-slate-800">/api/ingredient-swap</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">POST</span>
                  <span className="text-slate-800">/api/audio-briefing</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">POST</span>
                  <span className="text-slate-800">/api/reindex-meals</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">GET/POST</span>
                  <span className="text-slate-800">/api/households</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">GET/POST</span>
                  <span className="text-slate-800">/api/users</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">GET/POST</span>
                  <span className="text-slate-800">/api/meals</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleTestPythonAI}
                  disabled={testing}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Python AI (Ingredient Swap in Tagalog)</span>
                </button>

                <button
                  onClick={handleSeedDemoData}
                  disabled={testing}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Seed Demo APAC Data via Python DB</span>
                </button>
              </div>

              {testResult && (
                <div className="mt-4">
                  <div className="text-[11px] font-mono text-slate-500 mb-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Python Backend Live Response:</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800 shadow-inner">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>FastAPI: Online (Port 8000)</span>
            <span>·</span>
            <span>React UI: Port 3000</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
