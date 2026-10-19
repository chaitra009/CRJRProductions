import React, { useState } from 'react';
import {
  Home,
  Users,
  ShieldCheck,
  ChefHat,
  Stethoscope,
  Heart,
  ArrowRight,
  Sparkles,
  Check,
  AlertCircle,
  Search,
  LogOut,
  Globe,
  UtensilsCrossed,
} from 'lucide-react';
import {
  UserRole,
  RegionalRegion,
  HouseholdMemberInfo,
  PatientProfile,
  BiomarkerRecord,
  SupportedDialect,
  HouseholdRecord,
} from '../types';
import * as backendApi from '../services/backendApi';

interface HouseholdGatePageProps {
  userEmail: string;
  userName: string;
  userId: string;
  onJoinHousehold: (data: {
    homeCode: string;
    role: UserRole;
    name: string;
    age: number;
    gender: string;
    dialect?: string;
    conditions?: string[];
  }) => void;
  onCreateHousehold: (data: {
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
  onSignOut: () => void;
}

const REGION_OPTIONS: Array<{ label: string; value: RegionalRegion; desc: string }> = [
  { label: 'Singapore', value: 'SINGAPORE', desc: 'Sino-Singaporean & Malay eldercare, domestic helper integration' },
  { label: 'Japan', value: 'JAPAN', desc: 'Washoku home-care, delicate dashi seasoning, senior soft texture' },
  { label: 'South India', value: 'SOUTH_INDIA', desc: 'Traditional South Indian cuisine, Idli/Dosa, kokum & mustard seed tempering' },
  { label: 'North India', value: 'NORTH_INDIA', desc: 'Traditional North Indian cuisine, Roti/Tava, low-fat curd & whole spices' },
  { label: 'Southeast Asia', value: 'SOUTHEAST_ASIA', desc: 'Filipino & Indonesian domestic helper recipes and dialects' },
];

const DIALECT_OPTIONS: SupportedDialect[] = [
  'Hindi',
  'Kannada',
  'Tamil',
  'Singapore',
  'Japanese',
  'English',
];

const DEFAULT_CUISINES = [
  'South Indian Traditional',
  'North Indian Traditional',
  'Sino-Singaporean',
  'Washoku (Japanese)',
  'Western Healthy',
];

const DEFAULT_APPLIANCES = [
  'Idli Steamer / Wet Grinder',
  'Pressure Cooker / Instant Pot',
  'Induction Cooktop',
  'Roti Maker / Tava',
  'Air Fryer',
  'Traditional Wok / Kadai',
];

export const HouseholdGatePage: React.FC<HouseholdGatePageProps> = ({
  userEmail,
  userName,
  userId,
  onJoinHousehold,
  onCreateHousehold,
  onSignOut,
}) => {
  // Mode: null = Gate choice screen (ONLY TWO OPTIONS: 'join' | 'create')
  const [selectedMode, setSelectedMode] = useState<'join' | 'create' | null>(null);

  // ==================== JOIN HOUSEHOLD STATE ====================
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<UserRole>('caregiver_cook');
  const [joinName, setJoinName] = useState(userName || '');
  const [joinAge, setJoinAge] = useState<number>(36);
  const [joinGender, setJoinGender] = useState('Female');
  const [joinDialect, setJoinDialect] = useState<string>('English');
  const [joinConditions, setJoinConditions] = useState<string>('Hypertension, PCOS');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifiedHousehold, setVerifiedHousehold] = useState<HouseholdRecord | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ==================== CREATE HOUSEHOLD STATE ====================
  const [homeName, setHomeName] = useState(`${userName ? userName.split(' ')[0] : 'Family'}'s Residence`);
  const [homeCode, setHomeCode] = useState(`VITAL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [region, setRegion] = useState<RegionalRegion>('SINGAPORE');
  const [cookLanguage, setCookLanguage] = useState<string>('English');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([
    'Sino-Singaporean',
    'Washoku (Japanese)',
    'Filipino',
  ]);
  const [activeAppliances, setActiveAppliances] = useState<string[]>([
    'Rice Cooker (Porridge Mode)',
    'Induction Cooktop',
    'Air Fryer',
  ]);
  const [createStep, setCreateStep] = useState<1 | 2>(1);

  // Helper to verify code against Python backend
  const handleVerifyHomeCode = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a household access code');
      return;
    }
    setVerifyingCode(true);
    setJoinError(null);
    try {
      const hh = await backendApi.fetchHouseholdByCodeOrId(joinCode.trim().toUpperCase());
      if (hh) {
        setVerifiedHousehold(hh);
      } else {
        setJoinError(`No household found with code "${joinCode.toUpperCase()}". Check with your family admin or create a new household.`);
      }
    } catch {
      // Local fallback check
      if (joinCode.trim().toUpperCase().includes('VITAL') || joinCode.trim().toUpperCase().includes('APAC')) {
        setVerifiedHousehold({
          id: 'hh-found',
          homeCode: joinCode.trim().toUpperCase(),
          name: 'Verified Family Household',
          region: 'SINGAPORE',
          memberIds: [],
          activeCuisines: ['Sino-Singaporean'],
          activeAppliances: ['Rice Cooker'],
          defaultCookLanguage: 'English',
          createdAt: new Date().toISOString(),
        });
      } else {
        setJoinError(`Household code not found. Please verify the code with your family.`);
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleExecuteJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Household code is required.');
      return;
    }
    onJoinHousehold({
      homeCode: joinCode.trim().toUpperCase(),
      role: joinRole,
      name: joinName.trim() || userName || 'Household Member',
      age: joinAge || 35,
      gender: joinGender,
      dialect: joinRole === 'cook' ? joinDialect : undefined,
      conditions: joinRole === 'patient' ? joinConditions.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
    });
  };

  const handleExecuteCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const adminMember: HouseholdMemberInfo = {
      id: userId || `usr-${Date.now()}`,
      name: userName || 'Household Admin',
      email: userEmail || 'head@vitalplate.app',
      age: 45,
      gender: 'Other',
      roles: ['admin', 'caregiver'],
      isHomeHead: true,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    onCreateHousehold({
      homeName: homeName.trim() || 'My Family Household',
      homeCode: homeCode.trim().toUpperCase(),
      region,
      activeCuisines,
      activeAppliances,
      cookLanguage,
      members: [adminMember],
      patients: [],
      biomarkers: [],
    });
  };

  const toggleCuisine = (c: string) => {
    setActiveCuisines((prev) => (prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]));
  };

  const toggleAppliance = (a: string) => {
    setActiveAppliances((prev) => (prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-teal-500/10 via-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-8">
        
        {/* Top Header with User Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-xs font-mono text-teal-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>HOUSEHOLD SETUP GATE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Welcome, {userName || 'Family Member'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Signed in as <span className="font-mono text-teal-400">{userEmail}</span>. No active household was found for your account.
            </p>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors self-start sm:self-center cursor-pointer border border-slate-800"
            title="Sign in with a different account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: GATE CHOICE SCREEN (ONLY TWO EXPLICIT OPTIONS: JOIN OR CREATE)    */}
        {/* ========================================================================= */}
        {selectedMode === null && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                How would you like to set up your kitchen?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                NutriOne connects caregivers, domestic cooks, and clinicians around a shared household. Choose one of the two options below:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* OPTION 1: JOIN AN EXISTING HOUSEHOLD */}
              <div
                onClick={() => setSelectedMode('join')}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-800/50 hover:from-slate-800 hover:to-slate-800 border-2 border-slate-700 hover:border-teal-400/80 transition-all cursor-pointer shadow-lg hover:shadow-teal-500/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                        Join Existing Household
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold uppercase">
                        Have a Code
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Enter the Household Access Code provided by your family head or employer (e.g. <span className="font-mono text-slate-300">VITAL-8821</span>) to connect as a caregiver, cook, dietitian, or senior patient.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                  <span>Enter Code &amp; Join &rarr;</span>
                </div>
              </div>

              {/* OPTION 2: CREATE A NEW HOUSEHOLD */}
              <div
                onClick={() => setSelectedMode('create')}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-800/50 hover:from-slate-800 hover:to-slate-800 border-2 border-slate-700 hover:border-indigo-400/80 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        Create New Household
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase">
                        New Admin
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Start fresh as the Household Admin. Set your home region, cooking appliances, cultural cuisines, and generate a unique family code to invite members.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Start New Household &rarr;</span>
                </div>
              </div>

            </div>


          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: JOIN HOUSEHOLD FORM                                               */}
        {/* ========================================================================= */}
        {selectedMode === 'join' && (
          <form onSubmit={handleExecuteJoin} className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode(null);
                  setVerifiedHousehold(null);
                  setJoinError(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                &larr; Back to Household Options
              </button>
              <span className="text-xs font-mono text-teal-400 font-semibold">OPTION 1: JOIN</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Join an Existing Household</h2>
              <p className="text-xs text-slate-400">
                Enter your family access code and tell us who you are.
              </p>
            </div>

            {/* Code Input with Verification */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Household Access Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setVerifiedHousehold(null);
                    setJoinError(null);
                  }}
                  placeholder="e.g. VITAL-8821"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-teal-500 uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={handleVerifyHomeCode}
                  disabled={verifyingCode || !joinCode.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-700 disabled:opacity-50"
                >
                  {verifyingCode ? 'Checking...' : 'Verify Code'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span>Demo Code:</span>
                <button
                  type="button"
                  onClick={() => {
                    setJoinCode('VITAL-8821');
                    setVerifiedHousehold({
                      id: 'hh-prime',
                      homeCode: 'VITAL-8821',
                      name: 'Vance Family Household',
                      region: 'SINGAPORE',
                      memberIds: [],
                      activeCuisines: ['Sino-Singaporean', 'Washoku (Japanese)'],
                      activeAppliances: ['Rice Cooker (Porridge Mode)', 'Pressure Cooker / Instant Pot'],
                      defaultCookLanguage: 'English',
                      createdAt: new Date().toISOString(),
                    });
                    setJoinError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono text-[10px] hover:bg-teal-500/20 cursor-pointer transition-colors"
                >
                  VITAL-8821
                </button>
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{joinError}</span>
                </div>
              )}

              {verifiedHousehold && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    Verified: <strong>{verifiedHousehold.name}</strong> ({verifiedHousehold.region})
                  </span>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Select Your Role in This Home
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { role: 'caregiver_cook', label: 'Caregiver / Cook', icon: ChefHat, desc: 'Kitchen & Caregiver Station' },
                  { role: 'dietitian', label: 'Dietitian', icon: Stethoscope, desc: 'Clinical Guardrails & Approvals' },
                  { role: 'member', label: 'Members', icon: Users, desc: 'Household Member & Patient View' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = joinRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setJoinRole(item.role as UserRole)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-teal-500/20 border-teal-500 text-white shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Age</label>
                <input
                  type="number"
                  value={joinAge}
                  onChange={(e) => setJoinAge(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Gender</label>
                <select
                  value={joinGender}
                  onChange={(e) => setJoinGender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Cook dialect preference */}
            {joinRole === 'cook' && (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs text-amber-300 font-semibold block">
                  Preferred Spoken Kitchen Dialect
                </label>
                <select
                  value={joinDialect}
                  onChange={(e) => setJoinDialect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {DIALECT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Doctor delta instructions and ingredient swaps will be read out loud to you in this language.
                </p>
              </div>
            )}

            {/* Patient medical conditions */}
            {joinRole === 'patient' && (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <label className="text-xs text-sky-300 font-semibold block">
                  Primary Health Conditions
                </label>
                <input
                  type="text"
                  value={joinConditions}
                  onChange={(e) => setJoinConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Dysphagia, PCOS, Type 2 Diabetes"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400"
                />
                <p className="text-[11px] text-slate-400">
                  Separate with commas. These determine your daily sodium and glycemic index thresholds.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-teal-500/20"
              >
                Join Household
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CREATE HOUSEHOLD FLOW                                             */}
        {/* ========================================================================= */}
        {selectedMode === 'create' && (
          <form onSubmit={handleExecuteCreate} className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                &larr; Back to Household Options
              </button>
              <span className="text-xs font-mono text-indigo-400 font-semibold">OPTION 2: CREATE</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Create a New Household</h2>
              <p className="text-xs text-slate-400">
                You will be designated as the Household Admin with full clinical and kitchen management rights.
              </p>
            </div>

            {/* Step 1: Basics */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Household Name</label>
                  <input
                    type="text"
                    value={homeName}
                    onChange={(e) => setHomeName(e.target.value)}
                    placeholder="e.g. Vance Residence"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 flex items-center justify-between">
                    <span>Generated Access Code</span>
                    <span className="text-teal-400 text-[10px]">Invite Code</span>
                  </label>
                  <input
                    type="text"
                    value={homeCode}
                    onChange={(e) => setHomeCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-500 uppercase"
                    required
                  />
                </div>
              </div>

              {/* Region selection */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Regional Caregiving Location
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {REGION_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setRegion(opt.value)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        region === opt.value
                          ? 'bg-indigo-500/20 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cook Language */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Default Cook / Domestic Helper Language
                </label>
                <select
                  value={cookLanguage}
                  onChange={(e) => setCookLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  {DIALECT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Cuisines */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Active Cultural Cuisines
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CUISINES.map((c) => {
                    const isSelected = activeCuisines.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCuisine(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Appliances */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Available Kitchen Appliances
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_APPLIANCES.map((a) => {
                    const isSelected = activeAppliances.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAppliance(a)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Create &amp; Launch Household
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
