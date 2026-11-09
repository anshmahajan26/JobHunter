import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Compass,
  FileCheck2,
  AlertCircle,
  TrendingUp,
  Play,
  RotateCcw,
  StopCircle,
  CheckCircle,
  ExternalLink,
  Sliders,
  Sparkles,
  Award,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({
    discovered: 0,
    matched: 0,
    submitted: 0,
    pending: 0,
    interviews: 0,
    rejections: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState('');

  const loadDashboardData = async () => {
    try {
      const [jobsRes, appsRes, pendingRes, statusRes, reportsRes, settingsRes] = await Promise.all([
        api.get('/jobs?limit=5'),
        api.get('/applications?limit=50'),
        api.get('/pending-actions?status=pending'),
        api.get('/agent/status'),
        api.get('/reports?limit=3'),
        api.get('/settings/automation'),
      ]);

      if (jobsRes.data.success) {
        setRecentJobs(jobsRes.data.jobs || []);
      }

      if (pendingRes.data.success) {
        setPendingActions(pendingRes.data.pendingActions || []);
      }

      if (statusRes.data.success) {
        setAgentStatus(statusRes.data.latestRun);
        setQuotaExceeded(statusRes.data.quotaExceeded || false);
      }

      if (reportsRes.data.success) {
        setRecentReports(reportsRes.data.reports || []);
      }

      if (settingsRes.data.success) {
        setSettings(settingsRes.data.settings);
      }

      if (appsRes.data.success) {
        const apps = appsRes.data.applications || [];
        setApplications(apps);
        const submitted = apps.filter((a) => a.status === 'APPLIED').length;
        const interviews = apps.filter((a) => a.status === 'INTERVIEW').length;
        const rejections = apps.filter((a) => a.status === 'REJECTED').length;

        setStats({
          discovered: jobsRes.data.pagination?.total || 0,
          matched: apps.length,
          submitted,
          pending: pendingRes.data.pendingActions?.length || 0,
          interviews,
          rejections,
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleStartJobHunt = async () => {
    setRunningAgent(true);
    setMessage('Autonomous JobPilot Agent activated. Discovering jobs, evaluating matches & preparing applications...');

    try {
      const res = await api.post('/agent/run');
      if (res.data.success) {
        setMessage('Job hunt cycle completed successfully!');
        await loadDashboardData();
      }
    } catch (err) {
      setMessage('Execution alert: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunningAgent(false);
    }
  };

  const handleForceStop = async () => {
    try {
      setMessage('Stopping job hunt cycle...');
      const res = await api.post('/agent/stop');
      if (res.data.success) {
        setMessage('Job hunt cycle stopped. Ready to start a new cycle.');
        setRunningAgent(false);
        await loadDashboardData();
      }
    } catch (err) {
      setMessage('Error stopping agent: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleAutoSubmit = async () => {
    if (!settings) return;
    const newVal = !settings.automaticSubmissionEnabled;
    try {
      const res = await api.put('/settings/automation', {
        automaticSubmissionEnabled: newVal,
      });
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (e) {}
  };

  // Real-time 7-day progression data ending at Today (zero future days)
  const weeklyData = useMemo(() => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const label = i === 0 ? 'Today' : `${dayNames[d.getDay()]} ${d.getDate()}`;

      const dayApps = applications.filter((app) => {
        const appDate = new Date(app.submissionTimestamp || app.createdAt);
        return appDate >= d && appDate < nextD;
      });

      const appliedCount = dayApps.filter((a) => a.status === 'APPLIED').length;

      days.push({
        day: label,
        applications: appliedCount,
        total: dayApps.length,
      });
    }

    return days;
  }, [applications]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Hello, {user?.name || 'Candidate'} 👋
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              Agent Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Scheduled execution every day at 8:00 AM IST
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Automatic Application Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Auto-Apply
            </span>
            <button
              onClick={handleToggleAutoSubmit}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                settings?.automaticSubmissionEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
            </button>
          </div>

          {/* Force Stop / Reset Button (Always visible for immediate control) */}
          <button
            onClick={handleForceStop}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition ${
              runningAgent || agentStatus?.status === 'running'
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/30'
                : 'border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50'
            }`}
            title="Immediately force stop any active agent cycle or clear stuck locks"
          >
            <StopCircle className="h-4 w-4" />
            <span>{runningAgent || agentStatus?.status === 'running' ? 'Force Stop Agent' : 'Force Stop / Reset'}</span>
          </button>

          {/* Start Job Hunt Button */}
          <button
            onClick={handleStartJobHunt}
            disabled={runningAgent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
          >
            {runningAgent ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Running Agent...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Start Job Hunt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* AI Token Quota Exhausted Alert */}
      {quotaExceeded && (
        <div className="p-4 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Gemini AI Tokens: 0 Remaining Today (Daily Free Tier Limit Reached)
            </h4>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Google's Free Tier has reached its 20 requests/day cap. The agent completed your job-hunt cycle using our <strong>built-in deterministic skill matching engine</strong> (so your jobs are still ranked and tailored!). To unlock unlimited AI scoring, you can recharge your plan at{' '}
              <a
                href="https://ai.google.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold hover:text-amber-950 dark:hover:text-amber-100"
              >
                Google AI Studio (ai.google.dev)
              </a>{' '}
              or switch your API key in <code>server/.env</code>.
            </p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Jobs Discovered', val: stats.discovered, icon: Compass, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Jobs Matched', val: stats.matched, icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Submitted', val: stats.submitted, icon: FileCheck2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Pending Action', val: stats.pending, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Interviews', val: stats.interviews, icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
          { label: 'Rejections', val: stats.rejections, icon: RotateCcw, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <div className={`p-1.5 rounded-lg ${item.bg}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.val}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Weekly Chart & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Application Progression
              </h2>
              <p className="text-xs text-slate-400">Past 7 days real-time activity up to Today</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
              Daily Limit: {settings?.dailyApplicationLimit || 10}/day
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value) => [`${value} applied`, 'Applications']}
                />
                <Bar dataKey="applications" name="Applied Applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestones & Progress */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Application Milestones</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Track consistency toward your dream offer.
            </p>

            <div className="space-y-4">
              {[
                { target: 10, label: 'First 10 Applications' },
                { target: 50, label: 'Active Hunter (50 Applications)' },
                { target: 100, label: 'Century Club (100 Applications)' },
              ].map((m, i) => {
                const completed = stats.submitted >= m.target;
                const percent = Math.min(100, Math.round((stats.submitted / m.target) * 100));
                return (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className={completed ? 'text-emerald-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                        {m.label}
                      </span>
                      <span className="text-slate-400">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${completed ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/reports"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between"
            >
              <span>View Generated Excel Reports</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Matching Jobs & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Discovered Jobs */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Matching Opportunities
            </h2>
            <Link to="/jobs" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All Jobs
            </Link>
          </div>

          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No jobs discovered yet. Click "Start Job Hunt".</p>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job._id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {job.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {job.company} • {job.location} ({job.source})
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {job.matchScore !== null && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                        {job.matchScore}% Match
                      </span>
                    )}
                    <Link
                      to={`/jobs/${job._id}`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Inspect Original Description"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pending Actions ({pendingActions.length})
              </h2>
            </div>
            <Link to="/pending-actions" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Resolve All
            </Link>
          </div>

          <div className="space-y-3">
            {pendingActions.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Zero pending actions! All applications moving autonomously.
                </p>
              </div>
            ) : (
              pendingActions.slice(0, 4).map((action) => (
                <div
                  key={action._id}
                  className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                      {action.reason.replace('_', ' ')}
                    </span>
                    <Link
                      to="/pending-actions"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Action Required →
                    </Link>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {action.jobId?.company}: {action.jobId?.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {action.requiredAction}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

