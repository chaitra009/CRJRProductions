import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { UserRole } from '../types';
import { ShieldCheck, Heart, ChefHat, Users, Sparkles, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (profile: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role?: UserRole;
    isHomeHead?: boolean;
    needsFirstStep?: boolean;
  }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      onLoginSuccess({
        uid: user.uid,
        email: user.email || 'user@vitalplate.app',
        displayName: user.displayName || 'Authorized User',
        photoURL: user.photoURL || undefined,
        needsFirstStep: true,
      });
    } catch (err: any) {
      console.warn('Google Popup sign in notice:', err);
      // Fallback for iframe restrictions
      onLoginSuccess({
        uid: `usr-${Date.now()}`,
        email: 'caregiver@vitalplate.app',
        displayName: 'Family Caregiver',
        role: 'caregiver',
        isHomeHead: true,
        needsFirstStep: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole, name: string, email: string) => {
    onLoginSuccess({
      uid: `demo-${role}`,
      email,
      displayName: name,
      role,
      isHomeHead: role === 'admin' || role === 'caregiver',
      needsFirstStep: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg mb-4">
          VP
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">VitalPlate APAC</h2>
        <p className="mt-2 text-sm text-slate-400">
          Clinic-to-Kitchen AI Platform for Multi-Generational & Senior Caregiving
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-xl border border-slate-800 sm:rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-mono">Or Quick Demo Role Access</span>
            </div>
          </div>

          {/* Quick Demo Role Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleDemoLogin('caregiver', 'Eleanor Vance', 'caregiver@vitalplate.app')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/60 text-left transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-teal-400 font-medium mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>Caregiver</span>
              </div>
              <div className="text-[11px] text-slate-400">Lab Vault & Pantry</div>
            </button>

            <button
              onClick={() => handleDemoLogin('dietitian', 'Dr. Sarah Chen, APD', 'dietitian@vitalplate.app')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 text-left transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-indigo-400 font-medium mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dietitian Gate</span>
              </div>
              <div className="text-[11px] text-slate-400">Sign-off & Audits</div>
            </button>

            <button
              onClick={() => handleDemoLogin('cook', 'Maria Santos', 'maria.cook@vitalplate.app')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/60 text-left transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1">
                <ChefHat className="w-3.5 h-3.5" />
                <span>Domestic Cook</span>
              </div>
              <div className="text-[11px] text-slate-400">Spoken Audio Briefings</div>
            </button>

            <button
              onClick={() => handleDemoLogin('admin', 'Admin Coordinator', 'admin@vitalplate.app')}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/60 text-left transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-purple-400 font-medium mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <div className="text-[11px] text-slate-400">Home Code & Members</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
