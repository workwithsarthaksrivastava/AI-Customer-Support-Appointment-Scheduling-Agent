import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  RotateCcw,
  Sliders,
  FileText,
  X,
  Stethoscope,
  Crown,
  Timer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Tag,
  CalendarDays,
  User,
  ShieldAlert,
  Terminal,
  Activity,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, IntentType, AIModelId, AgentRolePreset } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (text: string) => void;
  selectedModel: AIModelId;
  onSelectModel: (model: AIModelId) => void;
  selectedRole: AgentRolePreset;
  onSelectRole: (role: AgentRolePreset) => void;
  customInstruction: string;
  onChangeCustomInstruction: (instruction: string) => void;
  onClearChat: () => void;
}

const QUICK_SCENARIOS = [
  {
    category: 'Reschedule',
    title: 'Lookup & Move Slot',
    text: 'My appointment is tomorrow, I need to reschedule.',
    badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    category: 'New Booking',
    title: 'Physiotherapy Booking',
    text: 'I want to book an appointment for Physiotherapy this Friday at 2:00 PM.',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    category: 'Guardrail',
    title: 'Billing Escalation',
    text: "I was double charged on my bill and nobody is picking up! This is completely unacceptable, let me speak to a manager immediately!",
    badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    category: 'Inquiry',
    title: 'Clinic Hours & Fees',
    text: 'What are your operating hours and how much does a dental cleaning cost?',
    badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    category: 'Cancel',
    title: 'Cancel APT-101',
    text: 'Please cancel my appointment APT-101.',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
  },
];

const ROLE_PRESETS: Record<AgentRolePreset, { title: string; desc: string; icon: any }> = {
  clinic_specialist: {
    title: 'Clinic Specialist',
    desc: 'General medicine & scheduling protocol',
    icon: Stethoscope,
  },
  concierge: {
    title: 'VIP Concierge',
    desc: 'Executive wellness & preventive care',
    icon: Crown,
  },
  triage_speed: {
    title: 'Express Triage',
    desc: 'Rapid slot matching & inquiries',
    icon: Timer,
  },
  custom: {
    title: 'Custom Directives',
    desc: 'User-configured clinical prompt',
    icon: Sliders,
  },
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isProcessing,
  onSendMessage,
  selectedModel,
  onSelectModel,
  selectedRole,
  onSelectRole,
  customInstruction,
  onChangeCustomInstruction,
  onClearChat,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [tempInstruction, setTempInstruction] = useState(customInstruction);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const getIntentBadge = (intent?: IntentType) => {
    if (!intent || intent === 'unknown') return null;
    const styles: Record<IntentType, { label: string; cls: string }> = {
      booking: { label: 'Intake & Booking', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      reschedule: { label: 'Reschedule', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
      cancel: { label: 'Cancellation', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
      complaint_escalation: { label: 'Duty Escalation', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
      info_query: { label: 'Clinical Info', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      unknown: { label: 'General', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
    };

    const conf = styles[intent] || styles.unknown;

    return (
      <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border ${conf.cls}`}>
        {conf.label}
      </span>
    );
  };

  const getModelBadge = (modelUsed?: string) => {
    if (!modelUsed) return null;
    let label = 'Standard Model';
    if (modelUsed.includes('lite') || modelUsed.includes('Speed')) label = 'High-Speed';
    else if (modelUsed.includes('pro') || modelUsed.includes('Advanced')) label = 'Advanced';

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-code text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
      {/* Top Configuration Bar */}
      <div className="p-3 bg-[#FAFBFB] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Persona Dropdown */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] font-medium">Role:</span>
            <select
              id="role-selector"
              value={selectedRole}
              onChange={(e) => {
                const newRole = e.target.value as AgentRolePreset;
                onSelectRole(newRole);
                if (newRole === 'custom') {
                  setIsSystemModalOpen(true);
                }
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="clinic_specialist">Clinic Specialist</option>
              <option value="concierge">VIP Concierge</option>
              <option value="triage_speed">Express Triage</option>
              <option value="custom">Custom Directives...</option>
            </select>
          </div>

          {/* Model Mode Dropdown */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] font-medium">Engine:</span>
            <select
              id="model-selector"
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value as AIModelId)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="auto">Auto (Task-Adaptive)</option>
              <option value="gemini-3.5-flash">Standard (Conversational)</option>
              <option value="gemini-3.1-flash-lite">High-Speed (Fast Tasks)</option>
              <option value="gemini-3.1-pro-preview">Advanced (Complex Queries)</option>
            </select>
          </div>

          {/* Directives Prompt Button */}
          <button
            type="button"
            onClick={() => {
              setTempInstruction(customInstruction);
              setIsSystemModalOpen(true);
            }}
            title="Edit System Instructions"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Directives</span>
          </button>
        </div>

        {/* Clear Thread */}
        <button
          type="button"
          onClick={onClearChat}
          title="Clear conversational transcript"
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-medium cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Quick Clinical Simulations Toolbar */}
      <div className="px-3 py-2 bg-[#F3F4F6] border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Patient Simulation Scenarios
          </span>
          <span className="text-[10px] text-slate-600">Click to test scenario</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_SCENARIOS.map((sc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(sc.text)}
              disabled={isProcessing}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[11px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={`px-1 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${sc.badgeStyle}`}>
                {sc.category}
              </span>
              <span className="font-medium">{sc.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header info */}
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">
                  {isUser ? 'Patient' : 'Lumina Concierge'}
                </span>
                <span>&bull;</span>
                <span className="font-code">{msg.timestamp}</span>
              </div>

              {/* Message Body */}
              <div
                className={`max-w-[88%] sm:max-w-[82%] p-3.5 rounded-lg text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#191F28] text-white rounded-tr-none'
                    : 'bg-white text-slate-900 border border-[#E5E7EB] rounded-tl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Tool Execution Receipt (Audit record) */}
                {msg.functionCalls && msg.functionCalls.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider block">
                      Database Tool Audit Record:
                    </span>
                    {msg.functionCalls.map((fc, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-50 border border-slate-200 font-code text-[11px] text-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1 text-slate-900 font-bold">
                          <span className="flex items-center gap-1">
                            <Terminal className="w-3 h-3 text-[#0F3830]" />
                            {fc.name}()
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            SUCCESS
                          </span>
                        </div>
                        {fc.args && Object.keys(fc.args).length > 0 && (
                          <div className="text-[10px] text-slate-600 truncate">
                            Args: {JSON.stringify(fc.args)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Escalation Notice */}
                {msg.isEscalated && (
                  <div className="mt-2.5 p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Guardrail Triggered: Case transferred to Human Duty Lead</span>
                  </div>
                )}
              </div>

              {/* Message Metadata Badges */}
              {!isUser && (
                <div className="flex items-center gap-1.5 mt-1">
                  {getIntentBadge(msg.intent)}
                  {getModelBadge(msg.modelUsed)}
                </div>
              )}
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">Lumina Concierge</span>
              <span>&bull;</span>
              <span className="font-code">Processing</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] text-xs text-slate-600 flex items-center gap-2 shadow-xs">
              <Activity className="w-4 h-4 text-[#0F3830] animate-pulse" />
              <span>Analyzing patient intent &amp; querying clinic schedule...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-white border-t border-[#E5E7EB] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question, book an appointment, or reschedule..."
          disabled={isProcessing}
          className="flex-1 px-3 py-2 rounded border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F3830] focus:ring-1 focus:ring-[#0F3830]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="px-4 py-2 rounded bg-[#0F3830] hover:bg-[#164e43] active:bg-[#0b2b25] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Directives / System Instructions Modal */}
      {isSystemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0F3830]" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Clinical Directives &amp; System Persona
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSystemModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Configure the clinical boundaries, tone, and specific rules enforced during patient interactions.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Active Preset:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_PRESETS) as AgentRolePreset[]).map((roleKey) => {
                    const preset = ROLE_PRESETS[roleKey];
                    const isSelected = selectedRole === roleKey;
                    const Icon = preset.icon;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => onSelectRole(roleKey)}
                        className={`p-2 rounded border text-left flex items-start gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-[#86EFAC]' : 'text-slate-500'}`} />
                        <div>
                          <div className="font-semibold text-[11px]">{preset.title}</div>
                          <div className={`text-[10px] leading-tight ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {preset.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Custom Clinical Instructions (Overrides default system prompt):
                </label>
                <textarea
                  value={tempInstruction}
                  onChange={(e) => setTempInstruction(e.target.value)}
                  placeholder="e.g., Always offer VIP valet parking instructions when booking Executive Health Screenings. Require patient blood type for surgical consults."
                  rows={4}
                  className="w-full p-2 rounded border border-slate-300 font-sans text-xs text-slate-900 focus:outline-none focus:border-[#0F3830]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsSystemModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCustomInstruction(tempInstruction);
                  setIsSystemModalOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-[#0F3830] hover:bg-[#164e43] text-white text-xs font-semibold cursor-pointer"
              >
                Save Directives
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
