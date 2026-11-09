import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  AlertCircle,
  ExternalLink,
  Send,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const PendingActions = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [draftResponse, setDraftResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pending-actions?status=pending');
      if (res.data.success) {
        setActions(res.data.pendingActions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAction || !draftResponse.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/pending-actions/${selectedAction._id}/answer`, {
        responseText: draftResponse.trim(),
      });

      if (res.data.success) {
        setMessage('Your genuine experience was polished and saved to your reusable Answer Bank!');
        setSelectedAction(null);
        setDraftResponse('');
        await fetchActions();
      }
    } catch (err) {
      setMessage('Submission error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkApplied = async (actionId) => {
    try {
      const res = await api.post(`/pending-actions/${actionId}/mark-applied`);
      if (res.data.success) {
        setMessage('Application recorded as applied by candidate.');
        await fetchActions();
      }
    } catch (err) {
      setMessage('Error marking as applied');
    }
  };

  const handleDismiss = async (actionId) => {
    try {
      await api.post(`/pending-actions/${actionId}/dismiss`);
      await fetchActions();
    } catch (err) {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pending Actions</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Items requiring human input: CAPTCHA challenges, OTP, or authentic personal experience questions.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading pending items...</div>
      ) : actions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">All Clear!</h3>
          <p className="text-xs text-slate-400 mt-1">
            No pending human actions. The agent has all required answers and profiles.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      {item.reason.replace('_', ' ')}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.jobId?.company}: {item.jobId?.title}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {item.requiredAction}
                  </p>

                  {item.question && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                        Exact Question:
                      </p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 italic">
                        "{item.question}"
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Created: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <a
                    href={item.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
                  >
                    <span>Open Application Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {item.question && (
                    <button
                      onClick={() => {
                        setSelectedAction(item);
                        setDraftResponse('');
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Provide Experience</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleMarkApplied(item._id)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs font-semibold transition"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>I Applied Manually</span>
                  </button>

                  <button
                    onClick={() => handleDismiss(item._id)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 text-xs transition"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Answer Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Enter Your Authentic Experience
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              We strictly never fabricate personal stories. Enter your genuine thoughts; Gemini AI will polish the phrasing without altering any factual claims.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Question:</p>
              <p className="text-xs text-slate-800 dark:text-slate-200 italic mt-0.5">
                "{selectedAction.question}"
              </p>
            </div>

            <form onSubmit={handleAnswerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Genuine Experience / Outline
                </label>
                <textarea
                  rows={4}
                  required
                  value={draftResponse}
                  onChange={(e) => setDraftResponse(e.target.value)}
                  placeholder="In my previous project, we faced a major race condition bug during checkout..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {submitting ? 'Polishing & Saving...' : 'Polish & Save Answer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

