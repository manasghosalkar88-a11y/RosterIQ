import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Process } from '../types/management';
import { Plus, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const ProcessesPage: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Process[]>('/processes');
      setProcesses(res.data);
    } catch (err) {
      console.error('Failed to load processes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      setError('Please provide process code and name.');
      return;
    }

    try {
      await api.post('/processes', {
        code: newCode.toUpperCase(),
        name: newName,
        description: newDescription,
        is_active: true,
      });

      setIsAddModalOpen(false);
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setError(null);
      setSuccess(`Process '${newName}' added dynamically!`);
      setTimeout(() => setSuccess(null), 4000);
      fetchProcesses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create process.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Operational Processes</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Configure default and custom client operations (CS, ACC, Retention, NDR).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-medium text-sm shadow-md shadow-teal-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Process</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2.5 shadow-subtle">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid of Processes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-app-secondaryText">
            Loading operational processes...
          </div>
        ) : (
          processes.map((proc) => (
            <div
              key={proc.id}
              className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 font-bold text-lg flex items-center justify-center border border-teal-100">
                      {proc.code}
                    </div>
                    <div>
                      <h3 className="font-bold text-app-primaryText text-lg">{proc.name}</h3>
                      <span className="text-xs text-teal-600 font-medium">Standard D2C Service</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <p className="text-xs text-app-secondaryText leading-relaxed mb-4">
                  {proc.description || 'Enterprise operational process managed across client brands.'}
                </p>
              </div>

              <div className="pt-4 border-t border-app-border flex items-center justify-between text-xs text-app-secondaryText">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  CODE: {proc.code}
                </span>
                <span className="text-teal-600 font-medium">Configurable per Brand</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Custom Process Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-app-primaryText">Add Dynamic Operational Process</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateProcess} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Process Code * (e.g. QA, VIP)</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. VIP"
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Process Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. VIP Concierge Support"
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe operational workflows and deliverables..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-app-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-semibold"
                >
                  Create Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
