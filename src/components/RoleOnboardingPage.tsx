import React, { useState } from 'react';
import { UserRole, RegionalRegion, HouseholdMemberInfo, PatientProfile, BiomarkerRecord } from '../types';
import { ShieldCheck, Heart, ChefHat, User, Users, ArrowRight, Home } from 'lucide-react';

interface RoleOnboardingPageProps {
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
  }) => void;
}

export const RoleOnboardingPage: React.FC<RoleOnboardingPageProps> = ({
  onCompleteAsAdmin,
  onCompleteAsMember,
}) => {
  const [mode, setMode] = useState<'select' | 'create_home' | 'join_home'>('select');
  const [selectedRole, setSelectedRole] = useState<UserRole>('caregiver');

  // Form states for creating household
  const [homeName, setHomeName] = useState('Vance Family Care');
  const [homeCode, setHomeCode] = useState('APAC-8421');
  const [region, setRegion] = useState<RegionalRegion>('SINGAPORE');

  // Form states for joining household
  const [joinName, setJoinName] = useState('');
  const [joinAge, setJoinAge] = useState(35);
  const [joinGender, setJoinGender] = useState('Female');
  const [joinCode, setJoinCode] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteAsAdmin({
      homeName,
      homeCode: homeCode.trim().toUpperCase(),
      region,
      activeCuisines: ['Hainanese Heritage', 'Washoku (Japanese)'],
      activeAppliances: ['Rice Cooker (Porridge Mode)', 'Bamboo Steamer'],
      cookLanguage: 'Tagalog',
      members: [
        {
          id: `usr-${Date.now()}`,
          name: 'Home Head Caregiver',
          email: 'caregiver@vitalplate.app',
          age: 48,
          gender: 'Female',
          roles: ['admin', 'caregiver'],
          isHomeHead: true,
        },
      ],
      patients: [],
      biomarkers: [],
    });
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompleteAsMember({
      name: joinName || 'Care Member',
      age: joinAge,
      gender: joinGender,
      role: selectedRole,
      homeCode: joinCode.trim().toUpperCase(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white text-xl shadow-lg mb-3">
            VP
          </div>
          <h2 className="text-2xl font-bold text-white">Household Onboarding</h2>
          <p className="mt-1 text-xs text-slate-400">
            Set up or join a shared Family Home Code for clinical and culinary sync.
          </p>
        </div>

        {mode === 'select' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <button
              onClick={() => setMode('create_home')}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/60 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white text-sm">Create New Family Household</div>
                <div className="text-xs text-slate-400 mt-1">
                  Start a new home with a custom Home Code (Caregiver/Admin).
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-teal-400 shrink-0" />
            </button>

            <button
              onClick={() => setMode('join_home')}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/60 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-white text-sm">Join Existing Household</div>
                <div className="text-xs text-slate-400 mt-1">
                  Enter an existing Family Home Code as Cook, Dietitian, or Patient.
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          </div>
        )}

        {mode === 'create_home' && (
          <form onSubmit={handleAdminSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm">New Household Profile</h3>
            <div>
              <label className="text-xs text-slate-400">Family Name / Household Name</label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Family Home Code (for sharing with cook & dietitian)</label>
              <input
                type="text"
                value={homeCode}
                onChange={(e) => setHomeCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Regional Care Context</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="SINGAPORE">Singapore (Peranakan / Sino / Malay eldercare)</option>
                <option value="JAPAN">Japan (Washoku elder homecare)</option>
                <option value="INDIA">India (Ayurvedic / South & North Indian)</option>
                <option value="SOUTHEAST_ASIA">Southeast Asia (Filipino / Thai / Malay)</option>
              </select>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="w-1/2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium"
              >
                Create Household
              </button>
            </div>
          </form>
        )}

        {mode === 'join_home' && (
          <form onSubmit={handleMemberSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm">Join with Family Home Code</h3>
            <div>
              <label className="text-xs text-slate-400">Your Full Name</label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Your Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="cook">Domestic Cook / Kitchen Helper</option>
                <option value="dietitian">Clinical Dietitian / Gatekeeper</option>
                <option value="patient">Senior Patient / Self</option>
                <option value="caregiver">Family Caregiver</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Enter Family Home Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. APAC-8421"
                className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono uppercase"
                required
              />
            </div>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="w-1/2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium"
              >
                Join Home
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
