import React, { useState } from 'react';
import { UserRole } from '../types';
import { Copy, Check, LogOut, Settings, Sparkles, Database } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  homeCode: string;
  onHomeCodeChange: (code: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDbConnected: boolean;
  currentUser: {
    displayName: string;
    email: string;
    photoURL?: string;
    isHomeHead?: boolean;
    role?: UserRole;
  } | null;
  onSignOut: () => void;
  onOpenOnboarding?: () => void;
  onToggleDatabase?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  homeCode,
  onHomeCodeChange,
  activeTab,
  onTabChange,
  isDbConnected,
  currentUser,
  onSignOut,
  onOpenOnboarding,
  onToggleDatabase,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [tempCode, setTempCode] = useState(homeCode);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(homeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempCode.trim()) {
      onHomeCodeChange(tempCode.trim().toUpperCase());
      setIsEditingCode(false);
    }
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 font-sans shadow-xs">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                onTabChange('caregiver');
                onRoleChange('caregiver');
              }}
              className="text-left cursor-pointer flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-sm shadow-teal-600/20">
                VP
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-none">
                  VitalPlate
                </span>
                <span className="text-[10px] font-mono font-medium text-teal-700 hidden sm:block mt-0.5">
                  Clinic-to-Kitchen AI
                </span>
              </div>
            </button>
          </div>

          {/* Center: Household Home Code Badge */}
          <div className="flex items-center gap-2">
            {isEditingCode ? (
              <form onSubmit={handleSaveCode} className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  className="px-2 py-1 text-xs font-mono font-medium uppercase bg-white border border-teal-600 rounded text-slate-900 focus:outline-none shadow-xs"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs bg-teal-700 text-white rounded hover:bg-teal-800 font-medium cursor-pointer transition-colors shadow-xs"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700">
                <span className="font-mono text-[10px] uppercase text-slate-500 font-semibold">HOME CODE:</span>
                <button
                  onClick={() => setIsEditingCode(true)}
                  className="font-mono font-bold text-teal-800 hover:text-teal-900 transition-colors cursor-pointer"
                  title="Click to edit family code"
                >
                  {homeCode || 'UNASSIGNED'}
                </button>
                <button
                  onClick={handleCopyCode}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                  title="Copy home code to invite members"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onToggleDatabase && (
              <button
                onClick={onToggleDatabase}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-xs"
                title="Inspect Cloud Firestore DB Tables"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Cloud DB</span>
              </button>
            )}

            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 shadow-xs"
                title="Create or Reconfigure Home"
              >
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Setup</span>
              </button>
            )}

            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-teal-700 capitalize">
                    {currentRole === 'patient' ? 'Senior' : currentRole}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-teal-800 overflow-hidden shadow-xs">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.displayName.charAt(0)
                  )}
                </div>

                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Sign out of household"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
