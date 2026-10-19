import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  ChevronRight,
  ChevronDown,
  Users,
  ChefHat,
  Stethoscope,
  Heart,
  Settings,
  Sparkles,
  Check,
  Database,
} from 'lucide-react';
import { UserRole, normalizeRole } from '../types';

interface BreadcrumbProps {
  homeName: string;
  homeCode: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  subSection?: string;
  onOpenOnboarding?: () => void;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  currentUser?: {
    uid: string;
    email: string;
    displayName: string;
    role?: UserRole;
    isHomeHead?: boolean;
  } | null;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  homeName,
  homeCode,
  activeTab,
  onTabChange,
  subSection,
  onOpenOnboarding,
  currentRole,
  onRoleChange,
  currentUser,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'caregiver',
      label: 'Caregiver Console',
      roleTitle: 'Family Manager',
      desc: 'Multimodal Lab Vault, Pantry & Grocery Sync',
      icon: Users,
      badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    },
  
    {
      id: 'dietitian',
      label: 'Dietitian Console',
      roleTitle: 'Clinical Advisor',
      desc: 'Meal Plan Reviews & Plate Vision Audits',
      icon: Stethoscope,
      badgeColor: 'text-teal-800 bg-teal-50 border-teal-200',
    },
   
    {
      id: 'admin',
      label: 'Admin & Role Management',
      roleTitle: 'Household Admin',
      desc: 'Authorize Roles, Members (Age/Gender) & Code',
      icon: Settings,
      badgeColor: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'patient',
      label: 'Member Care Companion',
      roleTitle: 'Patient / Member',
      desc: 'Personalized Daily Menu & Clinical Review',
      icon: Heart,
      badgeColor: 'text-rose-800 bg-rose-50 border-rose-200',
    },
  ];

  const currentNav = navItems.find((n) => n.id === activeTab) || navItems[0];
  const CurrentIcon = currentNav.icon;

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    if (onRoleChange) {
      onRoleChange(tabId as UserRole);
    }
    setDropdownOpen(false);
  };

  return (
    <div className="bg-slate-50/90 border-b border-slate-200/90 text-xs text-slate-600 font-sans backdrop-blur-md sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-2">
        
        {/* Interactive Breadcrumb Trail with Dropdown */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs">
          
          {/* Level 1: Home Unit */}
          <div className="flex items-center gap-1.5 text-slate-600 py-1">
            <Home className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="font-semibold text-slate-800">{homeName || 'My Household'}</span>
          </div>

          <span className="text-slate-400 font-mono">/</span>

          {/* Level 2: Home Code Badge */}
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 shrink-0 font-medium">
            {homeCode || 'NO CODE'}
          </span>

          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Level 3: Dropdown Navigation Menu */}
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100/80 border border-slate-200 text-slate-800 font-medium transition-all cursor-pointer shadow-xs"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <CurrentIcon className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs font-semibold">{currentNav.label}</span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hidden sm:inline">
                {currentNav.roleTitle}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  dropdownOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popover */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>Switch Household Console</span>
                  <span className="text-teal-700 font-semibold">SELECT VIEW</span>
                </div>

                <div className="space-y-1">
                  {(() => {
                    const hasAllAccess = !currentUser || currentUser.isHomeHead || currentUser.email === 'chaitraramesh9@gmail.com' || currentUser.email.includes('demo') || currentUser.uid.includes('demo');
                    const visibleNavItems = navItems.filter((item) => {
                      if (!currentUser) return false;
                      
                      // Normalize the user's role
                      const userCanonicalRole = currentUser.role ? normalizeRole(currentUser.role) : 'member';
                      
                      // 1. Household Head / Admin gets everything
                      if (currentUser.isHomeHead || currentUser.email === 'chaitraramesh9@gmail.com') return true;

                      // 2. Specific Role Restrictions
                      if (item.id === 'caregiver' || item.id === 'cook') {
                        return userCanonicalRole === 'caregiver_cook';
                      }
                      if (item.id === 'dietitian') {
                        return userCanonicalRole === 'dietitian';
                      }
                      if (item.id === 'patient' || item.id === 'member') {
                        return userCanonicalRole === 'member';
                      }
                      if (item.id === 'admin') {
                        return currentUser.isHomeHead;
                      }
                      return false;
                    });
                    return visibleNavItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                            isActive
                              ? 'bg-teal-50 border border-teal-200 text-teal-900'
                              : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-transparent'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isActive
                                ? 'bg-teal-100 text-teal-700 border-teal-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{item.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-teal-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>

                {onOpenOnboarding && currentUser?.isHomeHead && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenOnboarding();
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-teal-50/80 text-teal-800 text-xs font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Reconfigure Home &amp; Members Wizard</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Level 4: Sub-section */}
          {subSection && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-teal-700 font-mono text-[11px] font-semibold">{subSection}</span>
            </>
          )}

        </nav>



      </div>
    </div>
  );
};
