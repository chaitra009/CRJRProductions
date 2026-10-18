import React from 'react';
import { UserRole } from '../types';
import {
  Heart,
  Server,
  Database,
  Shield,
  ChefHat,
  User,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  homeCode: string;
  homeName: string;
  isDbConnected: boolean;
  onOpenDbInspector: () => void;
  onOpenBackendInspector: () => void;
  currentUser: { email?: string; displayName?: string; photoURL?: string } | null;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  homeCode,
  homeName,
  isDbConnected,
  onOpenDbInspector,
  onOpenBackendInspector,
  currentUser,
  onSignOut,
}) => {
  const roles: Array<{ key: UserRole; label: string; icon: any }> = [
    { key: 'caregiver', label: 'Caregiver Vault', icon: Heart },
    { key: 'dietitian', label: 'Dietitian Gate', icon: Shield },
    { key: 'cook', label: "Cook's Station", icon: ChefHat },
    { key: 'patient', label: 'Senior Patient', icon: User },
    { key: 'admin', label: 'Admin Console', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Branding & Family Home Code */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white shadow-sm">
            VP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg tracking-tight">VitalPlate APAC</span>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono">
                CLINIC-TO-KITCHEN
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{homeName || 'Family Household'}</span>
              <span>·</span>
              <span className="font-mono text-amber-400 font-medium">
                {homeCode ? `Code: ${homeCode}` : 'APAC-8421'}
              </span>
            </div>
          </div>
        </div>

        {/* Role Switcher */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = currentRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onRoleChange(r.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System & Inspector Buttons */}
        <div className="flex items-center gap-2">
          {/* Backend Engine Inspector */}
          <button
            onClick={onOpenBackendInspector}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-teal-500/30 bg-teal-950/40 text-teal-300 hover:bg-teal-900/40 transition-colors"
            title="Inspect Full-Stack Engine & AI Services"
          >
            <Server className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Backend API</span>
          </button>

          {/* Firestore DB Inspector */}
          <button
            onClick={onOpenDbInspector}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
              isDbConnected
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
            title="Inspect Firebase Firestore live synchronization"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Firestore</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
          </button>

          {/* User Profile & Sign Out */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs text-slate-300 hidden lg:inline max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
