import React from 'react';
import { 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck,
  CalendarDays, 
  GitFork, 
  Activity,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { IntentType, SentimentLevel } from '../types';

interface HeaderProps {
  currentIntent: IntentType;
  sentiment: SentimentLevel;
  isEscalated: boolean;
  appointmentCount: number;
  escalationCount: number;
  onReset: () => void;
  isResetting: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentIntent,
  sentiment,
  isEscalated,
  appointmentCount,
  escalationCount,
  onReset,
  isResetting,
  onOpenGuide,
}) => {
  const getIntentBadge = (intent: IntentType) => {
    switch (intent) {
      case 'booking':
        return { label: 'Intake & Booking', bg: 'bg-[#0F3830]/10 text-[#0F3830] border-[#0F3830]/20' };
      case 'reschedule':
        return { label: 'Reschedule Flow', bg: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/20' };
      case 'cancel':
        return { label: 'Cancellation Flow', bg: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20' };
      case 'complaint_escalation':
        return { label: 'Duty Escalation', bg: 'bg-[#BE123C]/10 text-[#BE123C] border-[#BE123C]/20' };
      case 'info_query':
        return { label: 'Clinical Info Query', bg: 'bg-[#4338CA]/10 text-[#4338CA] border-[#4338CA]/20' };
      default:
        return { label: 'Idle / Listening', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const intentInfo = getIntentBadge(currentIntent);

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Editorial Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-[#0F3830] text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/5">
            <Activity className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-lg font-semibold text-[#111827] tracking-tight">
                Lumina Care &amp; Wellness
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                Clinical Operations &amp; Patient Dispatch
              </span>
            </div>
            <p className="text-xs text-slate-600 font-normal">
              Autonomous appointment scheduling, multi-turn intake, live database synchronization &amp; duty supervisor guardrails.
            </p>
          </div>
        </div>

        {/* Status Indicators & Control Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active Flow Intent */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
            <GitFork className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-600 text-[11px]">Flow:</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${intentInfo.bg}`}>
              {intentInfo.label}
            </span>
          </div>

          {/* Guardrail Status */}
          {isEscalated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Supervisor Alerted</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] text-slate-700 font-medium">Guardrails Active</span>
            </div>
          )}

          {/* Architecture Specs Button */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Specifications</span>
          </button>

          {/* Reset Demo Button */}
          <button
            id="reset-demo-btn"
            onClick={onReset}
            disabled={isResetting}
            title="Reset appointments and conversation state"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-colors font-medium text-slate-700 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-600 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
