import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  Flame,
  Check,
  PhoneCall
} from 'lucide-react';
import { EscalationTicket } from '../types';

interface EscalationQueueProps {
  tickets: EscalationTicket[];
  onResolveTicket?: (id: string) => void;
}

export const EscalationQueue: React.FC<EscalationQueueProps> = ({
  tickets,
  onResolveTicket,
}) => {
  const [acknowledgedTickets, setAcknowledgedTickets] = useState<string[]>([]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedTickets((prev) => 
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
    if (onResolveTicket) {
      onResolveTicket(id);
    }
  };

  const getUrgencyBadge = (urgency: EscalationTicket['urgency']) => {
    switch (urgency) {
      case 'critical':
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600" /> High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
            Medium Severity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Standard Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs flex flex-col h-full overflow-hidden">
      {/* Queue Header */}
      <div className="p-3.5 border-b border-[#E5E7EB] bg-[#FAFBFB] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Duty Supervisor Escalation Queue
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-rose-100 text-rose-800">
                {tickets.length} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Disputed cases and high-frustration sessions transferred out of autonomous mode.
            </p>
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tickets.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/70 rounded border border-slate-200/80">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No active escalation incidents</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              When patient distress, billing complaints, or supervisor requests are detected, the autonomous agent triggers the safety guardrail <code className="font-code text-slate-700 bg-slate-200 px-1 py-0.2 rounded">escalate_to_human()</code> and records the case here.
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const isAck = acknowledgedTickets.includes(t.id);
            return (
              <div
                key={t.id}
                className={`p-3.5 rounded border transition-colors space-y-2.5 ${
                  isAck
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-[#FFF5F5] border-rose-200'
                }`}
              >
                {/* Header: ID, Name, Urgency */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-code text-[11px] font-bold text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                      #{t.id}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {t.customerName || 'Anonymous Member'}
                    </span>
                  </div>
                  {getUrgencyBadge(t.urgency)}
                </div>

                {/* Reason */}
                <div className="text-xs">
                  <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
                    Incident Trigger:
                  </span>
                  <p className="font-medium text-rose-950 bg-white p-2 rounded border border-rose-100">
                    {t.reason}
                  </p>
                </div>

                {/* Transcript Quote */}
                <div className="p-2 rounded bg-white border border-slate-200 text-slate-700 text-[11px] space-y-1">
                  <div className="flex items-center gap-1 text-slate-500 font-medium">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Conversation Excerpt:</span>
                  </div>
                  <p className="italic text-slate-700 leading-relaxed">"{t.transcriptSummary}"</p>
                </div>

                {/* Footer Controls & Timestamp */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-rose-100/80">
                  <span className="flex items-center gap-1 font-code text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAcknowledge(t.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      isAck
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {isAck ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Staff Assigned</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall className="w-3 h-3 text-rose-700" />
                        <span>Acknowledge &amp; Assign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
