import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileSpreadsheet,
  Download,
  Mail,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      if (res.data.success) {
        setReports(res.data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRetryEmail = async (reportId) => {
    setRetryingId(reportId);
    setMessage('Retrying email delivery with Nodemailer...');
    try {
      const res = await api.post(`/reports/${reportId}/retry-email`);
      if (res.data.success) {
        setMessage('Report emailed successfully!');
        await fetchReports();
      }
    } catch (err) {
      setMessage('Email error: ' + (err.response?.data?.message || err.message));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Excel Run Reports</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          5-sheet comprehensive workbooks generated after every run. Stored securely and dispatched via email.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Reports Generated Yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Reports will be generated automatically following each manual or scheduled agent run.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r._id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Run Report — {new Date(r.createdAt).toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                    <span>Discovered: {r.summary?.discovered || 0}</span>
                    <span>•</span>
                    <span>Matched: {r.summary?.matched || 0}</span>
                    <span>•</span>
                    <span>Submitted: {r.summary?.submitted || 0}</span>
                    <span>•</span>
                    <span>Pending: {r.summary?.pending || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    r.status === 'emailed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : r.status === 'email_failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {r.status.replace('_', ' ').toUpperCase()}
                </span>

                <button
                  onClick={() => handleRetryEmail(r._id)}
                  disabled={retryingId === r._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
                  title="Resend email summary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{retryingId === r._id ? 'Sending...' : 'Email'}</span>
                </button>

                <a
                  href={r.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Excel</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

