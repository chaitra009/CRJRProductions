import React, { useState } from 'react';
import { HouseholdMemberInfo, UserRole, CanonicalUserRole, normalizeRole, PatientProfile, BiomarkerRecord } from '../types';
import * as backendApi from '../services/backendApi';
import { LabReportParser } from './LabReportParser';
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
  ChefHat,
  Stethoscope,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Trash2,
} from 'lucide-react';

interface AdminConsoleProps {
  members: HouseholdMemberInfo[];
  patients: PatientProfile[];
  onUpdateMemberRoles: (memberId: string, newRoles: UserRole[]) => void;
  onAddMember: (member: Omit<HouseholdMemberInfo, 'id' | 'joinedAt'>) => void;
  onRemoveMember: (memberId: string) => void;
  onAddBiomarker: (record: BiomarkerRecord) => void;
  homeCode: string;
  onUpdateHomeCode: (code: string) => void;
  onOpenDatabase?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  members,
  patients,
  onUpdateMemberRoles,
  onAddMember,
  onRemoveMember,
  onAddBiomarker,
  homeCode,
  onUpdateHomeCode,
  onOpenDatabase,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberAge, setNewMemberAge] = useState<number | ''>(40);
  const [newMemberGender, setNewMemberGender] = useState('Female');
  const [newMemberRole, setNewMemberRole] = useState<CanonicalUserRole>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Lab Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleRoleToggle = (memberId: string, roleToToggle: CanonicalUserRole) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const normalizedCurrent = Array.from(new Set(member.roles.map(normalizeRole)));
    let updatedRoles: CanonicalUserRole[];
    if (normalizedCurrent.includes(roleToToggle)) {
      if (normalizedCurrent.length === 1) return; // prevent zero roles
      updatedRoles = normalizedCurrent.filter((r) => r !== roleToToggle);
    } else {
      updatedRoles = [...normalizedCurrent, roleToToggle];
    }

    onUpdateMemberRoles(memberId, updatedRoles);
    setSavedMessage(`Updated roles for ${member.name}`);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (members.length >= 5) {
      setSavedMessage("Household is full (Max 5 members)");
      return;
    }
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    onAddMember({
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      password: newMemberPassword.trim(),
      age: typeof newMemberAge === 'number' ? newMemberAge : 40,
      gender: newMemberGender,
      roles: [newMemberRole],
      isHomeHead: false,
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPassword('');
    setIsAdding(false);
    setSavedMessage(`Added ${newMemberName} and created entry in Users DB (/users)`);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleSyncAllLabs = async () => {
    setIsSyncing(true);
    setSyncStatus("Triggering Vertex AI clinical synthesis across all members...");
    try {
      console.log('[Admin] Triggering Lab Analysis Sync for household:', homeCode);
      
      // 1. Fetch current patients and biomarkers to ensure we have latest data
      const [currentPatients, allBiomarkers] = await Promise.all([
        backendApi.fetchPatients(`hh-${homeCode.toLowerCase()}`),
        backendApi.fetchBiomarkers(undefined, `hh-${homeCode.toLowerCase()}`)
      ]);

      console.log('[Admin] Syncing data for patients:', currentPatients.map(p => p.name));

      // 2. Trigger reindex-meals which performs the clinical synthesis
      const res = await fetch('/api/reindex-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: `hh-${homeCode.toLowerCase()}`,
          guardrails: {
            maxSodiumPerMeal: 500,
            maxGI: 45,
            restrictPotassium: true,
            restrictPurine: true,
            seniorSoftTexture: true,
          },
          currentMeals: [], // Trigger full 7-day week generation
          patientProfiles: currentPatients,
          biomarkers: allBiomarkers // Passing biomarkers for holistic analysis
        }),
      });
      
      const json = await res.json();
      console.log('[Admin] Lab Analysis Sync Result:', json);

      if (json.success) {
        setSyncStatus("✅ All members synced. Clinical synthesis & 7-day plan generated.");
        // We removed the onOpenDatabase() call to avoid showing the Database Inspector modal unexpectedly
      } else {
        setSyncStatus(`❌ Sync failed: ${json.error || 'Check Vertex AI logs'}`);
      }
    } catch (err: any) {
      console.error('[Admin] Lab Analysis Sync Error:', err);
      setSyncStatus(`❌ Error: ${err.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
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
              As Household Admin, authorize family members, domestic cooks, and clinical dietitians. Control multi-role toggles and synchronize members via your Family Code.
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
              HOUSEHOLD MEMBERS &amp; AUTHORIZED ROLES ({members.length}/5)
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAllLabs}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-teal-400" />}
                <span>Sync All Member Lab Analysis</span>
              </button>

              <button
                onClick={() => setIsAdding(!isAdding)}
                disabled={members.length >= 5}
                className="px-3 py-1.5 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Cancel' : 'Invite New Member'}</span>
              </button>
            </div>
          </div>

          {syncStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              syncStatus.includes('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
              syncStatus.includes('❌') ? 'bg-rose-50 border-rose-200 text-rose-800' : 
              'bg-teal-50 border-teal-200 text-teal-800'
            }`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

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
                  onChange={(e) => setNewMemberRole(e.target.value as CanonicalUserRole)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                >
                  <option value="caregiver_cook">Caregiver / Cook</option>
                  <option value="dietitian">Dietitian</option>
                  <option value="member">Members</option>
                </select>
                <input
                  type="password"
                  placeholder="Set initial password"
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                />
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
            {members.map((member) => {
              const patient = patients.find(p => p.id === member.id || p.name === member.name);
              const isExpanded = expandedMemberId === member.id;

              return (
                <div key={member.id} className="hover:bg-slate-50/60 transition-colors">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                      {/* Lab Report Toggle - RESTRICTED TO MEMBERS ONLY */}
                      {member.roles.map(normalizeRole).includes('member') && (
                        <button
                          onClick={() => {
                            console.log('Expanding lab reports for:', member.id);
                            setExpandedMemberId(isExpanded ? null : member.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-sm ${
                            isExpanded 
                              ? 'bg-teal-600 text-white border-teal-700' 
                              : 'bg-white border-slate-300 text-teal-700 hover:border-teal-500 hover:bg-teal-50'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Update Lab Reports</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                      {/* Remove Member Button */}
                      {!member.isHomeHead && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${member.name} from the household?`)) {
                              onRemoveMember(member.id);
                              setSavedMessage(`Removed ${member.name} from household`);
                              setTimeout(() => setSavedMessage(null), 3000);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Remove member from household"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                      {/* Role Toggles - Exactly 3 Canonical Roles */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: 'caregiver_cook' as CanonicalUserRole, label: 'Caregiver / Cook', icon: ChefHat },
                          { id: 'dietitian' as CanonicalUserRole, label: 'Dietitian', icon: Stethoscope },
                          { id: 'member' as CanonicalUserRole, label: 'Members', icon: Users },
                        ].map((r) => {
                          const normalizedRoles = member.roles.map(normalizeRole);
                          const active = normalizedRoles.includes(r.id);
                          const Icon = r.icon;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleRoleToggle(member.id, r.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                                active
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                              }`}
                              title={`Toggle ${r.label} role`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Lab Report Parser */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <LabReportParser 
                          patient={patient || {
                            id: member.id,
                            householdId: `hh-${homeCode.toLowerCase()}`,
                            name: member.name,
                            age: member.age || 35,
                            primaryCondition: 'General Health Monitoring',
                            secondaryConditions: [],
                            targetSodiumMg: 2000,
                            targetMaxGI: 50,
                            potassiumRestricted: false,
                            purineRestricted: false,
                            notes: '',
                          }} 
                          onAddBiomarker={onAddBiomarker}
                          title={`Add Lab Report for ${member.name}`}
                          description={`Upload clinical results specifically for ${member.name}. Gemini 3.8 will extract data directly into their clinical profile.`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Role Permissions Matrix & Firestore Architecture */}
        <div className="space-y-6">
          
          {/* Role Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" />
              THE 3 CANONICAL ROLES
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-2">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                  Caregiver / Cook
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Manages domestic care, pantry inventory, kitchen execution, and plays spoken audio briefings in native dialects with safe ingredient swaps.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  Dietitian Gatekeeper
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Reviews clinical lab panels, sets medical thresholds, authorizes meal plans (Draft → Approved), and conducts computer vision plate audits.
                </p>
              </div>
              <div className="pt-2">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Members
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Household administration, Family Home Code sharing, member role assignments, patient companion profiles, and accessible daily meal tracking.
                </p>
              </div>
            </div>
          </div>



        </div>

      </div>

    </div>
  );
};
