import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileCheck2,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Calendar,
  Building,
  Send,
} from 'lucide-react';

const statusTabs = [
  'ALL',
  'APPLIED',
  'READY_FOR_APPROVAL',
  'PENDING',
  'NEEDS_VERIFICATION',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
];

export const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
  const [newStatus, setNewStatus] = useState('INTERVIEW');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'ALL' ? '/applications' : `/applications?status=${activeTab}`;
      const res = await api.get(url);
      if (res.data.success) {
        setApplications(res.data.applications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  const handleQuickMarkApplied = async (appId) => {
    try {
      const res = await api.patch(`/applications/${appId}/status`, {
        status: 'APPLIED',
        notes: 'Approved and confirmed by candidate',
        reason: 'User approved and verified application submission',
      });
      if (res.data.success) {
        setMessage('🎉 Application confirmed! Successfully moved to the APPLIED section.');
        setActiveTab('APPLIED');
        await fetchApplications();
      }
    } catch (err) {
      setMessage('Error updating status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAutomatedSubmit = async (appId) => {
    setSubmittingId(appId);
    setMessage('Launching Playwright browser automation to fill and submit application...');
    try {
      const res = await api.post(`/applications/${appId}/submit`);
      if (res.data.success) {
        setMessage(res.data.message || 'Application submitted successfully via portal!');
        if (res.data.status === 'APPLIED') {
          setActiveTab('APPLIED');
        }
        await fetchApplications();
      }
    } catch (err) {
      setMessage('Automated submission note: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setUpdating(true);
    try {
      const res = await api.patch(`/applications/${selectedApp._id}/status`, {
        status: newStatus,
        notes: statusNotes,
        reason: statusNotes || `Candidate updated status to ${newStatus}`,
      });

      if (res.data.success) {
        setMessage(`Status updated to ${newStatus}. Recorded as user-verified event.`);
        setSelectedApp(null);
        setStatusNotes('');
        await fetchApplications();
      }
    } catch (err) {
      setMessage('Update error: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'INTERVIEW':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'OFFER':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'NEEDS_VERIFICATION':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Application Tracker</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Complete audit trail of submitted, pending, and scheduled applications with verified provenance.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Applications Table / Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading application history...</div>
      ) : applications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No applications in this category</h3>
          <p className="text-xs text-slate-400 mt-1">
            Applications will appear here automatically when prepared or submitted by JobPilot AI.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {app.jobId?.title || 'Position'}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusColor(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Method: {app.submissionMethod || 'Automatic'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    {app.jobId?.company || 'Company'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {app.submissionTimestamp
                      ? `Applied: ${new Date(app.submissionTimestamp).toLocaleDateString()}`
                      : `Prepared: ${new Date(app.createdAt).toLocaleDateString()}`}
                  </span>
                  {app.confirmationDetails?.verifiedBy && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Verified: {app.confirmationDetails.verifiedBy}
                    </span>
                  )}
                </div>

                {app.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1">
                    Notes: {app.notes}
                  </p>
                )}

                {app.statusHistory && app.statusHistory.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Agent note:</span>{' '}
                    {app.statusHistory[app.statusHistory.length - 1].reason}
                  </p>
                )}

                {app.status === 'NEEDS_VERIFICATION' && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Next Step: Employer Portal Requires Human Submission (Custom Questions / CAPTCHA)</span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      The agent matched your profile and prepared your tailored ATS resume. This portal requires answering custom employer questions or completing a CAPTCHA.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {app.jobId?.applicationUrl && (
                        <a
                          href={app.jobId.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition shadow-xs"
                        >
                          <span>1. Open Portal to Submit</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleQuickMarkApplied(app._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs"
                        title="Click once you submit on the employer website to record as APPLIED"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>2. I've Submitted → Move to Applied Section</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {['READY_FOR_APPROVAL', 'PREPARING', 'PENDING', 'NEEDS_VERIFICATION', 'FAILED'].includes(app.status) && (
                  <>
                    {/* Real Browser Automation Submission via Playwright */}
                    <button
                      onClick={() => handleAutomatedSubmit(app._id)}
                      disabled={submittingId === app._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-60"
                      title="Playwright browser launches, fills the application form, uploads tailored resume, and clicks submit on the company portal"
                    >
                      {submittingId === app._id ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                          <span>Submitting via Browser...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Approve & Submit with Agent</span>
                        </>
                      )}
                    </button>

                    {/* Quick Move to Applied */}
                    <button
                      onClick={() => handleQuickMarkApplied(app._id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-xs font-semibold transition"
                      title="If you submitted the form directly in your browser, click here to move it to the APPLIED section"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Move to Applied</span>
                    </button>
                  </>
                )}

                {app.jobId?.applicationUrl && (
                  <a
                    href={app.jobId.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    title="Open the official job portal application page in a new tab"
                  >
                    <span>Open Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  onClick={() => {
                    setSelectedApp(app);
                    setNewStatus(app.status === 'APPLIED' ? 'INTERVIEW' : 'APPLIED');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Status Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              Update Application Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {selectedApp.jobId?.company} — {selectedApp.jobId?.title}
            </p>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="APPLIED">Applied (Manual Confirmation)</option>
                  <option value="INTERVIEW">Interview Scheduled / Round</option>
                  <option value="OFFER">Job Offer Received 🎉</option>
                  <option value="REJECTED">Application Rejected</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Technical interview scheduled for Friday at 3 PM..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  {updating ? 'Saving...' : 'Save Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

