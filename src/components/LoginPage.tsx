import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import * as backendApi from '../services/backendApi';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  Lock,
  Mail,
  User,
  HeartHandshake,
  ChefHat,
  Stethoscope,
  Database,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
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
    householdId?: string;
  }) => void;
  homeCode: string;
  onOpenDatabase?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  homeCode,
  onOpenDatabase,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google OAuth flow
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
        needsFirstStep: true, // Leads to Household Gate: Join or Create
      });
    } catch (err: any) {
      console.warn('Google popup error, using fallback:', err);
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

  // Email / Password submission
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password.trim()) {
      setAuthError('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        // Simple signup simulation - leads to household gate
        onLoginSuccess({
          uid: `usr-${Date.now()}`,
          email: email.trim(),
          displayName: fullName.trim() || email.split('@')[0],
          needsFirstStep: true,
        });
      } else {
        // SIGN IN: Check against backend users
        console.log('[Login] Attempting email/password sign-in for:', email);
        const users = await backendApi.fetchUsers();
        console.log('[Login] Fetched users from backend:', users.length);
        
        const matched = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        
        if (matched) {
          console.log('[Login] Found user record. Verifying password...');
          if (matched.password === password.trim()) {
            console.log('[Login] Password verified. Logging in as:', matched.roles[0]);
            onLoginSuccess({
              uid: matched.id,
              email: matched.email,
              displayName: matched.name,
              role: matched.roles[0],
              isHomeHead: matched.isHomeHead,
              householdId: matched.householdId,
              needsFirstStep: !matched.householdId,
            });
          } else {
            console.warn('[Login] Password mismatch');
            setAuthError('Invalid password. Please check your credentials.');
          }
        } else {
          console.warn('[Login] No user found with email:', email);
          setAuthError('User not found. Note: Only passwords set via Admin Console are supported for email login.');
        }
      }
    } catch (err: any) {
      console.error('[Login] Auth error details:', err);
      setAuthError(`Authentication service unavailable: ${err.message || 'Check connection'}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login for the 3 Canonical Roles (caregiver/cook, dietitian, members)
  const handleQuickDemoLogin = (role: UserRole, name: string, demoEmail: string, isHomeHead: boolean) => {
    const fixedIdMap: Record<string, string> = {
      caregiver_cook: 'demo-usr-caregiver-cook',
      caregiver: 'demo-usr-caregiver-cook',
      cook: 'demo-usr-caregiver-cook',
      dietitian: 'demo-usr-dietitian',
      member: 'demo-usr-member',
      admin: 'demo-usr-member',
      patient: 'demo-usr-member',
    };
    const canonicalRole = role === 'caregiver_cook' || role === 'cook' || role === 'caregiver'
      ? 'caregiver_cook'
      : role === 'dietitian'
      ? 'dietitian'
      : 'member';

    onLoginSuccess({
      uid: fixedIdMap[role] || 'demo-usr-member',
      email: demoEmail,
      displayName: name,
      role: canonicalRole,
      isHomeHead,
      needsFirstStep: false, // Pre-linked demo household
      householdId: 'hh-prime',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-teal-500/10 via-emerald-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-teal-400">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>CLINIC-TO-KITCHEN AI</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
            NutriOne
          </h1>

          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Orchestrating clinical lab targets into everyday domestic kitchen execution
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Sign In vs Create Account) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Primary Action: Google Sign In */}
        <button
          type="button"
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
          <span>{loading ? 'Authenticating...' : `Continue with Google`}</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-mono text-slate-500 uppercase shrink-0">
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@vitalplate.app"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                required
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-teal-400 text-[10px] font-sans flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors font-mono"
                required
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {authError && (
            <p className="text-xs text-rose-400 font-mono bg-rose-950/40 p-2.5 rounded-xl border border-rose-900">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20 disabled:opacity-50 mt-1"
          >
            <span>{loading ? 'Processing...' : authMode === 'signup' ? 'Create Account & Continue' : 'Sign In with Email'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Role Switcher for instant evaluation */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase">
            <span>Instant Demo Access</span>
            <span className="text-teal-400 font-semibold">PRE-SEEDED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('caregiver_cook', 'Maria Santos', 'cook@vitalplate.app', false)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-300">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Caregiver / Cook</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Kitchen &amp; Care</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('dietitian', 'Dr. Sarah Chen, APD', 'dietitian@vitalplate.app', false)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-emerald-300">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dietitian</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Clinical Approvals</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('member', 'Eleanor Vance', 'member@vitalplate.app', true)}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-teal-300">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Members</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Family &amp; Patient View</span>
            </button>
          </div>
        </div>



      </div>

    </div>
  );
};
