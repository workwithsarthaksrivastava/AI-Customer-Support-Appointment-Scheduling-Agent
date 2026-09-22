import React from 'react';
import { 
  GitFork, 
  Layers, 
  Terminal, 
  Brain, 
  ShieldAlert, 
  Check, 
  AlertCircle, 
  X,
  Activity,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface FlowArchitectureGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlowArchitectureGuide: React.FC<FlowArchitectureGuideProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto border border-[#E5E7EB] shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F3830] text-[#86EFAC] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-editorial text-lg font-semibold text-slate-900">
                System Specifications &amp; Architecture Reference
              </h2>
              <p className="text-xs text-slate-500">
                Autonomous Patient Dispatch, Intent Classification &amp; Safety Guardrails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Architecture Sections */}
        <div className="mt-5 space-y-5 text-xs text-slate-700">
          {/* Visual Pipeline Strip */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              End-to-End Processing Pipeline
            </span>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-code">
              <span className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900">
                1. Patient Message
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900">
                2. Intent &amp; Sentiment
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900">
                3. Flow State Machine
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900">
                4. Database Tool Exec
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-1 bg-[#0F3830] text-white rounded font-semibold">
                5. Verified Confirmation
              </span>
            </div>
          </div>

          {/* 1. Intent Routing */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded bg-[#0F3830]/10 text-[#0F3830] flex items-center justify-center shrink-0 font-code font-bold text-xs">
              01
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Intent Classification &amp; Flow Routing
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Incoming patient input is classified into explicit clinical domains: <strong>info_query</strong>, <strong>booking</strong>, <strong>reschedule</strong>, <strong>cancel</strong>, or <strong>complaint_escalation</strong>. Isolating intent prevents conflicting business rules and keeps conversational prompts scoped.
              </p>
            </div>
          </div>

          {/* 2. State Machine Flows */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded bg-[#0F3830]/10 text-[#0F3830] flex items-center justify-center shrink-0 font-code font-bold text-xs">
              02
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Multi-Turn Conversational State Handling
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Patient entities (e.g. name, contact phone, requested appointment slot, service specialty) are accumulated in session state. The engine cross-references required schema parameters before triggering tool calls, preventing redundant questioning.
              </p>
            </div>
          </div>

          {/* 3. Function Calling */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded bg-[#0F3830]/10 text-[#0F3830] flex items-center justify-center shrink-0 font-code font-bold text-xs">
              03
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Deterministic Database Tool Execution
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Autonomous agent operations do not hallucinate appointments; actions execute directly against the clinic database schema through structured functions:
              </p>
              <div className="grid grid-cols-2 gap-1.5 font-code text-[11px] pt-1">
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800">book_appointment(details)</div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800">reschedule(id, newSlot)</div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800">cancel(id, reason)</div>
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800">lookup(id | phone)</div>
              </div>
            </div>
          </div>

          {/* 4. Safety Guardrail & Escalation */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 font-code font-bold text-xs">
              04
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-rose-950 text-sm">
                Human Supervisor Guardrails &amp; Sentiment Defense
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time sentiment telemetry monitors patient distress, billing disputes, and supervisor demands. If triggered, the agent immediately halts bot execution, creates an urgent priority ticket via <code className="font-code text-rose-900 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">escalate_to_human()</code>, and hands over complete transcript history to the duty lead.
              </p>
            </div>
          </div>

          {/* Trade-offs & Engineering Review */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" /> Operational Benefits
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Instant 24/7 patient self-service, reduction in clinic administrative phone load, accurate calendar booking without human transcription error.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Engineering Edge Cases
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Complex ambiguous phrasing requires robust fallback clarification logic and human override pathways to ensure clinical safety.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#0F3830] hover:bg-[#164e43] text-white text-xs font-semibold cursor-pointer"
          >
            Dismiss Reference
          </button>
        </div>
      </div>
    </div>
  );
};
