import React, { useState } from 'react';
import { 
  CalendarDays, 
  CalendarClock, 
  XCircle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Phone,
  User,
  Clock,
  Tag,
  FileText
} from 'lucide-react';
import { Appointment } from '../types';

interface AppointmentsListProps {
  appointments: Appointment[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  appointments,
  isLoading,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'rescheduled' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAppointments = appointments.filter((apt) => {
    if (filter !== 'all' && apt.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        apt.customerName.toLowerCase().includes(q) ||
        apt.id.toLowerCase().includes(q) ||
        apt.serviceType.toLowerCase().includes(q) ||
        apt.contact.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
          </span>
        );
      case 'rescheduled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
            <CalendarClock className="w-3 h-3 text-blue-600" /> Rescheduled
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 line-through">
            <XCircle className="w-3 h-3 text-slate-400" /> Cancelled
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs flex flex-col h-full overflow-hidden">
      {/* Roster Header */}
      <div className="p-3.5 border-b border-[#E5E7EB] bg-[#FAFBFB] flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Live Clinical Schedule &amp; Bookings
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-200/80 text-slate-700">
              {appointments.length} records
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Real-time calendar ledger updated dynamically by autonomous scheduling tools.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh appointments"
          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-2.5 border-b border-[#E5E7EB] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#0F3830] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('confirmed')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'confirmed'
                ? 'bg-emerald-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Confirmed
          </button>
          <button
            type="button"
            onClick={() => setFilter('rescheduled')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'rescheduled'
                ? 'bg-blue-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rescheduled
          </button>
          <button
            type="button"
            onClick={() => setFilter('cancelled')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filter === 'cancelled'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cancelled
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID..."
            className="pl-7 pr-2.5 py-1 rounded border border-slate-200 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F3830] w-36 sm:w-44"
          />
        </div>
      </div>

      {/* Appointment Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-10 px-4">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">No appointments matching criteria</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ask the agent to book a new appointment or reset the demo database.
            </p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className={`p-3 rounded border transition-colors ${
                apt.status === 'cancelled'
                  ? 'bg-slate-50/70 border-slate-200 opacity-65'
                  : apt.status === 'rescheduled'
                  ? 'bg-white border-blue-200 hover:border-blue-300'
                  : 'bg-white border-[#E5E7EB] hover:border-slate-300'
              }`}
            >
              {/* Header Row: ID, Patient Name, Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center font-code shrink-0">
                    {getInitials(apt.customerName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-code text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {apt.id}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {apt.customerName}
                      </span>
                    </div>
                  </div>
                </div>

                {getStatusBadge(apt.status)}
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] text-slate-600 bg-slate-50/60 p-2 rounded border border-slate-100 mb-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{apt.serviceType}</span>
                </div>
                <div className="flex items-center gap-1.5 font-code text-slate-700">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{apt.contact}</span>
                </div>
                <div className="flex items-center gap-1.5 font-code text-slate-700">
                  <CalendarDays className="w-3 h-3 text-[#0F3830] shrink-0" />
                  <span className="font-semibold text-slate-900">{apt.date}</span>
                </div>
                <div className="flex items-center gap-1.5 font-code text-slate-700">
                  <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="font-semibold text-slate-900">{apt.timeSlot}</span>
                </div>
              </div>

              {/* Optional Notes */}
              {apt.notes && (
                <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-white px-2 py-1 rounded border border-slate-200/80">
                  <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span className="italic">{apt.notes}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
