import React, { useState } from 'react';
import { X, Sparkles, Check, ChevronRight } from 'lucide-react';
import { RegionalRegion } from '../types';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreferences: (prefs: {
    region: RegionalRegion;
    cuisines: string[];
    appliances: string[];
    cookLanguage: string;
  }) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onSavePreferences,
}) => {
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState<RegionalRegion>('SINGAPORE');
  const [cuisines, setCuisines] = useState<string[]>(['Hainanese Heritage', 'Washoku (Japanese)']);
  const [appliances, setAppliances] = useState<string[]>([
    'Rice Cooker (Porridge Mode)',
    'Bamboo Steamer',
  ]);
  const [cookLanguage, setCookLanguage] = useState('Tagalog');

  if (!isOpen) return null;

  const handleFinish = () => {
    onSavePreferences({ region, cuisines, appliances, cookLanguage });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Household Care Configuration Wizard</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-slate-400">Target Care Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="SINGAPORE">Singapore (Peranakan & Sino-Malay Elder Care)</option>
              <option value="JAPAN">Japan (Washoku Home Care)</option>
              <option value="INDIA">India (Ayurvedic & Regional South/North)</option>
              <option value="SOUTHEAST_ASIA">Southeast Asia (Filipino / Thai / Malay)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Domestic Helper Spoken Dialect</label>
            <select
              value={cookLanguage}
              onChange={(e) => setCookLanguage(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="Tagalog">Tagalog (Filipino Helpers)</option>
              <option value="Japanese">Japanese 日本語</option>
              <option value="Mandarin">Mandarin 华语</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              <option value="Tamil">Tamil தமிழ்</option>
              <option value="Hindi">Hindi हिन्दी</option>
              <option value="Kannada">Kannada ಕನ್ನಡ</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
