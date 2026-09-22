export type IntentType =
  | 'info_query'
  | 'booking'
  | 'reschedule'
  | 'cancel'
  | 'complaint_escalation'
  | 'unknown';

export type AIModelId =
  | 'auto'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview';

export type AgentRolePreset =
  | 'clinic_specialist'
  | 'concierge'
  | 'triage_speed'
  | 'custom';

export type FlowStage =
  | 'greeting'
  | 'routing'
  | 'collecting_info'
  | 'checking_availability'
  | 'awaiting_confirmation'
  | 'executing_tool'
  | 'completed'
  | 'escalated_to_human';

export type SentimentLevel = 'positive' | 'neutral' | 'frustrated' | 'angry';

export interface Appointment {
  id: string;
  customerName: string;
  contact: string;
  serviceType: string;
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'rescheduled' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationTicket {
  id: string;
  customerName?: string;
  contact?: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: SentimentLevel;
  transcriptSummary: string;
  timestamp: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ExtractedParams {
  customerName?: string;
  contact?: string;
  serviceType?: string;
  date?: string;
  timeSlot?: string;
  bookingId?: string;
  rescheduleDate?: string;
  rescheduleTime?: string;
  reason?: string;
}

export interface ConversationState {
  currentIntent: IntentType;
  flowStage: FlowStage;
  sentiment: SentimentLevel;
  isEscalated: boolean;
  extractedParams: ExtractedParams;
  missingRequiredParams: string[];
  lastFunctionExecuted?: string;
  routingReasoning?: string;
  escalationReason?: string;
}

export interface FunctionCallLog {
  name: string;
  args: Record<string, any>;
  result: any;
  timestamp: string;
  status: 'success' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: IntentType;
  functionCalls?: FunctionCallLog[];
  isEscalated?: boolean;
  stateSnapshot?: ConversationState;
  modelUsed?: string;
}

export interface BusinessService {
  id: string;
  name: string;
  duration: string;
  price: string;
  description: string;
  category: string;
}
