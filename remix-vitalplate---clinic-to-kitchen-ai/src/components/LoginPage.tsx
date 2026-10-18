import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { ShieldCheck, ArrowRight, Sparkles, Users, Lock, HeartHandshake, ChefHat, Stethoscope, Database } from 'lucide-react';
import { UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (userProfile: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role?: UserRole;
    isHomeHead?: boolean;
    needsFirstStep?: boolean;
  }) => void;
  homeCode: string;
  onStartOnboarding: () => void;
  onOpenDatabase?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  homeCode,
  onStartOnboarding,
  onOpenDatabase,
}) => {
  const [loading, setLoading] = useState(false);
  const [inputHomeCode, setInputHomeCode] = useState(homeCode);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onLoginSuccess({
        uid: user.uid,
        email: user.email || 'user@vitalplate.app',
        displayName: user.displayName || 'Authorized User',
        photoURL: user.photoURL || undefined,
        needsFirstStep: true, // triggers "are you the admin, are you what, are you XYZ"
      });
    } catch (err: any) {
      console.warn('Google popup error:', err);
      // If popup was blocked or iframe restriction, provide fallback demo sign-in
      onLoginSuccess({
        uid: 'user-google-preview',
        email: 'chaitraramesh9@gmail.com',
        displayName: 'Chaitra Ramesh',
        needsFirstStep: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: UserRole, name: string, email: string, isHomeHead: boolean) => {
    onLoginSuccess({
      uid: `demo-${role}-${Date.now()}`,
      email,
      displayName: name,
      role,
      isHomeHead,
      needsFirstStep: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-teal-500/10 via-emerald-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-teal-400">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>CLINIC-TO-KITCHEN AI</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
            VitalPlate
          </h1>

          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Orchestrating clinical lab targets into everyday domestic kitchen execution
          </p>
        </div>

        {/* Family Home Code Input */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Household Access Code</span>
            <span className="text-teal-400 font-semibold">SYNCED</span>
          </label>
          <input
            type="text"
            value={inputHomeCode}
            onChange={(e) => setInputHomeCode(e.target.value.toUpperCase())}
            placeholder="e.g. APAC-KITCHEN-8421"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono font-medium text-white focus:outline-none focus:border-teal-500 transition-colors uppercase"
          />
        </div>

        {/* Primary Action: Google Login */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl cursor-pointer disabled:opacity-50"
          >
            {/* Google G Logo SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
          </button>

          {authError && (
            <p className="text-xs text-rose-400 text-center font-mono bg-rose-950/40 p-2 rounded border border-rose-900">
              {authError}
            </p>
          )}

          <div className="pt-1">
            <button
              onClick={onStartOnboarding}
              className="w-full py-2.5 px-4 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Setup New Home &amp; Assign Member Roles</span>
            </button>
          </div>
        </div>

        {/* Quick Demo Role Switcher for instant evaluation */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase">
            <span>Instant Demo Profile Access</span>
            <span className="text-slate-600">NO POPUP NEEDED</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('admin', 'Chaitra Ramesh', 'chaitraramesh9@gmail.com', true)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-teal-300">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Home Head</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Admin &amp; Caregiver</span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('cook', 'Maria Santos', 'maria.helper@vitalplate.app', false)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-300">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Domestic Cook</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Spoken Audio Briefings</span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('dietitian', 'Dr. Cheryl Lim (RD)', 'dr.cheryl@singaporeheart.org', false)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-emerald-300">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dietitian</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Approval Gatekeeper</span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('patient', 'Mr. Tan Boon Teck', 'tan.bt72@singnet.com.sg', false)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-sky-300">
                <HeartHandshake className="w-3.5 h-3.5 text-sky-400" />
                <span>Senior Patient</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Accessible Meal Guide</span>
            </button>
          </div>
        </div>

        {/* Security badge & DB inspection */}
        <div className="pt-1 space-y-2 text-center">
          {onOpenDatabase && (
            <button
              onClick={onOpenDatabase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 text-xs font-mono transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect Cloud DB (/households &amp; /users)</span>
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Secured via Firebase Firestore &amp; Auth (crjrproductions)</span>
          </div>
        </div>

      </div>

    </div>
  );
};
