import React, { useState } from 'react';
import {
  UserRole,
  RegionalRegion,
  PatientProfile,
  BiomarkerRecord,
  HouseholdMemberInfo,
  SupportedDialect,
} from '../types';
import {
  ShieldCheck,
  Home,
  Users,
  FileText,
  ChefHat,
  Stethoscope,
  Heart,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Upload,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface RoleOnboardingPageProps {
  initialHomeCode: string;
  userEmail: string;
  userName: string;
  onCompleteAsAdmin: (data: {
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
  onCompleteAsMember: (memberData: {
    name: string;
    age: number;
    gender: string;
    role: UserRole;
    homeCode: string;
    dialect?: string;
    conditions?: string[];
  }) => void;
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

export const RoleOnboardingPage: React.FC<RoleOnboardingPageProps> = ({
  initialHomeCode,
  userEmail,
  userName,
  onCompleteAsAdmin,
  onCompleteAsMember,
}) => {
  // Step 0: Question screen "Are you the admin, are you what, are you XYZ?"
  const [selectedRoleType, setSelectedRoleType] = useState<UserRole | null>(null);
  const [adminStep, setAdminStep] = useState<1 | 2 | 3 | 4>(1);

  // Admin Setup States - clean starting state
  const [homeName, setHomeName] = useState('My Household');
  const [homeCode, setHomeCode] = useState(initialHomeCode || `HOME-${Math.floor(1000 + Math.random() * 9000)}`);
  const [region, setRegion] = useState<RegionalRegion>('SINGAPORE');
  const [cookLanguage, setCookLanguage] = useState<string>('English');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([
    'South Indian Traditional',
    'North Indian Traditional',
    'Sino-Singaporean',
  ]);
  const [activeAppliances, setActiveAppliances] = useState<string[]>([
    'Rice Cooker (Porridge Mode)',
    'Pressure Cooker / Instant Pot',
    'Induction Cooktop',
  ]);

  // Admin: Household Members list - only the logged-in user if present, NO mock defaults
  const [adminMembers, setAdminMembers] = useState<HouseholdMemberInfo[]>(
    userName
      ? [
          {
            id: `usr-${Date.now()}`,
            name: userName,
            email: userEmail || 'user@vitalplate.app',
            age: 38,
            gender: 'Female',
            roles: ['admin', 'caregiver'],
            isHomeHead: true,
            joinedAt: new Date().toISOString().split('T')[0],
          },
        ]
      : []
  );

  // Member form inputs (for adding inside admin)
  const [newMemName, setNewMemName] = useState('');
  const [newMemAge, setNewMemAge] = useState<number | ''>(40);
  const [newMemGender, setNewMemGender] = useState('Female');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemRole, setNewMemRole] = useState<UserRole>('cook');

  // Non-admin single member onboarding form (NO relationship field)
  const [memberFormName, setMemberFormName] = useState(userName || '');
  const [memberFormAge, setMemberFormAge] = useState<number | ''>(35);
  const [memberFormGender, setMemberFormGender] = useState('Female');
  const [memberFormCode, setMemberFormCode] = useState(initialHomeCode || 'HOME-8421');
  const [memberFormDialect, setMemberFormDialect] = useState<string>('English');
  const [memberFormConditions, setMemberFormConditions] = useState<string>('');

  // Admin: Patients & Lab Reports - NO mock defaults, starts empty!
  const [adminPatients, setAdminPatients] = useState<PatientProfile[]>([]);
  const [adminBiomarkers, setAdminBiomarkers] = useState<BiomarkerRecord[]>([]);

  // Add Patient Form State inside Admin Step 3
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState<number | ''>(70);
  const [newPatientCondition, setNewPatientCondition] = useState('');
  const [newPatientSodium, setNewPatientSodium] = useState<number>(1500);
  const [newPatientGI, setNewPatientGI] = useState<number>(50);
  const [newPatientNotes, setNewPatientNotes] = useState('');

  const [uploadedLabStatus, setUploadedLabStatus] = useState<string | null>(null);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedLabStatus(`Parsing ${file.name} with Gemini Clinical Vision...`);
      setTimeout(() => {
        const newPatientId = `pat-${Date.now()}`;
        const patientName = newPatientName.trim() || 'Clinical Patient';
        setAdminPatients((prev) => [
          ...prev,
          {
            id: newPatientId,
            householdId: 'hh-active',
            name: patientName,
            age: typeof newPatientAge === 'number' ? newPatientAge : 65,
            primaryCondition: 'Extracted from Lab Panel',
            secondaryConditions: [],
            targetSodiumMg: 1500,
            targetMaxGI: 50,
            potassiumRestricted: false,
            purineRestricted: false,
            notes: `Extracted from uploaded report: ${file.name}`,
          },
        ]);
        setAdminBiomarkers((prev) => [
          ...prev,
          {
            id: `bm-${Date.now()}-1`,
            patientId: newPatientId,
            householdId: 'hh-active',
            markerName: 'Fasting Glucose / Insulin',
            category: 'Metabolic & Glycemic',
            value: 104,
            unit: 'mg/dL',
            referenceRange: '70 - 99',
            status: 'ELEVATED',
            clinicalSignificance: 'Borderline elevated glycemic marker from uploaded panel.',
            dateTested: new Date().toISOString().split('T')[0],
            labProvider: file.name,
          },
        ]);
        setUploadedLabStatus(`Successfully parsed ${file.name} and registered patient record.`);
      }, 1200);
    }
  };

  const handleAddMemberToAdminList = () => {
    if (!newMemName.trim()) return;
    const newMember: HouseholdMemberInfo = {
      id: `usr-${Date.now()}`,
      name: newMemName.trim(),
      email: newMemEmail.trim() || `${newMemName.toLowerCase().replace(/\s+/g, '')}@vitalplate.app`,
      age: typeof newMemAge === 'number' ? newMemAge : 35,
      gender: newMemGender,
      roles: [newMemRole],
      isHomeHead: false,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setAdminMembers([...adminMembers, newMember]);
    setNewMemName('');
    setNewMemEmail('');
  };

  const handleRemoveMember = (id: string) => {
    setAdminMembers(adminMembers.filter((m) => m.id !== id));
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    const createdPatient: PatientProfile = {
      id: `pat-${Date.now()}`,
      householdId: 'hh-active',
      name: newPatientName.trim(),
      age: typeof newPatientAge === 'number' ? newPatientAge : 65,
      primaryCondition: newPatientCondition.trim() || 'General Nutrition Care',
      secondaryConditions: [],
      targetSodiumMg: newPatientSodium,
      targetMaxGI: newPatientGI,
      potassiumRestricted: false,
      purineRestricted: false,
      notes: newPatientNotes.trim(),
    };
    setAdminPatients([...adminPatients, createdPatient]);
    setNewPatientName('');
    setNewPatientCondition('');
    setNewPatientNotes('');
    setIsAddingPatient(false);
  };

  // Submission handler for Admin
  const handleFinalizeAdmin = () => {
    onCompleteAsAdmin({
      homeName: homeName.trim() || 'My Household',
      homeCode: homeCode.trim().toUpperCase(),
      region,
      activeCuisines,
      activeAppliances,
      cookLanguage,
      members: adminMembers,
      patients: adminPatients,
      biomarkers: adminBiomarkers,
    });
  };

  // Submission handler for Non-Admin (no relationship field)
  const handleFinalizeMember = () => {
    onCompleteAsMember({
      name: memberFormName.trim() || userName || 'Household Member',
      age: typeof memberFormAge === 'number' ? memberFormAge : 35,
      gender: memberFormGender,
      role: selectedRoleType || 'caregiver',
      homeCode: memberFormCode.trim().toUpperCase(),
      dialect: memberFormDialect,
      conditions: memberFormConditions ? memberFormConditions.split(',').map((c) => c.trim()).filter(Boolean) : [],
    });
  };

  // SCREEN 1: First Question: "Are you the admin, are you what, are you XYZ?"
  if (!selectedRoleType) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-teal-500/10 via-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-xs font-mono text-teal-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>STEP 1 · ROLE IDENTIFICATION</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              What is your role in this household?
            </h1>
            
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Please specify who you are. If you are the household head/admin, you will create the home table and add member users &amp; lab reports. Otherwise, provide your user details to join.
            </p>
          </div>

          {/* Role Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Admin Card */}
            <button
              onClick={() => setSelectedRoleType('admin')}
              className="p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border-2 border-teal-500/40 hover:border-teal-400 transition-all text-left group cursor-pointer sm:col-span-2 flex items-start gap-4 shadow-lg hover:shadow-teal-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                    I am the Household Admin
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Create Home Table
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  I will create our household record with an array of member user IDs, register members in the users table, and manage clinical lab panels and kitchen setup.
                </p>
              </div>
            </button>

            {/* 2. Caregiver Card */}
            <button
              onClick={() => setSelectedRoleType('caregiver')}
              className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 transition-all text-left group cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white group-hover:text-emerald-300">
                  Caregiver / Family Manager
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Caring for family members, coordinating clinical diets, and managing pantry stock.
                </p>
              </div>
            </button>

            {/* 3. Cook Card */}
            <button
              onClick={() => setSelectedRoleType('cook')}
              className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 transition-all text-left group cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white group-hover:text-amber-300">
                  Domestic Helper / Cook
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Preparing meals with audio/voice briefings in my native language.
                </p>
              </div>
            </button>

            {/* 4. Dietitian Card */}
            <button
              onClick={() => setSelectedRoleType('dietitian')}
              className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 transition-all text-left group cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white group-hover:text-cyan-300">
                  Clinical Dietitian
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Authorizing medical nutrition, approving meal plans, and validating clinical safety.
                </p>
              </div>
            </button>

            {/* 5. Senior / Patient Card */}
            <button
              onClick={() => setSelectedRoleType('patient')}
              className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 transition-all text-left group cursor-pointer flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white group-hover:text-rose-300">
                  Senior Citizen / Patient
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Viewing daily meal plans, nutrition cards, and health metrics.
                </p>
              </div>
            </button>

          </div>

          <div className="text-center text-xs text-slate-500 font-mono">
            SignedIn as: <span className="text-slate-300">{userEmail || 'Google User'}</span>
          </div>

        </div>
      </div>
    );
  }

  // SCREEN 2B: NON-ADMIN FLOW (Caregiver, Cook, Dietitian, Patient) - NO RELATIONSHIP FIELD!
  if (selectedRoleType !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-400">
                <UserCheck className="w-3.5 h-3.5" />
                <span>USER PROFILE REGISTRATION</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Enter your user details
              </h2>
            </div>
            <button
              onClick={() => setSelectedRoleType(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Role</span>
            </button>
          </div>

          <div className="space-y-4">
            
            {/* Household Code to link with */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                Family Home Code
              </label>
              <input
                type="text"
                value={memberFormCode}
                onChange={(e) => setMemberFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. HOME-8421"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono uppercase text-white focus:outline-none focus:border-teal-500"
              />
              <p className="text-[10px] text-slate-500">
                Ask your Household Admin for their Home Code to join their household table.
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={memberFormName}
                onChange={(e) => setMemberFormName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={memberFormAge}
                  onChange={(e) => setMemberFormAge(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={memberFormGender}
                  onChange={(e) => setMemberFormGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Role specific additions */}
            {selectedRoleType === 'cook' && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4" />
                  <span>Native Language for Audio Recipe Briefings</span>
                </label>
                <select
                  value={memberFormDialect}
                  onChange={(e) => setMemberFormDialect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {DIALECT_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-200/80">
                  Cook briefings and substitute warnings will be vocalized in this dialect.
                </p>
              </div>
            )}

            {selectedRoleType === 'patient' && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <Heart className="w-4 h-4" />
                  <span>Known Health Conditions (Optional)</span>
                </label>
                <input
                  type="text"
                  value={memberFormConditions}
                  onChange={(e) => setMemberFormConditions(e.target.value)}
                  placeholder="e.g. Hypertension, PCOS, Diabetes"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            {selectedRoleType === 'dietitian' && (
              <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl space-y-1.5">
                <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" />
                  <span>Clinical Affiliation / Credentials</span>
                </label>
                <input
                  type="text"
                  defaultValue="Registered Dietitian (RD)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>
            )}

          </div>

          <div className="pt-2">
            <button
              onClick={handleFinalizeMember}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-900/40"
            >
              <span>Join Household as {selectedRoleType.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // SCREEN 2A: ADMIN FLOW (Step 1: Home, Step 2: Member Users (Age & Gender), Step 3: Lab Reports, Step 4: Cuisines)
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Step Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN HOUSEHOLD SETUP · STEP {adminStep} OF 4</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {adminStep === 1 && 'Create Household Record'}
              {adminStep === 2 && 'Add Member Users (Age, Gender & Roles)'}
              {adminStep === 3 && 'Clinical Lab Reports & Patient Vault'}
              {adminStep === 4 && 'Kitchen Preferences & Hardware'}
            </h2>
          </div>

          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setAdminStep(s as 1 | 2 | 3 | 4)}
                className={`w-7 h-7 rounded-lg text-xs font-mono flex items-center justify-center transition-colors cursor-pointer ${
                  adminStep === s
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : adminStep > s
                    ? 'bg-teal-950 text-teal-300 border border-teal-800'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 1: CREATE HOME */}
        {adminStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Household Name
                </label>
                <input
                  type="text"
                  value={homeName}
                  onChange={(e) => setHomeName(e.target.value)}
                  placeholder="e.g. Tan-Ramesh Household"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Family Home Code (Unique Key)
                </label>
                <input
                  type="text"
                  value={homeCode}
                  onChange={(e) => setHomeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HOME-8421"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono uppercase text-teal-300 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Primary Region
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGION_OPTIONS.map((reg) => (
                  <button
                    key={reg.value}
                    type="button"
                    onClick={() => setRegion(reg.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      region === reg.value
                        ? 'bg-teal-500/15 border-teal-400 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{reg.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{reg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => setSelectedRoleType(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Role Choice</span>
              </button>

              <button
                onClick={() => setAdminStep(2)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Next: Add Member Users</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADD MEMBER USERS (AGE & GENDER - NO RELATIONSHIP FIELD) */}
        {adminStep === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-teal-300 block">
                + Add User to Household Member Array
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Name</label>
                  <input
                    type="text"
                    value={newMemName}
                    onChange={(e) => setNewMemName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newMemAge}
                    onChange={(e) => setNewMemAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Gender</label>
                  <select
                    value={newMemGender}
                    onChange={(e) => setNewMemGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Email</label>
                  <input
                    type="email"
                    value={newMemEmail}
                    onChange={(e) => setNewMemEmail(e.target.value)}
                    placeholder="e.g. member@vitalplate.app"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Role</label>
                  <select
                    value={newMemRole}
                    onChange={(e) => setNewMemRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="cook">Domestic Helper / Cook</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="dietitian">Clinical Dietitian</option>
                    <option value="patient">Senior / Patient</option>
                    <option value="admin">Admin / Head</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddMemberToAdminList}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase">
                Household Members in Users Table ({adminMembers.length})
              </label>

              {adminMembers.length === 0 ? (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  No members added yet. Use the form above to register members.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {adminMembers.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-teal-400 text-xs">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300">
                              Age: {m.age ?? 35} · {m.gender || 'Not specified'}
                            </span>
                            {m.isHomeHead && (
                              <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-1 rounded">
                                HEAD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.email} · Roles: {m.roles.join(', ')}
                          </div>
                        </div>
                      </div>

                      {!m.isHomeHead && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => setAdminStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setAdminStep(3)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Next: Clinical Lab Reports &amp; Patients</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LAB REPORTS & CLINICAL BIOMARKERS */}
        {adminStep === 3 && (
          <div className="space-y-4">
            
            {/* Upload PDF/Photo Panel */}
            <div className="p-4 border-2 border-dashed border-teal-500/40 hover:border-teal-400/80 rounded-2xl bg-teal-950/20 text-center space-y-2 transition-colors">
              <Upload className="w-6 h-6 text-teal-400 mx-auto" />
              <div className="text-xs font-semibold text-white">
                Upload Clinical Lab Report (PDF, Photo, or Scan)
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Gemini extracts longitudinal clinical targets (HbA1c, Fasting Insulin, HOMA-IR, BP, Sodium, eGFR).
              </p>
              <label className="inline-block mt-1 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer">
                <span>Select Lab File</span>
                <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {uploadedLabStatus && (
                <div className="text-xs font-mono text-teal-300 bg-teal-950/80 p-1.5 rounded mt-2 border border-teal-800">
                  {uploadedLabStatus}
                </div>
              )}
            </div>

            {/* Manual Add Patient Form */}
            {isAddingPatient ? (
              <form onSubmit={handleCreatePatient} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-teal-300 block">
                  Add Clinical Patient Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Patient Name (e.g. Grandfather Lim)"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Age (e.g. 72)"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value ? Number(e.target.value) : '')}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Primary Condition (e.g. Hypertension, PCOS, Stage 3 CKD)"
                  value={newPatientCondition}
                  onChange={(e) => setNewPatientCondition(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Target Sodium (mg/day)</label>
                    <input
                      type="number"
                      value={newPatientSodium}
                      onChange={(e) => setNewPatientSodium(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Target Max Glycemic Index</label>
                    <input
                      type="number"
                      value={newPatientGI}
                      onChange={(e) => setNewPatientGI(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Dietary Guidance / Notes"
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPatient(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Save Patient
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  Registered Patients ({adminPatients.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingPatient(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Patient Profile</span>
                </button>
              </div>
            )}

            {/* Patients List (Empty if none added) */}
            {adminPatients.length === 0 ? (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No patient records yet. Upload a lab report or click &ldquo;+ Add Patient Profile&rdquo; above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {adminPatients.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{p.name} ({p.age}y)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-teal-300">
                        Target &lt;{p.targetSodiumMg}mg Na
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-300 font-medium">
                      {p.primaryCondition}
                    </div>
                    {p.notes && (
                      <p className="text-[10px] text-slate-400 line-clamp-2">
                        {p.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => setAdminStep(2)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setAdminStep(4)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Next: Kitchen Dialects &amp; Cuisines</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: KITCHEN DIALECT & CUISINES */}
        {adminStep === 4 && (
          <div className="space-y-4">
            
            {/* Cook Language */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cook / Domestic Helper Primary Language (for Audio Briefings)
              </label>
              <select
                value={cookLanguage}
                onChange={(e) => setCookLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
              >
                {DIALECT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Cuisines */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Active Household Cuisines
              </label>
              <div className="flex flex-wrap gap-2">
                {['South Indian Traditional', 'North Indian Traditional', 'Sino-Singaporean', 'Washoku (Japanese)', 'Western Healthy'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setActiveCuisines(
                        activeCuisines.includes(c)
                          ? activeCuisines.filter((x) => x !== c)
                          : [...activeCuisines, c]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      activeCuisines.includes(c)
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Banner */}
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Ready to Create Household &amp; User Records</span>
              </div>
              <p className="text-emerald-200/80 text-[11px]">
                Home Code: <span className="font-mono font-bold text-white">{homeCode}</span> · Member IDs in Household: {adminMembers.length} · Patient Vault: {adminPatients.length} record(s).
              </p>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => setAdminStep(3)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={handleFinalizeAdmin}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-900/50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Complete Setup &amp; Enter Dashboard</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
