import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  CalendarDays, 
  ShieldAlert, 
  Activity, 
  BookOpen, 
  Layers,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Clock
} from 'lucide-react';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { AgentInspector } from './components/AgentInspector';
import { AppointmentsList } from './components/AppointmentsList';
import { EscalationQueue } from './components/EscalationQueue';
import { FlowArchitectureGuide } from './components/FlowArchitectureGuide';
import { 
  Appointment, 
  ChatMessage, 
  ConversationState, 
  EscalationTicket, 
  IntentType, 
  SentimentLevel,
  AIModelId,
  AgentRolePreset
} from './types';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        "Welcome to **Lumina Care & Wellness**. I am your clinical concierge assistant for appointment scheduling, service inquiries, and care coordination.\n\n### How I Can Help You Today:\n• **Check Clinic Information:** Operating hours, clinic location, accepted insurances, and service pricing.\n• **Book an Appointment:** Comprehensive Dental, Physiotherapy, Executive Health Screening, Massage, or Hair Styling.\n• **Manage Existing Reservations:** Look up, reschedule, or cancel confirmed appointments.\n• **Escalate to Supervisor:** Immediate transfer to clinical duty leads for complex inquiries or disputes.\n\nHow may I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'info_query',
    },
  ]);

  const [conversationState, setConversationState] = useState<ConversationState>({
    currentIntent: 'info_query',
    flowStage: 'greeting',
    sentiment: 'neutral',
    isEscalated: false,
    extractedParams: {},
    missingRequiredParams: [],
    routingReasoning: 'Agent initialized in clinical intake & greeting stage.',
  });

  const [selectedModel, setSelectedModel] = useState<AIModelId>('auto');
  const [selectedRole, setSelectedRole] = useState<AgentRolePreset>('clinic_specialist');
  const [customInstruction, setCustomInstruction] = useState<string>('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [escalations, setEscalations] = useState<EscalationTicket[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'appointments' | 'escalations'>('inspector');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Fetch initial appointments and escalations from server
  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const fetchEscalations = async () => {
    try {
      const res = await fetch('/api/escalations');
      const data = await res.json();
      if (data.success) {
        setEscalations(data.escalations);
      }
    } catch (err) {
      console.error('Failed to fetch escalations:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchEscalations();
  }, []);

  // Handle sending message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          state: conversationState,
          model: selectedModel,
          role: selectedRole,
          customInstruction,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent || conversationState.currentIntent,
        functionCalls: data.toolsExecuted || [],
        isEscalated: data.isEscalated || false,
        stateSnapshot: data.state,
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.state) {
        setConversationState(data.state);
      }

      // Refresh appointments and escalations after tool runs
      fetchAppointments();
      fetchEscalations();

      // If escalated, automatically highlight the escalation tab
      if (data.isEscalated) {
        setActiveTab('escalations');
      } else if (data.toolsExecuted?.some((t: any) => ['book_appointment', 'reschedule_appointment', 'cancel_appointment'].includes(t.name))) {
        setActiveTab('appointments');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I encountered an error communicating with the scheduling service. Please try your request again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset demo
  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await fetchAppointments();
      await fetchEscalations();

      const freshState: ConversationState = {
        currentIntent: 'info_query',
        flowStage: 'greeting',
        sentiment: 'neutral',
        isEscalated: false,
        extractedParams: {},
        missingRequiredParams: [],
        routingReasoning: 'Reset to initial session state.',
      };
      setConversationState(freshState);

      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content:
            "Clinical database and conversation session have been restored to baseline records. How may I assist you with your schedule or care plan today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: 'info_query',
        },
      ]);
      setActiveTab('inspector');
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          "Welcome to Lumina Care & Wellness. How may I assist you with our services, scheduling, or care team today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'info_query',
        modelUsed: selectedModel === 'auto' ? 'Standard Model' : selectedModel,
      },
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#191F28] font-sans antialiased selection:bg-[#0F3830] selection:text-white">
      {/* Header */}
      <Header
        currentIntent={conversationState.currentIntent}
        sentiment={conversationState.sentiment}
        isEscalated={conversationState.isEscalated}
        appointmentCount={appointments.length}
        escalationCount={escalations.length}
        onReset={handleReset}
        isResetting={isResetting}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Editorial Operations Strip */}
      <div className="bg-[#FAFBFB] border-b border-[#E5E7EB] px-4 sm:px-6 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="font-semibold text-slate-900">Live Practice Dispatch:</span>
            <span className="text-slate-600">
              Autonomous intent triage, live slot allocation &amp; duty supervisor guardrail active.
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-code text-slate-500">
            <span>Active Slots: <strong className="text-slate-900 font-bold">{appointments.filter(a => a.status === 'confirmed').length}</strong></span>
            <span>&bull;</span>
            <span>Escalations: <strong className="text-rose-900 font-bold">{escalations.length}</strong></span>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="text-[#0F3830] hover:underline font-semibold cursor-pointer"
            >
              System Specs &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left Column: Interactive Patient Chat Interface (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[740px]">
          <ChatPanel
            messages={messages}
            isProcessing={isProcessing}
            onSendMessage={handleSendMessage}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            customInstruction={customInstruction}
            onChangeCustomInstruction={setCustomInstruction}
            onClearChat={handleClearChat}
          />
        </div>

        {/* Right Column: Real-Time Telemetry & Schedule Ledgers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[740px] space-y-3">
          {/* Segmented Control Tabs */}
          <div className="flex items-center p-1 bg-white rounded-lg border border-[#E5E7EB] shadow-xs text-xs font-semibold">
            <button
              id="tab-inspector"
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-[#0F3830] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Telemetry &amp; State</span>
            </button>

            <button
              id="tab-appointments"
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-[#0F3830] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Schedule ({appointments.length})</span>
            </button>

            <button
              id="tab-escalations"
              type="button"
              onClick={() => setActiveTab('escalations')}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'escalations'
                  ? 'bg-rose-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Escalations ({escalations.length})</span>
            </button>
          </div>

          {/* Active Panel View */}
          <div className="flex-1 overflow-y-auto pr-0.5">
            {activeTab === 'inspector' && (
              <AgentInspector state={conversationState} />
            )}

            {activeTab === 'appointments' && (
              <AppointmentsList
                appointments={appointments}
                isLoading={isLoadingAppointments}
                onRefresh={fetchAppointments}
              />
            )}

            {activeTab === 'escalations' && (
              <EscalationQueue tickets={escalations} />
            )}
          </div>
        </div>
      </main>

      {/* Architecture Specifications Modal */}
      <FlowArchitectureGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
