import React, { useState } from 'react';
import { UserRole, RegionalRegion, HouseholdRecord, UserRecord, PatientProfile } from '../types';
import { Users, Plus, Trash2, Home, ShieldCheck, Heart, ChefHat, User, Sparkles } from 'lucide-react';

interface AdminConsoleProps {
  household: HouseholdRecord | null;
  users: UserRecord[];
  patients: PatientProfile[];
  onAddMember: (member: { name: string; email: string; age: number; gender: string; roles: UserRole[]; isHomeHead: boolean }) => void;
  onDeleteMember: (userId: string) => void;
  onUpdateHousehold: (updates: Partial<HouseholdRecord>) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  household,
  users,
  patients,
  onAddMember,
  onDeleteMember,
  onUpdateHousehold,
}) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(35);
  const [gender, setGender] = useState('Female');
  const [role, setRole] = useState<UserRole>('caregiver');
  const [isHomeHead, setIsHomeHead] = useState(false);

  // Household settings
  const [homeName, setHomeName] = useState(household?.name || 'Vance Residence');
  const [homeCode, setHomeCode] = useState(household?.homeCode || 'APAC-8421');
  const [region, setRegion] = useState<RegionalRegion>(household?.region || 'SINGAPORE');

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMember({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@vitalplate.app`,
      age: Number(age),
      gender,
      roles: [role],
      isHomeHead,
    });
    setName('');
    setEmail('');
    setShowAddMemberModal(false);
  };

  const handleSaveHousehold = () => {
    onUpdateHousehold({
      name: homeName,
      homeCode: homeCode.trim().toUpperCase(),
      region,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
              HOUSEHOLD ADMINISTRATION
            </span>
            <span className="text-xs text-slate-400">· Multi-Role Management</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Household Settings & Member Roster</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage the shared Family Home Code, add household members (Caregiver, Cook, Dietitian, Patient), and configure regional culinary preferences.
          </p>
        </div>

        <button
          onClick={() => setShowAddMemberModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* Household Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
        <h3 className="font-semibold text-white text-base">Household Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 font-medium">Household Name</label>
            <input
              type="text"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium">Family Home Code (Sync Key)</label>
            <input
              type="text"
              value={homeCode}
              onChange={(e) => setHomeCode(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold uppercase text-sm"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium">Regional Healthcare Geography</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="SINGAPORE">Singapore (Peranakan / Sino-Malay eldercare)</option>
              <option value="JAPAN">Japan (Washoku eldercare)</option>
              <option value="INDIA">India (Ayurvedic / South & North Indian)</option>
              <option value="SOUTHEAST_ASIA">Southeast Asia (Filipino / Thai / Malay)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveHousehold}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-medium rounded-lg text-xs transition-colors"
        >
          Save Household Profile
        </button>
      </div>

      {/* Member Roster */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase font-mono text-slate-400">
          Household Members ({users.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{u.name}</h4>
                  <div className="text-slate-400 text-[11px]">{u.email}</div>
                </div>
                <button
                  onClick={() => onDeleteMember(u.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Age {u.age} · {u.gender}</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono text-[10px] font-bold uppercase">
                  {u.roles[0] || 'Member'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleMemberSubmit}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-semibold text-white text-base">Add New Household Member</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="text-slate-400">Role in Household</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                >
                  <option value="caregiver">Family Caregiver</option>
                  <option value="cook">Domestic Cook / Kitchen Helper</option>
                  <option value="dietitian">Clinical Dietitian</option>
                  <option value="patient">Senior Patient / Self</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
