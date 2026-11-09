import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const AutomationSettings = () => {
  const [settings, setSettings] = useState({
    automaticDiscoveryEnabled: true,
    automaticSubmissionEnabled: false,
    dailyApplicationLimit: 10,
    minimumMatchScore: 80,
    postingAgeLimit: 7,
    pauseAll: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings/automation');
        if (res.data.success) {
          setSettings(res.data.settings);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings/automation', settings);
      if (res.data.success) {
        setMessage('Automation settings saved and enforced immediately.');
      }
    } catch (err) {
      setMessage('Save error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Automation Rules & Limits</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure autonomous application thresholds, safety rails, and daily rate caps.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Toggles */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Global Controls</h2>

          {/* Automatic Submissions Opt-in */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Automatic Application Submissions
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                When enabled, applications meeting the minimum match score will be submitted autonomously using Playwright.
                (Sensitive declarations or CAPTCHA always redirect to Pending Actions).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, automaticSubmissionEnabled: !settings.automaticSubmissionEnabled })
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 shrink-0 ${
                settings.automaticSubmissionEnabled
                  ? 'bg-indigo-600 justify-end'
                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
            </button>
          </div>

          {/* Pause All */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Emergency Pause All Submissions
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Immediately suspends all scheduled and automatic background applications.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pauseAll}
              onChange={(e) => setSettings({ ...settings, pauseAll: e.target.checked })}
              className="h-4 w-4 rounded text-rose-600"
            />
          </div>
        </div>

        {/* Quantitative Limits */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Thresholds & Limits</h2>

          {/* Minimum Match Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Minimum Match Score for Auto-Apply
              </label>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60">
                {settings.minimumMatchScore}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={settings.minimumMatchScore}
              onChange={(e) => setSettings({ ...settings, minimumMatchScore: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default: 80%. Jobs scoring below this require manual review.</p>
          </div>

          {/* Daily Limit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Daily Application Limit
              </label>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60">
                {settings.dailyApplicationLimit} apps / day
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={settings.dailyApplicationLimit}
              onChange={(e) => setSettings({ ...settings, dailyApplicationLimit: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Default: 10/day. Atomic database guards prevent exceeding limit.</p>
          </div>

          {/* Posting Age Limit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Job Posting Age Window
              </label>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60">
                Last {settings.postingAgeLimit} days
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={settings.postingAgeLimit}
              onChange={(e) => setSettings({ ...settings, postingAgeLimit: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

