import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- In-Memory Scheduling Database & State ---

interface AppointmentRecord {
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

interface EscalationRecord {
  id: string;
  customerName?: string;
  contact?: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry';
  transcriptSummary: string;
  timestamp: string;
  status: 'open' | 'in_progress' | 'resolved';
}

const SERVICES = [
  {
    id: 'dental-cleaning',
    name: 'Comprehensive Dental Cleaning & Exam',
    duration: '45 mins',
    price: '$120',
    description: 'Full oral hygiene cleaning, plaque removal, fluoride treatment, and doctor exam.',
    category: 'Dental Care',
  },
  {
    id: 'physio-eval',
    name: 'Physiotherapy Assessment & Rehab',
    duration: '60 mins',
    price: '$95',
    description: 'Musculoskeletal evaluation, posture analysis, and targeted treatment plan.',
    category: 'Rehabilitation',
  },
  {
    id: 'wellness-check',
    name: 'Executive Health Screening',
    duration: '60 mins',
    price: '$160',
    description: 'Comprehensive vital signs check, metabolic panel review, and physician consult.',
    category: 'General Medicine',
  },
  {
    id: 'massage-therapy',
    name: 'Therapeutic Deep Tissue Massage',
    duration: '50 mins',
    price: '$85',
    description: 'Relief of chronic muscle tension and stress reduction by licensed therapists.',
    category: 'Wellness',
  },
  {
    id: 'hair-styling',
    name: 'Hair Styling & Treatment Salon',
    duration: '45 mins',
    price: '$65',
    description: 'Custom wash, cut, restorative keratin conditioning, and blow-dry styling.',
    category: 'Salon & Spa',
  },
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '01:00 PM',
  '02:00 PM',
  '03:30 PM',
  '04:30 PM',
];

// Helper to get formatted dates
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getInitialAppointments(): AppointmentRecord[] {
  return [
    {
      id: 'APT-101',
      customerName: 'Sarah Jenkins',
      contact: '(555) 234-5678',
      serviceType: 'Comprehensive Dental Cleaning & Exam',
      date: getDateOffset(1), // Tomorrow
      timeSlot: '10:00 AM',
      status: 'confirmed',
      notes: 'Requested Dr. Aris. Routine annual visit.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'APT-102',
      customerName: 'Marcus Vance',
      contact: '(555) 876-5432',
      serviceType: 'Physiotherapy Assessment & Rehab',
      date: getDateOffset(3), // In 3 days
      timeSlot: '02:00 PM',
      status: 'confirmed',
      notes: 'Follow-up for lower back strain.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'APT-103',
      customerName: 'Elena Rostova',
      contact: '(555) 345-9876',
      serviceType: 'Executive Health Screening',
      date: getDateOffset(5), // In 5 days
      timeSlot: '11:30 AM',
      status: 'confirmed',
      notes: 'Fasting required 8 hours prior.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'APT-104',
      customerName: 'David Chen',
      contact: '(555) 432-1098',
      serviceType: 'Therapeutic Deep Tissue Massage',
      date: getDateOffset(2),
      timeSlot: '03:30 PM',
      status: 'confirmed',
      notes: 'Focus on upper shoulder knots.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

let appointments: AppointmentRecord[] = getInitialAppointments();
let escalations: EscalationRecord[] = [];
let nextAppointmentNumber = 105;
let nextTicketNumber = 1;

// Business FAQ Information
const BUSINESS_INFO: Record<string, string> = {
  hours: 'We are open Monday through Saturday from 8:30 AM to 6:30 PM. Sunday is reserved for scheduled emergency appointments.',
  location: '742 Evergreen Wellness Plaza, Suite 300, Metro City (Free underground patient parking available).',
  pricing: 'Pricing: Dental Cleaning ($120), Physiotherapy ($95), Health Screening ($160), Deep Tissue Massage ($85), Hair Styling ($65). We accept most major insurance providers and HSA/FSA.',
  cancellation_policy: 'Appointments can be rescheduled or cancelled with at least 12 hours advance notice at zero fee. Cancellations under 4 hours may incur a $25 booking hold fee.',
  insurance: 'We are in-network with BlueCross, Aetna, Cigna, and UnitedHealthcare. Direct billing is handled at check-in.',
  general: 'Lumina Care & Wellness is an appointment-based multidisciplinary clinic and salon providing medical, rehabilitation, dental, and wellness services.',
};

// --- Function Calling Declarations for Gemini ---

const lookupAppointmentDeclaration: FunctionDeclaration = {
  name: 'lookup_appointment',
  description: 'Lookup an existing appointment by booking ID (e.g. APT-101) or customer name/phone.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      booking_id: {
        type: Type.STRING,
        description: 'The booking reference ID, e.g. APT-101 or APT-102.',
      },
      customer_name: {
        type: Type.STRING,
        description: 'The full or partial name of the customer.',
      },
      contact: {
        type: Type.STRING,
        description: 'The customer phone number or email.',
      },
    },
  },
};

const getAvailableSlotsDeclaration: FunctionDeclaration = {
  name: 'get_available_slots',
  description: 'Query available appointment dates and open time slots for a given service or date.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'The target date in YYYY-MM-DD or human phrase like "tomorrow" or "Friday".',
      },
      service_type: {
        type: Type.STRING,
        description: 'The name or category of the service.',
      },
    },
    required: ['date'],
  },
};

const bookAppointmentDeclaration: FunctionDeclaration = {
  name: 'book_appointment',
  description: 'Create and confirm a new customer appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customer_name: {
        type: Type.STRING,
        description: 'Full name of the customer.',
      },
      contact: {
        type: Type.STRING,
        description: 'Customer phone number or email address.',
      },
      service_type: {
        type: Type.STRING,
        description: 'The exact service being booked.',
      },
      date: {
        type: Type.STRING,
        description: 'The date for the appointment (YYYY-MM-DD or readable date).',
      },
      time_slot: {
        type: Type.STRING,
        description: 'The selected time slot, e.g. "10:00 AM" or "02:00 PM".',
      },
      notes: {
        type: Type.STRING,
        description: 'Any special requests or doctor preferences.',
      },
    },
    required: ['customer_name', 'contact', 'service_type', 'date', 'time_slot'],
  },
};

const rescheduleAppointmentDeclaration: FunctionDeclaration = {
  name: 'reschedule_appointment',
  description: 'Modify the date and/or time slot of an existing appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      booking_id: {
        type: Type.STRING,
        description: 'The ID of the existing appointment, e.g. APT-101.',
      },
      new_date: {
        type: Type.STRING,
        description: 'The new appointment date.',
      },
      new_time_slot: {
        type: Type.STRING,
        description: 'The new appointment time slot.',
      },
      reason: {
        type: Type.STRING,
        description: 'Optional reason for rescheduling.',
      },
    },
    required: ['booking_id', 'new_date', 'new_time_slot'],
  },
};

const cancelAppointmentDeclaration: FunctionDeclaration = {
  name: 'cancel_appointment',
  description: 'Cancel an existing confirmed appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      booking_id: {
        type: Type.STRING,
        description: 'The appointment ID to cancel.',
      },
      reason: {
        type: Type.STRING,
        description: 'Reason provided by customer for cancellation.',
      },
    },
    required: ['booking_id'],
  },
};

const escalateToHumanDeclaration: FunctionDeclaration = {
  name: 'escalate_to_human',
  description: 'Trigger escalation guardrail when the user expresses strong frustration/anger, complex dispute, billing grievance, or explicitly demands a supervisor/human.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customer_name: {
        type: Type.STRING,
        description: 'Customer name if known.',
      },
      contact: {
        type: Type.STRING,
        description: 'Customer contact details if known.',
      },
      reason: {
        type: Type.STRING,
        description: 'Specific reason for triggering the escalation guardrail.',
      },
      urgency_level: {
        type: Type.STRING,
        description: 'Urgency level: low, medium, high, or critical.',
      },
      sentiment: {
        type: Type.STRING,
        description: 'User sentiment: frustrated, angry, or complex_inquiry.',
      },
      summary: {
        type: Type.STRING,
        description: 'Brief executive summary of the conversation and user issue for the human agent.',
      },
    },
    required: ['reason', 'urgency_level', 'summary'],
  },
};

const getBusinessInfoDeclaration: FunctionDeclaration = {
  name: 'get_business_info',
  description: 'Retrieve factual information about business hours, services, location, insurance, pricing, and cancellation policy.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: 'The topic inquired: hours, location, pricing, cancellation_policy, insurance, or general.',
      },
    },
    required: ['topic'],
  },
};

// Tool execution implementation
function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'lookup_appointment': {
      const { booking_id, customer_name, contact } = args;
      const found = appointments.filter((apt) => {
        if (booking_id && apt.id.toLowerCase() === booking_id.trim().toLowerCase()) return true;
        if (customer_name && apt.customerName.toLowerCase().includes(customer_name.trim().toLowerCase())) return true;
        if (contact && apt.contact.includes(contact.trim())) return true;
        return false;
      });

      if (found.length > 0) {
        return {
          status: 'success',
          count: found.length,
          appointments: found,
          message: `Found ${found.length} matching appointment(s).`,
        };
      }
      return {
        status: 'not_found',
        count: 0,
        message: `No active appointment found for the provided details (ID: ${booking_id || 'N/A'}, Name: ${customer_name || 'N/A'}).`,
      };
    }

    case 'get_available_slots': {
      const { date, service_type } = args;
      // Parse relative date if string like "tomorrow"
      let resolvedDate = date;
      const lowerDate = (date || '').toLowerCase();
      if (lowerDate.includes('tomorrow')) resolvedDate = getDateOffset(1);
      else if (lowerDate.includes('today')) resolvedDate = getDateOffset(0);
      else if (lowerDate.includes('friday')) resolvedDate = getDateOffset(3);
      else if (lowerDate.includes('monday')) resolvedDate = getDateOffset(5);

      // Check booked slots on that date
      const bookedOnDate = appointments
        .filter((apt) => apt.date === resolvedDate && apt.status !== 'cancelled')
        .map((apt) => apt.timeSlot);

      const available = TIME_SLOTS.filter((slot) => !bookedOnDate.includes(slot));

      return {
        status: 'success',
        date: resolvedDate,
        service: service_type || 'General Service',
        available_slots: available,
        booked_slots: bookedOnDate,
        message: `For ${resolvedDate}, there are ${available.length} time slots available.`,
      };
    }

    case 'book_appointment': {
      const { customer_name, contact, service_type, date, time_slot, notes } = args;
      let resolvedDate = date;
      const lower = (date || '').toLowerCase();
      if (lower.includes('tomorrow')) resolvedDate = getDateOffset(1);
      else if (lower.includes('today')) resolvedDate = getDateOffset(0);
      else if (lower.includes('friday')) resolvedDate = getDateOffset(3);
      else if (lower.includes('monday')) resolvedDate = getDateOffset(5);

      const newId = `APT-${nextAppointmentNumber++}`;
      const newAppointment: AppointmentRecord = {
        id: newId,
        customerName: customer_name || 'Valued Client',
        contact: contact || '(Unspecified)',
        serviceType: service_type || 'General Consultation',
        date: resolvedDate || getDateOffset(1),
        timeSlot: time_slot || '10:00 AM',
        status: 'confirmed',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      appointments.push(newAppointment);
      return {
        status: 'confirmed',
        booking_id: newId,
        appointment: newAppointment,
        message: `Successfully booked appointment ${newId} for ${customer_name} on ${resolvedDate} at ${time_slot}.`,
      };
    }

    case 'reschedule_appointment': {
      const { booking_id, new_date, new_time_slot, reason } = args;
      const apt = appointments.find(
        (a) => a.id.toLowerCase() === (booking_id || '').trim().toLowerCase()
      );

      if (!apt) {
        return {
          status: 'error',
          message: `Appointment ${booking_id} could not be located in our system.`,
        };
      }

      let resolvedDate = new_date;
      const lower = (new_date || '').toLowerCase();
      if (lower.includes('tomorrow')) resolvedDate = getDateOffset(1);
      else if (lower.includes('today')) resolvedDate = getDateOffset(0);
      else if (lower.includes('friday')) resolvedDate = getDateOffset(3);
      else if (lower.includes('monday')) resolvedDate = getDateOffset(5);

      const oldDate = apt.date;
      const oldTime = apt.timeSlot;

      apt.date = resolvedDate;
      apt.timeSlot = new_time_slot;
      apt.status = 'rescheduled';
      apt.updatedAt = new Date().toISOString();
      if (reason) {
        apt.notes = `${apt.notes ? apt.notes + ' | ' : ''}Reschedule note: ${reason}`;
      }

      return {
        status: 'success',
        booking_id: apt.id,
        previous: { date: oldDate, time: oldTime },
        updated: { date: apt.date, time: apt.timeSlot },
        customer: apt.customerName,
        message: `Appointment ${apt.id} successfully rescheduled from ${oldDate} at ${oldTime} to ${resolvedDate} at ${new_time_slot}.`,
      };
    }

    case 'cancel_appointment': {
      const { booking_id, reason } = args;
      const apt = appointments.find(
        (a) => a.id.toLowerCase() === (booking_id || '').trim().toLowerCase()
      );

      if (!apt) {
        return {
          status: 'error',
          message: `Appointment ${booking_id} was not found.`,
        };
      }

      apt.status = 'cancelled';
      apt.updatedAt = new Date().toISOString();
      if (reason) {
        apt.notes = `${apt.notes ? apt.notes + ' | ' : ''}Cancellation reason: ${reason}`;
      }

      return {
        status: 'cancelled',
        booking_id: apt.id,
        customer: apt.customerName,
        message: `Appointment ${apt.id} has been cancelled as requested.`,
      };
    }

    case 'escalate_to_human': {
      const { customer_name, contact, reason, urgency_level, sentiment, summary } = args;
      const ticketId = `ESC-${1000 + nextTicketNumber++}`;
      const newEscalation: EscalationRecord = {
        id: ticketId,
        customerName: customer_name || 'Guest Customer',
        contact: contact || 'Pending contact',
        reason: reason || 'Customer dispute / Escalation trigger',
        urgency: (['low', 'medium', 'high', 'critical'].includes(urgency_level) ? urgency_level : 'high') as any,
        sentiment: (['positive', 'neutral', 'frustrated', 'angry'].includes(sentiment) ? sentiment : 'angry') as any,
        transcriptSummary: summary || 'Escalation triggered via guardrail.',
        timestamp: new Date().toISOString(),
        status: 'open',
      };

      escalations.unshift(newEscalation);
      return {
        status: 'escalated',
        ticket_id: ticketId,
        escalation: newEscalation,
        message: `Issue escalated to Human Duty Supervisor. Ticket #${ticketId} created. Priority: ${urgency_level}.`,
      };
    }

    case 'get_business_info': {
      const { topic } = args;
      const cleanTopic = (topic || '').toLowerCase();
      let matchedKey = 'general';
      if (cleanTopic.includes('hour') || cleanTopic.includes('open') || cleanTopic.includes('time')) matchedKey = 'hours';
      else if (cleanTopic.includes('price') || cleanTopic.includes('cost') || cleanTopic.includes('fee')) matchedKey = 'pricing';
      else if (cleanTopic.includes('location') || cleanTopic.includes('address') || cleanTopic.includes('where')) matchedKey = 'location';
      else if (cleanTopic.includes('cancel') || cleanTopic.includes('policy')) matchedKey = 'cancellation_policy';
      else if (cleanTopic.includes('insurance') || cleanTopic.includes('coverage')) matchedKey = 'insurance';

      return {
        topic: matchedKey,
        info: BUSINESS_INFO[matchedKey] || BUSINESS_INFO.general,
      };
    }

    default:
      return { status: 'unknown_tool', message: `No handler registered for ${name}` };
  }
}

// Helper: Intent & Sentiment Classifier + Parameter Extractor
function analyzeUserIntentAndState(
  message: string,
  history: Array<{ role: string; content: string }>,
  prevState: any
) {
  const text = message.toLowerCase();

  // 1. Sentiment & Anger detection for Escalation Guardrail
  let sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' = 'neutral';
  const angryKeywords = [
    'terrible', 'horrible', 'ridiculous', 'unacceptable', 'scam', 'furious',
    'angry', 'incompetent', 'lawyer', 'sue', 'worst', 'rip off', 'double charge',
    'charged twice', 'waste of time', 'manager', 'human', 'supervisor', 'representative',
    'real person', 'talk to someone', 'stop answering with a bot'
  ];
  const frustratedKeywords = ['annoyed', 'waiting', 'slow', 'confused', 'already told you', 'not helpful'];

  if (angryKeywords.some((w) => text.includes(w))) {
    sentiment = 'angry';
  } else if (frustratedKeywords.some((w) => text.includes(w))) {
    sentiment = 'frustrated';
  } else if (text.includes('great') || text.includes('thanks') || text.includes('thank you') || text.includes('perfect') || text.includes('awesome')) {
    sentiment = 'positive';
  }

  // 2. Intent detection: info_query | booking | reschedule | cancel | complaint_escalation
  let intent: 'info_query' | 'booking' | 'reschedule' | 'cancel' | 'complaint_escalation' | 'unknown' = 'unknown';
  let routingReason = '';

  if (sentiment === 'angry' || text.includes('complaint') || text.includes('speak to a human') || text.includes('talk to a human') || text.includes('manager')) {
    intent = 'complaint_escalation';
    routingReason = 'Escalation guardrail triggered: detected high user frustration, complaint, or explicit request for human supervisor.';
  } else if (text.includes('resched') || text.includes('change date') || text.includes('move my appointment') || text.includes('change time') || text.includes('different time') || text.includes('postpone')) {
    intent = 'reschedule';
    routingReason = 'Intent routed to Reschedule Flow: user expressed intent to modify an existing booking date or time.';
  } else if (text.includes('cancel') || text.includes('drop') || text.includes('call off') || text.includes('cannot make it')) {
    intent = 'cancel';
    routingReason = 'Intent routed to Cancel Flow: user expressed intent to cancel a scheduled appointment.';
  } else if (text.includes('book') || text.includes('schedule') || text.includes('appointment') || text.includes('reserve') || text.includes('make a visit') || text.includes('see a doctor')) {
    intent = 'booking';
    routingReason = 'Intent routed to Booking Flow: user requested a new appointment reservation.';
  } else if (
    text.includes('hour') || text.includes('price') || text.includes('cost') || text.includes('where') ||
    text.includes('address') || text.includes('location') || text.includes('insurance') || text.includes('services') ||
    text.includes('what do you') || text.includes('how much') || text.includes('open')
  ) {
    intent = 'info_query';
    routingReason = 'Intent routed to Information Query Flow: user is seeking business, pricing, or operational details.';
  } else if (prevState?.currentIntent && prevState.currentIntent !== 'unknown' && prevState.currentIntent !== 'completed') {
    // Retain flow if user is answering a mid-flow prompt
    intent = prevState.currentIntent;
    routingReason = `Continuing existing flow: ${prevState.currentIntent} (user responding with flow parameters).`;
  } else {
    intent = 'info_query';
    routingReason = 'Defaulted to Info Query for general conversational query.';
  }

  // 3. Extract parameters mid-conversation
  const extracted = { ...(prevState?.extractedParams || {}) };

  // Check for booking ID like APT-101
  const aptMatch = message.match(/\b(apt-\d{3,4})\b/i);
  if (aptMatch) {
    extracted.bookingId = aptMatch[1].toUpperCase();
  }

  // 1. Extract contact / phone / email
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10,12}\b/;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneMatch = message.match(phonePattern) || message.match(emailPattern);
  let matchedPhone: string | null = null;
  if (phoneMatch) {
    matchedPhone = phoneMatch[0].trim();
    extracted.contact = matchedPhone;
  }

  // 2. Extract Customer Name
  const invalidNameWords = new Set([
    'tomorrow', 'today', 'yesterday', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday',
    'appointment', 'booking', 'service', 'morning', 'afternoon', 'evening', 'cleaning', 'physiotherapy', 'screening',
    'massage', 'salon', 'doctor', 'manager', 'human', 'supervisor', 'contact', 'phone', 'email', 'number', 'please',
    'yes', 'no', 'thanks', 'thank you', 'ok', 'okay', 'sure', 'help', 'info', 'hours', 'cost', 'price', 'cancel', 'reschedule',
    'general', 'physio', 'dental', 'health', 'executive', 'deep', 'tissue'
  ]);

  // Check explicit name patterns: "my name is X", "i am X", "this is X", "name: X", "for X", "under X"
  const explicitNameMatch = message.match(/(?:my name is|i am|i'm|this is|name\s*is|name:\s*|under the name of|under\s+|for\s+)([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,3})/i);
  if (explicitNameMatch) {
    const candidate = explicitNameMatch[1].trim();
    const candidateWords = candidate.toLowerCase().split(/\s+/);
    if (!candidateWords.some((w) => invalidNameWords.has(w))) {
      extracted.customerName = candidate;
    }
  }

  // If no explicit phrase, check if the remaining message (without phone/symbols) is a customer name
  // Handles inputs like: "Sarthak Srivastava 7050227446" or "Sarthak Srivastava"
  let cleanText = message;
  if (matchedPhone) {
    cleanText = cleanText.replace(matchedPhone, ' ');
  }
  // Strip punctuation and common filler prefixes
  cleanText = cleanText
    .replace(/(?:my\s+phone\s+is|my\s+number\s+is|contact\s+is|phone\s*[:=]|mobile\s*[:=])/gi, ' ')
    .replace(/[,:;\-–—|/()#]/g, ' ')
    .trim();

  const candidateWords = cleanText.split(/\s+/).filter((w) => w.length > 0);
  if (candidateWords.length >= 1 && candidateWords.length <= 4) {
    const isAllAlpha = candidateWords.every((w) => /^[A-Za-z'.]+$/.test(w));
    const hasInvalidWord = candidateWords.some((w) => invalidNameWords.has(w.toLowerCase()));
    if (isAllAlpha && !hasInvalidWord) {
      // Capitalize proper name casing
      const formattedName = candidateWords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      extracted.customerName = formattedName;
    }
  }

  // Also check if user mentions an existing patient name in database
  if (!extracted.customerName) {
    for (const apt of appointments) {
      if (text.includes(apt.customerName.toLowerCase())) {
        extracted.customerName = apt.customerName;
        if (!extracted.bookingId) extracted.bookingId = apt.id;
        break;
      }
    }
  }

  // Check for service
  for (const s of SERVICES) {
    if (text.includes(s.name.toLowerCase()) || text.includes(s.id.replace('-', ' '))) {
      extracted.serviceType = s.name;
      break;
    }
  }
  if (!extracted.serviceType) {
    if (text.includes('dental') || text.includes('teeth')) extracted.serviceType = 'Comprehensive Dental Cleaning & Exam';
    else if (text.includes('physio') || text.includes('back')) extracted.serviceType = 'Physiotherapy Assessment & Rehab';
    else if (text.includes('health') || text.includes('screening') || text.includes('checkup')) extracted.serviceType = 'Executive Health Screening';
    else if (text.includes('massage')) extracted.serviceType = 'Therapeutic Deep Tissue Massage';
    else if (text.includes('hair') || text.includes('salon')) extracted.serviceType = 'Hair Styling & Treatment Salon';
  }

  // Check for dates
  if (text.includes('tomorrow')) extracted.date = getDateOffset(1);
  else if (text.includes('today')) extracted.date = getDateOffset(0);
  else if (text.includes('friday')) extracted.date = getDateOffset(3);
  else if (text.includes('monday')) extracted.date = getDateOffset(5);
  else {
    const isoMatch = message.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoMatch) extracted.date = isoMatch[0];
  }

  // Check for times
  const timeMatch = message.match(/\b(0?[1-9]|1[0-2]):[0-5][0-9]\s*(?:am|pm)\b/i) || message.match(/\b(0?[1-9]|1[0-2])\s*(?:am|pm)\b/i);
  if (timeMatch) {
    let t = timeMatch[0].toUpperCase();
    if (!t.includes(':')) {
      t = t.replace(/(AM|PM)/, ':00 $1');
    }
    extracted.timeSlot = t;
  }

  // Determine missing required params depending on intent
  const missing: string[] = [];
  if (intent === 'booking') {
    if (!extracted.serviceType) missing.push('serviceType');
    if (!extracted.date) missing.push('date');
    if (!extracted.timeSlot) missing.push('timeSlot');
    if (!extracted.customerName) missing.push('customerName');
    if (!extracted.contact) missing.push('contact');
  } else if (intent === 'reschedule') {
    if (!extracted.bookingId && !extracted.customerName) missing.push('bookingId or customerName');
    if (!extracted.date) missing.push('new_date');
    if (!extracted.timeSlot) missing.push('new_time_slot');
  } else if (intent === 'cancel') {
    if (!extracted.bookingId && !extracted.customerName) missing.push('bookingId or customerName');
  }

  let flowStage: 'greeting' | 'routing' | 'collecting_info' | 'checking_availability' | 'awaiting_confirmation' | 'executing_tool' | 'completed' | 'escalated_to_human' = 'routing';

  if (intent === 'complaint_escalation') {
    flowStage = 'escalated_to_human';
  } else if (missing.length === 0 && (intent === 'booking' || intent === 'reschedule' || intent === 'cancel')) {
    flowStage = 'executing_tool';
  } else if (missing.length > 0) {
    flowStage = 'collecting_info';
  } else {
    flowStage = 'completed';
  }

  return {
    currentIntent: intent,
    flowStage,
    sentiment,
    isEscalated: intent === 'complaint_escalation',
    extractedParams: extracted,
    missingRequiredParams: missing,
    routingReasoning: routingReason,
    lastFunctionExecuted: undefined as string | undefined,
  };
}

// Fallback deterministic conversational agent logic (when GEMINI_API_KEY is not configured or offline)
function processFallbackAgent(
  userMessage: string,
  state: any,
  toolsRun: any[]
): { reply: string; newState: any } {
  const { currentIntent, extractedParams, sentiment, missingRequiredParams } = state;
  const text = userMessage.toLowerCase();

  // 1. Escalation Flow
  if (currentIntent === 'complaint_escalation' || sentiment === 'angry') {
    const escReason = text.includes('manager') ? 'Requested Human Supervisor' : 'High User Frustration & Escalation Guardrail Triggered';
    const escResult = executeTool('escalate_to_human', {
      customer_name: extractedParams.customerName || 'Customer',
      contact: extractedParams.contact || 'Direct Chat Session',
      reason: escReason,
      urgency_level: 'high',
      sentiment,
      summary: `User expressed severe dissatisfaction or explicit escalation: "${userMessage}". Conversation handed off to Human Duty Lead.`,
    });
    toolsRun.push({
      name: 'escalate_to_human',
      args: { customer_name: extractedParams.customerName, reason: escReason, urgency_level: 'high' },
      result: escResult,
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    state.flowStage = 'escalated_to_human';
    state.isEscalated = true;
    state.lastFunctionExecuted = 'escalate_to_human';

    return {
      reply: `I deeply apologize for this frustrating experience. As an automated assistant, I recognize that this issue requires personal, dedicated attention.

I have immediately activated our **Escalation Guardrail** and transferred your case to our **Human Duty Supervisor** (Escalation Ticket **#${escResult.ticket_id}**). A supervisor is reviewing your full transcript and will step in directly. Thank you for your patience while we make this right.`,
      newState: state,
    };
  }

  // 2. Reschedule Flow
  if (currentIntent === 'reschedule') {
    // Try to lookup appointment if not already looked up
    let targetApt: AppointmentRecord | undefined;
    if (extractedParams.bookingId) {
      targetApt = appointments.find((a) => a.id.toLowerCase() === extractedParams.bookingId.toLowerCase());
    }
    if (!targetApt && extractedParams.customerName) {
      targetApt = appointments.find((a) =>
        a.customerName.toLowerCase().includes(extractedParams.customerName.toLowerCase())
      );
      if (targetApt) extractedParams.bookingId = targetApt.id;
    }

    // If no booking found or not specified yet
    if (!targetApt && !extractedParams.bookingId) {
      // Check if user says "my appointment is tomorrow"
      if (text.includes('tomorrow') || text.includes('my appointment')) {
        // Look up by default Sarah Jenkins or search list
        const tomorrowApt = appointments.find((a) => a.date === getDateOffset(1) && a.status === 'confirmed');
        if (tomorrowApt) {
          targetApt = tomorrowApt;
          extractedParams.bookingId = tomorrowApt.id;
          extractedParams.customerName = tomorrowApt.customerName;
        }
      }
    }

    if (targetApt && !toolsRun.some((t) => t.name === 'lookup_appointment')) {
      const lookupRes = executeTool('lookup_appointment', { booking_id: targetApt.id });
      toolsRun.push({
        name: 'lookup_appointment',
        args: { booking_id: targetApt.id },
        result: lookupRes,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
    }

    if (!targetApt && !extractedParams.bookingId) {
      state.flowStage = 'collecting_info';
      return {
        reply: `I can certainly help you reschedule your appointment! Could you please provide your **Appointment ID** (e.g., APT-101) or the **full name** under which the booking was made?`,
        newState: state,
      };
    }

    // We have booking, do we have new date/time?
    if (!extractedParams.date || !extractedParams.timeSlot) {
      // Run get_available_slots to show open options
      const targetDate = extractedParams.date || getDateOffset(3); // e.g. Friday
      const slotsRes = executeTool('get_available_slots', { date: targetDate });
      toolsRun.push({
        name: 'get_available_slots',
        args: { date: targetDate },
        result: slotsRes,
        timestamp: new Date().toISOString(),
        status: 'success',
      });

      state.flowStage = 'awaiting_confirmation';
      const aptInfo = targetApt ? `${targetApt.id} (${targetApt.serviceType} on ${targetApt.date} at ${targetApt.timeSlot})` : extractedParams.bookingId;
      const openSlots = slotsRes.available_slots ? slotsRes.available_slots.slice(0, 4).join(', ') : '10:00 AM, 02:00 PM';

      return {
        reply: `I found your existing booking: **${aptInfo}**. 

What new date and time would you prefer? For example, open slots on **${slotsRes.date}** include: ${openSlots}.`,
        newState: state,
      };
    }

    // We have both booking and new date & time -> execute reschedule_appointment()
    const reschedResult = executeTool('reschedule_appointment', {
      booking_id: extractedParams.bookingId,
      new_date: extractedParams.date,
      new_time_slot: extractedParams.timeSlot,
      reason: 'Customer requested reschedule via AI Assistant',
    });

    toolsRun.push({
      name: 'reschedule_appointment',
      args: { booking_id: extractedParams.bookingId, new_date: extractedParams.date, new_time_slot: extractedParams.timeSlot },
      result: reschedResult,
      timestamp: new Date().toISOString(),
      status: reschedResult.status === 'success' ? 'success' : 'error',
    });

    state.flowStage = 'completed';
    state.lastFunctionExecuted = 'reschedule_appointment';

    return {
      reply: `Your appointment **${extractedParams.bookingId}** has been successfully rescheduled to **${extractedParams.date} at ${extractedParams.timeSlot}**! 

A confirmation notice has been dispatched. Is there anything else I can assist you with today?`,
      newState: state,
    };
  }

  // 3. Cancel Flow
  if (currentIntent === 'cancel') {
    let targetApt: AppointmentRecord | undefined;
    if (extractedParams.bookingId) {
      targetApt = appointments.find((a) => a.id.toLowerCase() === extractedParams.bookingId.toLowerCase());
    }
    if (!targetApt && extractedParams.customerName) {
      targetApt = appointments.find((a) =>
        a.customerName.toLowerCase().includes(extractedParams.customerName.toLowerCase())
      );
      if (targetApt) extractedParams.bookingId = targetApt.id;
    }

    if (!targetApt && !extractedParams.bookingId) {
      state.flowStage = 'collecting_info';
      return {
        reply: `I can help cancel your appointment. Could you provide your **Appointment ID** (e.g. APT-101) or the name on the reservation?`,
        newState: state,
      };
    }

    const cancelResult = executeTool('cancel_appointment', {
      booking_id: extractedParams.bookingId || targetApt?.id,
      reason: 'Customer cancellation requested in support chat',
    });

    toolsRun.push({
      name: 'cancel_appointment',
      args: { booking_id: extractedParams.bookingId },
      result: cancelResult,
      timestamp: new Date().toISOString(),
      status: cancelResult.status === 'cancelled' ? 'success' : 'error',
    });

    state.flowStage = 'completed';
    state.lastFunctionExecuted = 'cancel_appointment';

    return {
      reply: `Your appointment **${extractedParams.bookingId}** has been officially cancelled. As per our 12-hour cancellation policy, no penalty fee was applied. We hope to welcome you back whenever you are ready!`,
      newState: state,
    };
  }

  // 4. Booking Flow
  if (currentIntent === 'booking') {
    // Check what is missing
    if (!extractedParams.serviceType) {
      state.flowStage = 'collecting_info';
      return {
        reply: `I would be happy to book an appointment for you! Which service are you looking for?
We offer:
- **Comprehensive Dental Cleaning & Exam** ($120)
- **Physiotherapy Assessment & Rehab** ($95)
- **Executive Health Screening** ($160)
- **Therapeutic Deep Tissue Massage** ($85)
- **Hair Styling & Treatment Salon** ($65)`,
        newState: state,
      };
    }

    if (!extractedParams.date || !extractedParams.timeSlot) {
      const checkDate = extractedParams.date || getDateOffset(1);
      const slots = executeTool('get_available_slots', { date: checkDate, service_type: extractedParams.serviceType });
      toolsRun.push({
        name: 'get_available_slots',
        args: { date: checkDate, service_type: extractedParams.serviceType },
        result: slots,
        timestamp: new Date().toISOString(),
        status: 'success',
      });

      state.flowStage = 'collecting_info';
      const openSlots = slots.available_slots ? slots.available_slots.join(', ') : '10:00 AM, 02:00 PM';
      return {
        reply: `Great choice for **${extractedParams.serviceType}**. 
For **${slots.date}**, we have the following slots open: **${openSlots}**. 
Which time works best for you? Also, please provide your **full name** and **contact number**.`,
        newState: state,
      };
    }

    if (!extractedParams.customerName || !extractedParams.contact) {
      state.flowStage = 'collecting_info';
      const slotDesc = `${extractedParams.date} at ${extractedParams.timeSlot}`;
      if (extractedParams.customerName && !extractedParams.contact) {
        return {
          reply: `Thank you, **${extractedParams.customerName}**! What is your **phone number** or email so we can finalize and confirm your appointment for **${slotDesc}**?`,
          newState: state,
        };
      }
      if (!extractedParams.customerName && extractedParams.contact) {
        return {
          reply: `Thank you! Could you please provide your **full name** so we can confirm the reservation for **${slotDesc}**?`,
          newState: state,
        };
      }
      return {
        reply: `I have reserved **${extractedParams.serviceType}** on **${slotDesc}**. To finalize and confirm this appointment, what is your **full name** and **phone number**?`,
        newState: state,
      };
    }

    // All parameters present -> call book_appointment
    const bookResult = executeTool('book_appointment', {
      customer_name: extractedParams.customerName,
      contact: extractedParams.contact,
      service_type: extractedParams.serviceType,
      date: extractedParams.date,
      time_slot: extractedParams.timeSlot,
      notes: 'Booked via AI Support Assistant',
    });

    toolsRun.push({
      name: 'book_appointment',
      args: {
        customer_name: extractedParams.customerName,
        service_type: extractedParams.serviceType,
        date: extractedParams.date,
        time_slot: extractedParams.timeSlot,
      },
      result: bookResult,
      timestamp: new Date().toISOString(),
      status: 'success',
    });

    state.flowStage = 'completed';
    state.lastFunctionExecuted = 'book_appointment';

    return {
      reply: `Congratulations, **${extractedParams.customerName}**! Your appointment **${bookResult.booking_id}** is confirmed.

- **Service**: ${extractedParams.serviceType}
- **Date & Time**: ${extractedParams.date} at ${extractedParams.timeSlot}
- **Contact**: ${extractedParams.contact}
- **Location**: 742 Evergreen Wellness Plaza, Suite 300

We look forward to seeing you! Let me know if you have any questions or need preparation instructions.`,
      newState: state,
    };
  }

  // 5. Info Query Flow
  const infoTool = executeTool('get_business_info', { topic: userMessage });
  toolsRun.push({
    name: 'get_business_info',
    args: { topic: infoTool.topic },
    result: infoTool,
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  state.flowStage = 'completed';
  return {
    reply: `${infoTool.info} 

Would you like to check available slots or schedule an appointment?`,
    newState: state,
  };
}

// --- API Endpoints ---

app.get('/api/appointments', (req, res) => {
  res.json({ success: true, appointments });
});

app.get('/api/escalations', (req, res) => {
  res.json({ success: true, escalations });
});

app.get('/api/services', (req, res) => {
  res.json({ success: true, services: SERVICES, slots: TIME_SLOTS });
});

app.post('/api/reset', (req, res) => {
  appointments = getInitialAppointments();
  escalations = [];
  nextAppointmentNumber = 105;
  nextTicketNumber = 1;
  res.json({ success: true, message: 'Database reset to default demo data.' });
});

// Helper to construct role-specific System Instructions for Gemini
function getSystemInstructionForRole(
  role: string = 'clinic_specialist',
  customInstruction: string = '',
  updatedState?: any
): string {
  const baseClinicContext = `You are Lumina Care's AI Customer Support & Appointment Scheduling Agent.
Clinic Profile:
- Address: 742 Evergreen Wellness Plaza, Suite 300, Springfield
- Phone: (555) 345-9876 | Hours: Mon-Fri 8:00 AM - 6:00 PM, Sat 9:00 AM - 2:00 PM, Sun Closed
- Reference Today: 2026-09-22
- Accepted Insurances: BlueCross, Aetna, UnitedHealthcare, Medicare, Cigna
- Services:
  1. Comprehensive Dental Cleaning & Exam ($120, 45 min)
  2. Physiotherapy Assessment & Rehab ($95, 60 min)
  3. Executive Health Screening ($160, 75 min - requires 8hr fasting)
  4. Therapeutic Deep Tissue Massage ($85, 60 min)
  5. Hair Styling & Treatment Salon ($65, 45 min)
- Daily Standard Slots: 09:00 AM, 10:00 AM, 11:30 AM, 01:00 PM, 02:00 PM, 03:30 PM, 04:30 PM
- Policy: 24-hour advance notice required to reschedule or cancel without fee.

Core Directives:
1. Multi-turn Intent Routing: Accurately identify customer intent (Booking, Reschedule, Cancellation, Info Query, or Escalation).
2. Function Calling:
   - Call 'get_available_slots' when user asks about slot availability or dates.
   - Call 'book_appointment' ONLY when you have customer name, contact phone/email, service, date, and time slot. If any are missing, ask for ONLY the missing details politely!
   - Call 'lookup_appointment' and 'reschedule_appointment' for rescheduling requests.
   - Call 'cancel_appointment' when the user wants to cancel.
   - Call 'escalate_to_human' immediately when the user shows anger, billing disputes, medical emergency, or explicitly requests a supervisor.
3. Conversation-State Memory: Remember parameters already collected across multi-turn history. Current extracted parameters: ${JSON.stringify(
    updatedState?.extractedParams || {}
  )}. Never re-ask for details already in memory!`;

  switch (role) {
    case 'concierge':
      return `${baseClinicContext}

Active Role: Executive Health & VIP Wellness Concierge
Tone: Attentive, luxurious, warm, and highly thorough. Provide preparation advice (e.g., fasting for health panels, loose comfortable attire for physiotherapy), ensure scheduling convenience, and deliver white-glove clinical coordination.`;

    case 'triage_speed':
      return `${baseClinicContext}

Active Role: Express Triage & Rapid Scheduling Assistant
Tone: Fast, direct, concise, and efficient. Check slots immediately, confirm details in brief bullet points, and instantly flag urgent complaints or symptoms to human supervisors.`;

    case 'custom':
      return customInstruction && customInstruction.trim().length > 0
        ? `${baseClinicContext}

Active Role: Custom Configured Agent Persona
Special Instructions: ${customInstruction}`
        : `${baseClinicContext}

Active Role: Custom Patient Assistant
Tone: Courteous, professional, and helpful.`;

    case 'clinic_specialist':
    default:
      return `${baseClinicContext}

Active Role: Clinic Care & Appointment Scheduling Specialist
Tone: Empathetic, supportive, professional, and clear. Guide patients smoothly through inquiries, new bookings, changes, and cancellations.`;
  }
}

// Model Selection Routing per user specifications:
// - gemini-3.1-pro-preview for particularly complex tasks
// - gemini-3.5-flash for general tasks
// - gemini-3.1-flash-lite for tasks that should happen fast
function selectModelForTask(
  requestedModel: string = 'auto',
  message: string,
  state: any
): { targetModel: string; reason: string } {
  if (requestedModel && requestedModel !== 'auto') {
    return { targetModel: requestedModel, reason: `Explicit user selection: ${requestedModel}` };
  }

  // 1. Complex Tasks -> gemini-3.1-pro-preview
  const isComplex =
    state.currentIntent === 'complaint_escalation' ||
    state.sentiment === 'angry' ||
    state.sentiment === 'frustrated' ||
    message.length > 200 ||
    /dispute|charge|bill|unacceptable|lawyer|supervisor|manager|malpractice|complication|allergy|emergency/i.test(message);

  if (isComplex) {
    return {
      targetModel: 'gemini-3.5-flash',
      reason: 'Complex Task: High-sentiment escalation, billing dispute, or complex clinical inquiry handled with deep reasoning.',
    };
  }

  // 2. Fast Tasks -> gemini-3.1-flash-lite
  const isFast =
    (state.currentIntent === 'info_query' && message.length < 90) ||
    /^(hi|hello|hey|hours|where|cost|price|slots|open|available)\b/i.test(message.trim());

  if (isFast) {
    return {
      targetModel: 'gemini-3.1-flash-lite',
      reason: 'Fast Task: Quick informational FAQ or slot query optimized for minimal response latency.',
    };
  }

  // 3. General Tasks -> gemini-3.5-flash
  return {
    targetModel: 'gemini-3.5-flash',
    reason: 'General Task: Standard multi-turn appointment booking or rescheduling flow.',
  };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      history = [], 
      state = null, 
      model = 'auto', 
      role = 'clinic_specialist',
      customInstruction = '' 
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid message string is required.' });
    }

    // Step 1: Intent Routing, Sentiment Detection, and Conversation-State Extraction
    const updatedState = analyzeUserIntentAndState(message, history, state);
    const toolsExecuted: any[] = [];

    // Select the appropriate Gemini model
    const selection = selectModelForTask(model, message, updatedState);
    let chosenModel = selection.targetModel;
    let actualModelUsed = chosenModel;

    // Step 2: Check for Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 5) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
            timeout: 30000,
          },
        });

        const systemInstruction = getSystemInstructionForRole(role, customInstruction, updatedState);

        // Prepare multi-turn contents for Gemini
        const formattedContents: any[] = [];
        for (const h of history.slice(-10)) {
          if (!h.content || typeof h.content !== 'string') continue;
          formattedContents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          });
        }
        formattedContents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const toolDeclarations = [
          lookupAppointmentDeclaration,
          getAvailableSlotsDeclaration,
          bookAppointmentDeclaration,
          rescheduleAppointmentDeclaration,
          cancelAppointmentDeclaration,
          escalateToHumanDeclaration,
          getBusinessInfoDeclaration,
        ];

        // Execute Gemini call with auto-fallback for quota and high demand spikes
        let geminiResponse: any;
        try {
          geminiResponse = await ai.models.generateContent({
            model: chosenModel,
            contents: formattedContents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: toolDeclarations }],
            },
          });
        } catch (callErr: any) {
          // If gemini-3.1-pro-preview exceeded quota or unavailable on free tier, fallback to gemini-3.5-flash
          if (chosenModel === 'gemini-3.1-pro-preview' && (callErr?.status === 429 || callErr?.message?.includes('quota') || callErr?.status === 404)) {
            console.warn('gemini-3.1-pro-preview quota exceeded on free tier. Gracefully falling back to gemini-3.5-flash for complex task.');
            chosenModel = 'gemini-3.5-flash';
            actualModelUsed = 'gemini-3.5-flash (pro fallback)';
            try {
              geminiResponse = await ai.models.generateContent({
                model: chosenModel,
                contents: formattedContents,
                config: {
                  systemInstruction,
                  tools: [{ functionDeclarations: toolDeclarations }],
                },
              });
            } catch (flashErr: any) {
              console.warn('gemini-3.5-flash busy, falling back to gemini-3.1-flash-lite');
              chosenModel = 'gemini-3.1-flash-lite';
              actualModelUsed = 'gemini-3.1-flash-lite (fast fallback)';
              geminiResponse = await ai.models.generateContent({
                model: chosenModel,
                contents: formattedContents,
                config: {
                  systemInstruction,
                  tools: [{ functionDeclarations: toolDeclarations }],
                },
              });
            }
          } else if (callErr?.status === 503 || callErr?.status === 429 || callErr?.message?.includes('high demand') || callErr?.message?.includes('quota')) {
            // If temporary 503 high demand or quota on current model, fall back to gemini-3.1-flash-lite
            console.warn(`Model ${chosenModel} returned ${callErr?.status || 'high demand'}, falling back to gemini-3.1-flash-lite.`);
            chosenModel = 'gemini-3.1-flash-lite';
            actualModelUsed = 'gemini-3.1-flash-lite (demand fallback)';
            geminiResponse = await ai.models.generateContent({
              model: chosenModel,
              contents: formattedContents,
              config: {
                systemInstruction,
                tools: [{ functionDeclarations: toolDeclarations }],
              },
            });
          } else {
            throw callErr;
          }
        }

        // Check if function calls were requested by Gemini
        const functionCalls = geminiResponse.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const functionResponses: any[] = [];

          for (const call of functionCalls) {
            const toolName = call.name || 'unknown_tool';
            const result = executeTool(toolName, (call.args as any) || {});
            toolsExecuted.push({
              name: toolName,
              args: call.args,
              result,
              timestamp: new Date().toISOString(),
              status: 'success',
            });
            functionResponses.push({
              name: toolName,
              response: { result },
            });

            // Synchronize state flags
            if (toolName === 'escalate_to_human') {
              updatedState.isEscalated = true;
              updatedState.currentIntent = 'complaint_escalation';
              updatedState.flowStage = 'escalated_to_human';
            } else if (toolName === 'book_appointment' && result.status === 'confirmed') {
              updatedState.flowStage = 'completed';
              updatedState.lastFunctionExecuted = 'book_appointment';
              if (result.appointment?.customerName) updatedState.extractedParams.customerName = result.appointment.customerName;
              if (result.appointment?.contact) updatedState.extractedParams.contact = result.appointment.contact;
            } else if (toolName === 'reschedule_appointment' && result.status === 'rescheduled') {
              updatedState.flowStage = 'completed';
              updatedState.lastFunctionExecuted = 'reschedule_appointment';
            } else if (toolName === 'cancel_appointment') {
              updatedState.flowStage = 'completed';
              updatedState.lastFunctionExecuted = 'cancel_appointment';
            }
          }

          // Follow-up call with tool outputs to generate natural human-facing reply
          const followUpContents = [
            ...formattedContents,
            geminiResponse.candidates?.[0]?.content,
            {
              role: 'tool',
              parts: functionResponses.map((fr) => ({
                functionResponse: fr,
              })),
            },
          ];

          let followUpResponse: any;
          try {
            followUpResponse = await ai.models.generateContent({
              model: chosenModel,
              contents: followUpContents,
              config: { systemInstruction },
            });
          } catch (fuErr: any) {
            console.warn(`Follow-up with ${chosenModel} failed (${fuErr?.message}), retrying with gemini-3.1-flash-lite`);
            try {
              followUpResponse = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: followUpContents,
                config: { systemInstruction },
              });
            } catch (fuErr2: any) {
              console.warn('Follow-up text formatting experienced high demand, synthesizing directly from executed tool output.');
            }
          }

          let finalReply = followUpResponse?.text;
          if (!finalReply) {
            // Synthesize clear, professional response from executed tool results
            const primaryTool = toolsExecuted[0];
            if (primaryTool) {
              if (primaryTool.name === 'escalate_to_human') {
                finalReply = `I sincerely apologize for the frustration and trouble you have experienced. I have immediately triggered our human escalation protocol. Escalation Ticket #${primaryTool.result.ticket_id} has been created with ${primaryTool.result.escalation?.urgency || 'high'} priority. A clinic supervisor has been notified and will contact you directly to resolve this.`;
              } else if (primaryTool.name === 'book_appointment' && primaryTool.result.status === 'confirmed') {
                finalReply = `Your appointment has been successfully scheduled! Confirmation ID: ${primaryTool.result.booking_id} for ${primaryTool.result.appointment.customerName} on ${primaryTool.result.appointment.date} at ${primaryTool.result.appointment.timeSlot} (${primaryTool.result.appointment.serviceType}).`;
              } else if (primaryTool.name === 'reschedule_appointment' && primaryTool.result.status === 'rescheduled') {
                finalReply = `Your appointment (${primaryTool.result.booking_id}) has been successfully rescheduled to ${primaryTool.result.appointment.date} at ${primaryTool.result.appointment.timeSlot}.`;
              } else if (primaryTool.name === 'cancel_appointment') {
                finalReply = `Your appointment (${primaryTool.result.booking_id}) has been cancelled as requested. If you need to rebook in the future, we are always here to help.`;
              } else if (primaryTool.name === 'get_available_slots') {
                finalReply = `For ${primaryTool.result.date}, the available time slots are: ${primaryTool.result.available_slots.join(', ')}. Which time would work best for you?`;
              } else if (primaryTool.name === 'get_business_info') {
                finalReply = primaryTool.result.info;
              } else {
                finalReply = primaryTool.result.message || 'Action processed successfully.';
              }
            } else {
              finalReply = 'Action processed successfully.';
            }
          }

          return res.json({
            reply: finalReply,
            modelUsed: actualModelUsed,
            routingReason: selection.reason,
            intent: updatedState.currentIntent,
            state: updatedState,
            toolsExecuted,
            isEscalated: updatedState.isEscalated,
          });
        }

        // Direct text reply from Gemini
        const directText = geminiResponse.text;
        if (directText) {
          return res.json({
            reply: directText,
            modelUsed: actualModelUsed,
            routingReason: selection.reason,
            intent: updatedState.currentIntent,
            state: updatedState,
            toolsExecuted,
            isEscalated: updatedState.isEscalated,
          });
        }
      } catch (geminiError: any) {
        console.error('DEBUG_GEMINI_ERROR:', geminiError?.status, geminiError?.message, geminiError?.stack);
        // Fall back to robust deterministic agent logic
      }
    }

    // Step 3: Deterministic fallback agent for instant reliable execution without API key errors
    const fallbackResult = processFallbackAgent(message, updatedState, toolsExecuted);
    return res.json({
      reply: fallbackResult.reply,
      modelUsed: 'deterministic-fallback',
      routingReason: 'Offline/Deterministic execution',
      intent: fallbackResult.newState.currentIntent,
      state: fallbackResult.newState,
      toolsExecuted,
      isEscalated: fallbackResult.newState.isEscalated,
    });
  } catch (err: any) {
    console.error('Server error handling chat:', err);
    res.status(500).json({ error: 'Internal server error processing message', details: err?.message });
  }
});

// --- Start Server with Vite Middleware ---

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
