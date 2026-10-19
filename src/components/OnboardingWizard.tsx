import React, { useState } from 'react';
import {
  UserRole,
  RegionalRegion,
  PatientProfile,
  BiomarkerRecord,
  HouseholdMemberInfo,
} from '../types';
import {
  Home,
  Users,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Upload,
  ShieldCheck,
  ChefHat,
  Stethoscope,
  Heart,
  X,
} from 'lucide-react';

interface OnboardingWizardProps {
  initialHomeCode: string;
  onComplete: (data: {
    homeName: string;
    homeCode: string;
    region: RegionalRegion;
    activeCuisines: string[];
    activeAppliances: string[];
    cookLanguage: string;
    members: HouseholdMemberInfo[];
    patients: PatientProfile[];
    biomarkers: BiomarkerRecord[];
  }) => void;
  onCancel?: () => void;
}

const REGION_OPTIONS: Array<{ label: string; value: RegionalRegion; desc: string }> = [
  { label: 'Singapore', value: 'SINGAPORE', desc: 'Sino-Singaporean & Malay eldercare, domestic helper integration' },
  { label: 'Japan', value: 'JAPAN', desc: 'Washoku home-care, delicate dashi seasoning, senior soft texture' },
  { label: 'South India', value: 'SOUTH_INDIA', desc: 'Traditional South Indian cuisine, Idli/Dosa, kokum & mustard seed tempering' },
  { label: 'North India', value: 'NORTH_INDIA', desc: 'Traditional North Indian cuisine, Roti/Tava, low-fat curd & whole spices' },
  { label: 'Southeast Asia', value: 'SOUTHEAST_ASIA', desc: 'Filipino & Indonesian domestic helper recipes and dialects' },
];

const CUISINE_OPTIONS = [
  'South Indian Traditional',
  'North Indian Traditional',
  'Sino-Singaporean',
  'Washoku (Japanese)',
  'Western Healthy',
];

const APPLIANCE_OPTIONS = [
  'Rice Cooker (Porridge Mode)',
  'Pressure Cooker / Instant Pot',
  'Induction Cooktop',
  'Bamboo Steamer',
  'Air Fryer',
  'Traditional Wok',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialHomeCode,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Home Details
  const [homeName, setHomeName] = useState('Tan-Ramesh Household');
  const [homeCode, setHomeCode] = useState(initialHomeCode || 'HOME-8421');
  const [region, setRegion] = useState<RegionalRegion>('SINGAPORE');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([
    'South Indian Traditional',
    'North Indian Traditional',
    'Sino-Singaporean',
  ]);
  const [activeAppliances, setActiveAppliances] = useState<string[]>([
    'Pressure Cooker / Instant Pot',
    'Induction Cooktop',
  ]);
  const [cookLanguage, setCookLanguage] = useState('English');

  // Step 2: Household Members & Roles - clean state, no defaults
  const [members, setMembers] = useState<HouseholdMemberInfo[]>([]);

  const [newMemName, setNewMemName] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemAge, setNewMemAge] = useState<number | ''>(40);
  const [newMemGender, setNewMemGender] = useState('Female');
  const [newMemRole, setNewMemRole] = useState<UserRole>('cook');

  // Step 3: Patients & Lab Details - clean state, no defaults
  const [patients, setPatients] = useState<PatientProfile[]>([]);

  const [biomarkers, setBiomarkers] = useState<BiomarkerRecord[]>([]);

  // Member handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim() || !newMemEmail.trim()) return;

    setMembers((prev) => [
      ...prev,
      {
        id: `mem-${Date.now()}`,
        name: newMemName.trim(),
        email: newMemEmail.trim(),
        age: typeof newMemAge === 'number' ? newMemAge : 40,
        gender: newMemGender,
        roles: [newMemRole],
        isHomeHead: false,
        joinedAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setNewMemName('');
    setNewMemEmail('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleRoleToggle = (memberId: string, roleToToggle: UserRole) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const exists = m.roles.includes(roleToToggle);
        const updated = exists ? m.roles.filter((r) => r !== roleToToggle) : [...m.roles, roleToToggle];
        return { ...m, roles: updated.length ? updated : [roleToToggle] };
      })
    );
  };

  const handleFinish = () => {
    onComplete({
      homeName,
      homeCode,
      region,
      activeCuisines,
      activeAppliances,
      cookLanguage,
      members,
      patients,
      biomarkers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-white my-8">
        
        {/* Wizard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2.5 py-0.5 rounded-full mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STEP {step} OF 3</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {step === 1 && 'Step 1: Create & Configure Household'}
              {step === 2 && 'Step 2: Assign Roles to Household Members'}
              {step === 3 && 'Step 3: Clinical & Lab Details for Members'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1 && 'Establish your family unit, Home Code, and kitchen constraints.'}
              {step === 2 && 'Designate the Household Admin, Domestic Helper, Dietitian, and Patients.'}
              {step === 3 && 'Input clinical conditions and lab biomarkers to ground the kitchen.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold ${
                  step === s
                    ? 'bg-teal-500 text-slate-950'
                    : step > s
                    ? 'bg-teal-950 border border-teal-800 text-teal-300'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
            ))}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="ml-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Wizard"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: HOME CONFIGURATION */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400">Household Name</label>
                <input
                  type="text"
                  value={homeName}
                  onChange={(e) => setHomeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-400">Family Home Code (Unique)</label>
                <input
                  type="text"
                  value={homeCode}
                  onChange={(e) => setHomeCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-teal-400 uppercase focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            {/* Geography Selection */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Household Primary Region</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGION_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegion(r.value)}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      region === r.value
                        ? 'bg-teal-950/50 border-teal-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{r.label}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisines and Appliances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400">Active Cuisines</label>
                <div className="flex flex-wrap gap-1.5">
                  {CUISINE_OPTIONS.map((c) => {
                    const active = activeCuisines.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setActiveCuisines((prev) =>
                            prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-600 text-white border-teal-500 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400">Kitchen Hardware</label>
                <div className="flex flex-wrap gap-1.5">
                  {APPLIANCE_OPTIONS.map((app) => {
                    const active = activeAppliances.includes(app);
                    return (
                      <button
                        key={app}
                        type="button"
                        onClick={() =>
                          setActiveAppliances((prev) =>
                            prev.includes(app) ? prev.filter((item) => item !== app) : [...prev, app]
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-600 text-white border-amber-500 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {app}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MEMBERS & ROLE ASSIGNMENT */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Add member form */}
            <form onSubmit={handleAddMember} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold block">
                Add Household Member or Helper (Age, Gender &amp; Role)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Maria Santos)"
                  value={newMemName}
                  onChange={(e) => setNewMemName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newMemEmail}
                  onChange={(e) => setNewMemEmail(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  required
                />
                <select
                  value={newMemRole}
                  onChange={(e) => setNewMemRole(e.target.value as UserRole)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="cook">Domestic Cook / Helper</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="dietitian">Clinical Dietitian</option>
                  <option value="patient">Senior Patient</option>
                  <option value="admin">Household Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 72"
                    value={newMemAge}
                    onChange={(e) => setNewMemAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Gender</label>
                  <select
                    value={newMemGender}
                    onChange={(e) => setNewMemGender(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium cursor-pointer"
                >
                  + Add Member
                </button>
              </div>
            </form>

            {/* Member list with interactive role assignment */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold block">
                Assigned Roles by Home Head
              </span>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
                {members.map((mem) => (
                  <div key={mem.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{mem.name}</span>
                        {mem.isHomeHead && (
                          <span className="text-[10px] font-mono bg-teal-950 text-teal-400 border border-teal-800 px-1.5 py-0.2 rounded font-semibold">
                            HOME HEAD
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{mem.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['caregiver', 'cook', 'dietitian', 'patient', 'admin'] as UserRole[]).map((r) => {
                        const active = mem.roles.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRoleToggle(mem.id, r)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded capitalize transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {r === 'patient' ? 'senior' : r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CLINICAL LAB & BIOMARKER SETUP */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
                  Household Patients Under Care ({patients.length})
                </span>
                <span className="text-xs text-teal-400 font-mono">2 CLINICAL PRESETS LOADED</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {patients.map((p) => (
                  <div key={p.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        Age {p.age}
                      </span>
                    </div>

                    <p className="text-xs text-teal-300 font-medium">{p.primaryCondition}</p>

                    <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                      <div>Target Na: &lt;{p.targetSodiumMg} mg/day</div>
                      <div>Max GI: &lt;{p.targetMaxGI}</div>
                      {p.textureNeeds && <div className="text-amber-400">Texture: {p.textureNeeds}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Biomarkers Summary */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold block">
                Linked Lab Biomarkers (PCOS &amp; Hypertension Panels)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {biomarkers.map((bm) => (
                  <div key={bm.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
                    <span className="text-[10px] font-mono text-slate-400 block truncate">{bm.markerName}</span>
                    <span className="text-base font-mono font-bold text-white">
                      {bm.value} <span className="text-[10px] text-slate-400 font-normal">{bm.unit}</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 block mt-0.5">{bm.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="border-t border-slate-800 pt-5 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Step
              </button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Launch NutriOne Consoles</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
