import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { PublicHoliday } from '../types/leave';
import { Palmtree, Plus, Trash2, CheckCircle2, X, Info } from 'lucide-react';

export const HolidaysCalendarPage: React.FC = () => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<PublicHoliday[]>('/holidays');
      setHolidays(res.data);
    } catch (err) {
      console.error('Failed to load holidays', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName) return;

    try {
      await api.post('/holidays', {
        date: newDate,
        name: newName,
        description: newDesc,
        is_national: true,
      });

      setIsModalOpen(false);
      setNewDate('');
      setNewName('');
      setNewDesc('');
      setNotification(`Public holiday '${newName}' added to calendar.`);
      setTimeout(() => setNotification(null), 3000);
      fetchHolidays();
    } catch (err) {
      alert('Failed to add holiday.');
    }
  };

  const handleDeleteHoliday = async (id: number, name: string) => {
    if (!window.confirm(`Delete holiday '${name}'?`)) return;

    try {
      await api.delete(`/holidays/${id}`);
      setNotification(`Holiday removed.`);
      setTimeout(() => setNotification(null), 3000);
      fetchHolidays();
    } catch (err) {
      alert('Failed to delete holiday.');
    }
  };

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Public Holidays Calendar</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Declared national and client-specific holidays governing operational schedules.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Public Holiday</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-subtle animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Operating Separation Callout */}
      <div className="p-4 rounded-2xl bg-[rgba(20,184,166,0.08)] border border-[#14B8A6]/25 text-xs text-[#CBD5E1] leading-relaxed flex items-start space-x-3">
        <Info className="w-5 h-5 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm mb-0.5 text-[#F8FAFC]">Operating Calendar Rule Separation:</span>
          Brands with <span className="font-semibold text-[#2DD4BF]">'365-Day Operations'</span> (e.g. GlowBotanics CS, UrbanKicks CS) require continuous coverage on holidays. Brands with <span className="font-semibold text-[#2DD4BF]">'Except Public Holidays'</span> observe these days as client non-working days.
        </div>
      </div>

      {/* Holidays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-[#94A3B8]">Loading holidays...</div>
        ) : holidays.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#94A3B8]">No holidays declared.</div>
        ) : (
          holidays.map((h) => (
            <div
              key={h.id}
              className="glass-card rounded-2xl border border-[rgba(148,163,184,0.16)] p-5 shadow-card hover:border-[#14B8A6]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-300 font-bold flex items-center justify-center border border-amber-500/40 flex-shrink-0">
                      <Palmtree className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#F8FAFC] text-base">{h.name}</h3>
                      <span className="text-xs text-[#94A3B8] font-mono">{h.date}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteHoliday(h.id, h.name)}
                    className="p-1.5 text-[#94A3B8] hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                    title="Remove Holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#94A3B8] mb-4">{h.description || 'Declared public holiday.'}</p>
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-medium text-[#2DD4BF] bg-[#080D12] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.16)]">
                  {h.brand_name || 'All Brands'}
                </span>
                <span className="text-[#64748B]">2026 Calendar</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-md w-full p-6 shadow-elevated animate-modal">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(148,163,184,0.16)] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">Add Declared Public Holiday</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHoliday} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Holiday Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Eid-ul-Fitr, Dussehra"
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Festival or official state holiday..."
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
