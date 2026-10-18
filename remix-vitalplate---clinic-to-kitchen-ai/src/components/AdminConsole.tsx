import React, { useState } from 'react';
import { HouseholdMemberInfo, UserRole } from '../types';
import {
  Users,
  Shield,
  UserPlus,
  Key,
  CheckCircle2,
  Lock,
  Database,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

interface AdminConsoleProps {
  members: HouseholdMemberInfo[];
  onUpdateMemberRoles: (memberId: string, newRoles: UserRole[]) => void;
  onAddMember: (member: Omit<HouseholdMemberInfo, 'id' | 'joinedAt'>) => void;
  homeCode: string;
  onUpdateHomeCode: (code: string) => void;
  onOpenDatabase?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  members,
  onUpdateMemberRoles,
  onAddMember,
  homeCode,
  onUpdateHomeCode,
  onOpenDatabase,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberAge, setNewMemberAge] = useState<number | ''>(40);
  const [newMemberGender, setNewMemberGender] = useState('Female');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('cook');
  const [isAdding, setIsAdding] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleRoleToggle = (memberId: string, roleToToggle: UserRole) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    let updatedRoles: UserRole[];
    if (member.roles.includes(roleToToggle)) {
      if (member.roles.length === 1) return; // prevent zero roles
      updatedRoles = member.roles.filter((r) => r !== roleToToggle);
    } else {
      updatedRoles = [...member.roles, roleToToggle];
    }

    onUpdateMemberRoles(memberId, updatedRoles);
    setSavedMessage(`Updated roles for ${member.name}`);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    onAddMember({
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      age: typeof newMemberAge === 'number' ? newMemberAge : 40,
      gender: newMemberGender,
      roles: [newMemberRole],
      isHomeHead: false,
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setIsAdding(false);
    setSavedMessage(`Added ${newMemberName} to household users`);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-slate-50 text-slate-900 border border-teal-100 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-800 bg-white/90 border border-teal-200/80 px-2.5 py-0.5 rounded-full mb-2 shadow-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>HOME HEAD AUTHORITY</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Household Member &amp; Role Management
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              As Household Head, authorize family members, domestic cooks, and clinical dietitians. Control multi-role toggles and synchronize members via your Family Code.
            </p>
          </div>

          <div className="p-3 bg-white/90 border border-teal-200/80 rounded-xl text-xs space-y-1 shrink-0 font-mono shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Active Family Home Code</span>
            <span className="text-base font-bold text-teal-800">{homeCode}</span>
          </div>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Grid: Member Table & Add Member */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Members Management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase text-slate-500 tracking-wider font-semibold">
              HOUSEHOLD MEMBERS &amp; AUTHORIZED ROLES ({members.length})
            </h2>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'Invite New Member'}</span>
            </button>
          </div>

          {/* Add member modal / accordion */}
          {isAdding && (
            <form onSubmit={handleCreateMember} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase font-mono">
                Add Household Member (Specify Age, Gender &amp; Role)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Maria Santos)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email (e.g. maria@vitalplate.app)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  required
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  <option value="cook">Domestic Cook / Helper</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="dietitian">Clinical Dietitian</option>
                  <option value="patient">Senior Patient</option>
                  <option value="admin">Household Admin</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Age (e.g. 72)"
                    value={newMemberAge}
                    onChange={(e) => setNewMemberAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Gender</label>
                  <select
                    value={newMemberGender}
                    onChange={(e) => setNewMemberGender(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium cursor-pointer"
                >
                  Authorize Member
                </button>
              </div>
            </form>
          )}

          {/* Members Table */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-xs">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                    {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{member.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Age: {member.age ?? 35} · {member.gender || 'Not specified'}
                      </span>
                      {member.isHomeHead && (
                        <span className="text-[10px] font-mono bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                          HOME HEAD
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>

                {/* Role Toggles */}
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                  {(['caregiver', 'cook', 'dietitian', 'patient', 'admin'] as UserRole[]).map((r) => {
                    const active = member.roles.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleToggle(member.id, r)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer capitalize ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
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

        {/* Right Col: Role Permissions Matrix & Firestore Architecture */}
        <div className="space-y-6">
          
          {/* Role Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" />
              ROLE PERMISSION BOUNDARIES
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-2">
                <span className="font-semibold text-slate-900 block">Household Admin / Home Head</span>
                <p className="text-slate-500 text-[11px]">
                  Manages Family Home Code, assigns roles to family and domestic helpers.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-semibold text-slate-900 block">Caregiver Console</span>
                <p className="text-slate-500 text-[11px]">
                  Uploads lab reports, configures regional hardware, manages pantry inventory.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-semibold text-slate-900 block">Domestic Cook / Helper</span>
                <p className="text-slate-500 text-[11px]">
                  Strictly receives <strong>Doctor-Approved</strong> meals only, plays 20s spoken audio in native dialects, pushes voice swaps.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-semibold text-slate-900 block">Clinical Dietitian Gatekeeper</span>
                <p className="text-slate-500 text-[11px]">
                  Enforces medical sliders, signs off on weekly diet table, audits plate photos.
                </p>
              </div>
            </div>
          </div>

          {/* Database Architecture & Live Inspector Breakdown */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                CLOUD FIRESTORE DATABASE
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                LIVE &amp; CONNECTED
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Database: <code className="text-emerald-300 font-mono text-[11px] break-all">ai-studio-vitalplateapaccl-c372a588-6b14-4f67-a544-aac828a7a51a</code>
            </p>

            {onOpenDatabase && (
              <button
                type="button"
                onClick={onOpenDatabase}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Database className="w-4 h-4" />
                <span>Open Cloud Database Inspector &amp; Tables</span>
              </button>
            )}

            <div className="space-y-1.5 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between p-2 bg-slate-950/80 rounded border border-slate-800/80">
                <div>
                  <span className="text-white font-semibold block">1. households</span>
                  <span className="text-[10px] text-slate-400">Contains array of memberIds</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">Separate Table</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950/80 rounded border border-slate-800/80">
                <div>
                  <span className="text-white font-semibold block">2. users</span>
                  <span className="text-[10px] text-slate-400">Full user profiles (Age, Gender, Roles)</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">Separate Table</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-slate-800/40 rounded">
                <span>3. patients &amp; clinical_vault</span>
                <span className="text-slate-400">Isolated Lab Records</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-slate-800/40 rounded">
                <span>4. meal_plans &amp; audits</span>
                <span className="text-slate-400">Dietitian Gatekeeper</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
