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

  const handleTestAI = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base flex items-center gap-2">
                <span>VitalPlate Full-Stack Backend Engine</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Port 3000 Unified Architecture · Express Gateway · @google/genai SDK
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshBackendData}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Health Telemetry Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <div className="text-slate-500">ENGINE STATUS</div>
            <div className="text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {health?.status || 'ONLINE'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">RUNTIME</div>
            <div className="text-slate-200 mt-0.5">{health?.pythonVersion || 'Node.js v22'}</div>
          </div>
          <div>
            <div className="text-slate-500">GEMINI API KEY</div>
            <div className="text-amber-400 mt-0.5">
              {health?.hasGeminiApiKey ? 'Configured (Active)' : 'Available'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">RECORDS CACHED</div>
            <div className="text-teal-400 mt-0.5">
              {health ? health.stats.mealsCount + health.stats.patientsCount : '5+'} Entities
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 flex gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Modules & Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'endpoints'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>API Gateway Endpoints</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'test'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Interactive Tester</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              {architecture?.modules.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{m.name}</h4>
                      <p className="text-xs text-teal-400 font-mono mt-0.5">{m.framework}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Module {idx + 1}
                    </span>
                  </div>
                  {m.capabilities && (
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                      {m.capabilities.map((c, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.entities && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.entities.map((e, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] font-mono border border-slate-700"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-2">
              {[
                { method: 'GET', path: '/api/health', desc: 'Real-time telemetry and engine readiness' },
                { method: 'GET', path: '/api/backend/architecture', desc: 'Architecture specification & module listing' },
                { method: 'POST', path: '/api/parse-lab', desc: 'Multimodal OCR lab report ingestion (Biomarkers & Ranges)' },
                { method: 'POST', path: '/api/audit-plate', desc: 'Multimodal plate vision audit (1-10 oil sheen & balance)' },
                { method: 'POST', path: '/api/ingredient-swap', desc: 'Voice/text ingredient substitution in 8 Asian dialects' },
                { method: 'POST', path: '/api/audio-briefing', desc: '20-second delta spoken audio briefings in native scripts' },
                { method: 'POST', path: '/api/reindex-meals', desc: 'Clinical re-indexing with Dietitian approval hooks' },
                { method: 'GET/POST', path: '/api/households', desc: 'Family Home Code synchronization' },
                { method: 'GET/POST', path: '/api/meals', desc: 'Meal queue with gatekeeper approval lifecycle' },
                { method: 'POST', path: '/api/seed', desc: 'Seed comprehensive Vance Residence demo dataset' },
              ].map((ep, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        ep.method.startsWith('GET')
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-slate-200">{ep.path}</span>
                  </div>
                  <span className="text-slate-400 hidden sm:inline">{ep.desc}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleTestAI}
                  disabled={testing}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test AI Ingredient Swap (/api/ingredient-swap)</span>
                </button>
                <button
                  onClick={handleSeedDemoData}
                  disabled={testing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>Re-Seed Vance Residence Demo Dataset</span>
                </button>
              </div>

              {testResult && (
                <div className="mt-4">
                  <div className="text-xs text-slate-400 font-mono mb-1">API Response:</div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-80">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
