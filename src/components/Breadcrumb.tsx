import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { UserRole } from '../types';

interface BreadcrumbProps {
  currentRole: UserRole;
  homeName: string;
  homeCode: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  currentRole,
  homeName,
  homeCode,
}) => {
  const roleLabels: Record<UserRole, string> = {
    caregiver: 'Caregiver Clinical Vault & Lab Ingestion',
    dietitian: 'Dietitian Gatekeeper & Approval Protocol',
    cook: "Cook's Station & Multi-Lingual Spoken Briefings",
    patient: 'Senior Citizen & Patient Wellness View',
    admin: 'Family Household Administration',
  };

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-400">
        <Home className="w-3.5 h-3.5 text-slate-500" />
        <span>{homeName || 'VitalPlate APAC'}</span>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="font-mono text-amber-400 font-medium">{homeCode || 'APAC-8421'}</span>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-medium">{roleLabels[currentRole]}</span>
      </div>
    </div>
  );
};
