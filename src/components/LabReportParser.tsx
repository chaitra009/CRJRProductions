import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BiomarkerRecord, PatientProfile } from '../types';

interface LabReportParserProps {
  patient: PatientProfile;
  onAddBiomarker: (record: BiomarkerRecord) => void;
  onSuccess?: (count: number) => void;
  title?: string;
  description?: string;
  isDark?: boolean;
}

export const LabReportParser: React.FC<LabReportParserProps> = ({
  patient,
  onAddBiomarker,
  onSuccess,
  title = "Multimodal Lab Ingestion (PDF / Camera / Scans)",
  description,
  isDark = false,
}) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultDescription = description || `Upload messy lab panels or paste clinical text. Gemini 3.8 Flash extracts longitudinal biomarkers and maps them directly against ${patient.name}'s clinical targets.`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setParseSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/parse-lab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: file.type || 'image/jpeg',
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Extraction failed');

          const extractedList = json.data.biomarkers || [];
          extractedList.forEach((bm: any, idx: number) => {
            onAddBiomarker({
              id: `extracted-${Date.now()}-${idx}`,
              patientId: patient.id,
              householdId: patient.householdId,
              markerName: bm.markerName,
              category: (bm.category as any) || 'Metabolic & Glycemic',
              value: Number(bm.value) || 0,
              unit: bm.unit || '',
              referenceRange: bm.referenceRange || '',
              status: (bm.status as any) || 'NORMAL',
              clinicalSignificance: bm.clinicalSignificance || json.data.summaryFindings || '',
              dateTested: json.data.reportDate || new Date().toISOString().split('T')[0],
              labProvider: json.data.labProvider || 'Uploaded Lab Panel',
            });
          });

          const msg = `Successfully extracted ${extractedList.length} biomarkers for ${patient.name}.`;
          setParseSuccessMessage(msg);
          if (onSuccess) onSuccess(extractedList.length);
        } catch (apiErr: any) {
          setParseError(apiErr.message || 'Error parsing report with Gemini 3.8 Flash.');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read file.');
      setIsParsing(false);
    }
  };

  const handleTextParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setParseSuccessMessage(null);

    try {
      const res = await fetch('/api/parse-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent: rawText }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parsing failed');

      const extractedList = json.data.biomarkers || [];
      extractedList.forEach((bm: any, idx: number) => {
        onAddBiomarker({
          id: `extracted-text-${Date.now()}-${idx}`,
          patientId: patient.id,
          householdId: patient.householdId,
          markerName: bm.markerName,
          category: (bm.category as any) || 'Metabolic & Glycemic',
          value: Number(bm.value) || 0,
          unit: bm.unit || '',
          referenceRange: bm.referenceRange || '',
          status: (bm.status as any) || 'NORMAL',
          clinicalSignificance: bm.clinicalSignificance || json.data.summaryFindings || '',
          dateTested: json.data.reportDate || new Date().toISOString().split('T')[0],
          labProvider: json.data.labProvider || 'Text Lab Panel',
        });
      });

      const msg = `Extracted ${extractedList.length} biomarkers from clinical notes.`;
      setParseSuccessMessage(msg);
      setRawText('');
      if (onSuccess) onSuccess(extractedList.length);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse text.');
    } finally {
      setIsParsing(false);
    }
  };

  const containerClass = isDark 
    ? "bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 text-white"
    : "bg-white border border-slate-200 rounded-xl p-6 space-y-6";

  const titleClass = isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900";
  const descClass = isDark ? "text-xs text-slate-400 mt-1" : "text-xs text-slate-600 mt-1";
  const secondaryBtnClass = isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const activeBtnClass = isDark ? "bg-slate-800 text-white" : "bg-slate-900 text-white";

  return (
    <div className={containerClass}>
      <div className="max-w-2xl">
        <h2 className={titleClass}>{title}</h2>
        <p className={descClass}>{defaultDescription}</p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setUploadMode('file')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            uploadMode === 'file' ? activeBtnClass : secondaryBtnClass
          }`}
        >
          Upload Document (PDF / Image)
        </button>
        <button
          onClick={() => setUploadMode('text')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            uploadMode === 'text' ? activeBtnClass : secondaryBtnClass
          }`}
        >
          Paste Report Text
        </button>
      </div>

      {uploadMode === 'file' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
            isDark 
              ? "border-slate-700 hover:border-teal-500 hover:bg-slate-800/50" 
              : "border-slate-300 hover:border-teal-500 hover:bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            Click or drag & drop lab PDF or photograph
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports messy pathology scans, phone camera photos, and digital lab PDFs
          </p>
        </div>
      )}

      {uploadMode === 'text' && (
        <div className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste lab results or hospital discharge summary text here..."
            rows={8}
            className={`w-full p-3 text-xs font-mono border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 ${
              isDark 
                ? "bg-slate-950 border-slate-700 text-slate-200" 
                : "bg-white border-slate-300 text-slate-900"
            }`}
          />
          <div className="flex justify-end">
            <button
              onClick={handleTextParse}
              disabled={isParsing || !rawText.trim()}
              className="px-4 py-2 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isParsing ? 'Extracting with Gemini 3.8...' : 'Extract Quantitative Biomarkers'}
            </button>
          </div>
        </div>
      )}

      {/* Feedback messages */}
      {isParsing && (
        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg text-teal-800 dark:text-teal-300 text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
          <span>Analyzing report with Gemini 3.8 Flash multimodal reasoning...</span>
        </div>
      )}

      {parseError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {parseSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{parseSuccessMessage}</span>
        </div>
      )}
    </div>
  );
};
