import React from 'react';
import { 
  GitFork, 
  Brain, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Flame,
  Smile,
  Meh,
  ShieldAlert,
  Clock,
  Layers
} from 'lucide-react';
import { ConversationState, IntentType, SentimentLevel } from '../types';

interface AgentInspectorProps {
  state: ConversationState | null;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({ state }) => {
  const currentIntent: IntentType = state?.currentIntent || 'info_query';
  const sentiment: SentimentLevel = state?.sentiment || 'neutral';
  const extracted = state?.extractedParams || {};
  const missing = state?.missingRequiredParams || [];
  const isEscalated = state?.isEscalated || false;

  const sentimentLevels: { key: SentimentLevel; label: string; color: string }[] = [
    { key: 'positive', label: 'Calm / Positive', color: 'bg-emerald-600 text-white' },
    { key: 'neutral', label: 'Neutral', color: 'bg-slate-700 text-white' },
    { key: 'frustrated', label: 'Frustrated', color: 'bg-amber-600 text-white' },
    { key: 'angry', label: 'High Distress', color: 'bg-rose-700 text-white' },
  ];

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Intent Routing & Sentiment Detection */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0F3830]/10 text-[#0F3830] flex items-center justify-center">
              <GitFork className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              1. Intent Classifier &amp; Sentiment
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            Stage: {state?.flowStage || 'greeting'}
          </span>
        </div>

        {/* Intent & Reasoning */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-600 font-medium text-[11px]">Classified Flow:</span>
            <span className="font-code text-[11px] font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {currentIntent.toUpperCase()}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
            <span className="text-slate-500 block mb-0.5 font-medium">Routing Rationale:</span>
            <p className="text-slate-800 leading-relaxed italic">
              "{state?.routingReasoning || 'Initial session listening for customer intent.'}"
            </p>
          </div>

          {/* Sentiment Meter */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-600 font-medium">Patient Sentiment Gauge:</span>
              <span className="font-code text-slate-900 font-semibold capitalize">
                {sentiment}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {sentimentLevels.map((lvl) => {
                const isActive = sentiment === lvl.key;
                return (
                  <div
                    key={lvl.key}
                    className={`py-1 px-1 text-center rounded text-[10px] font-medium transition-all ${
                      isActive
                        ? `${lvl.color} font-semibold ring-2 ring-slate-900/10`
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {lvl.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Conversation-State Memory Handling */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Accumulated Entity State
            </h3>
          </div>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 font-medium px-1.5 py-0.5 rounded border border-indigo-200">
            Multi-Turn Memory
          </span>
        </div>

        {/* State Table */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Patient Full Name:</span>
            <span className="font-code font-semibold text-slate-900">
              {extracted.customerName || <span className="text-slate-400 font-normal italic">Pending</span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Contact Number:</span>
            <span className="font-code font-semibold text-slate-900">
              {extracted.contact || <span className="text-slate-400 font-normal italic">Pending</span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Service Category:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[180px]">
              {extracted.serviceType || <span className="text-slate-400 font-normal italic">Pending</span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Requested Date:</span>
            <span className="font-code font-semibold text-slate-900">
              {extracted.date || <span className="text-slate-400 font-normal italic">Pending</span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Target Time Slot:</span>
            <span className="font-code font-semibold text-slate-900">
              {extracted.timeSlot || <span className="text-slate-400 font-normal italic">Pending</span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50/70 border border-slate-100 text-[11px]">
            <span className="text-slate-500">Booking Reference:</span>
            <span className="font-code font-semibold text-slate-900">
              {extracted.bookingId ? (
                <span className="text-slate-900 bg-slate-200 px-1 py-0.2 rounded font-bold">
                  {extracted.bookingId}
                </span>
              ) : (
                <span className="text-slate-400 font-normal italic">None</span>
              )}
            </span>
          </div>
        </div>

        {/* Missing Required Parameters Checklist */}
        {missing.length > 0 && (
          <div className="mt-2.5 p-2 rounded bg-amber-50/90 border border-amber-200 text-xs">
            <span className="font-semibold text-amber-900 text-[11px] block mb-1">
              Required parameters still missing before tool call:
            </span>
            <div className="flex flex-wrap gap-1">
              {missing.map((param, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-900 text-[10px] font-code"
                >
                  &bull; {param}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Function Calling & Guardrails */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0F3830]/10 text-[#0F3830] flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Connected Tool API Registry
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Database Tools</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-code">
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>book_appointment</span>
          </div>
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>reschedule</span>
          </div>
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>cancel</span>
          </div>
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>lookup</span>
          </div>
          <div className="p-1.5 rounded bg-rose-50/70 border border-rose-200 text-rose-900 flex items-center gap-1.5 col-span-2 font-medium">
            <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
            <span>escalate_to_human (Safety Guardrail)</span>
          </div>
        </div>

        {state?.lastFunctionExecuted && (
          <div className="mt-2.5 p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Last tool executed: <strong className="font-code font-bold">{state.lastFunctionExecuted}()</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
