import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Activity,
  Play,
  Pause,
  StopCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const AgentActivity = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [latestRunStatus, setLatestRunStatus] = useState(null);
  const [message, setMessage] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [histRes, statusRes] = await Promise.all([
        api.get('/agent/history'),
        api.get('/agent/status'),
      ]);

      if (histRes.data.success) {
        setHistory(histRes.data.history || []);
      }
      if (statusRes.data.success) {
        setIsPaused(statusRes.data.settings?.pauseAll || false);
        setLatestRunStatus(statusRes.data.latestRun?.status || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTriggerRun = async () => {
    setRunning(true);
    setMessage('Initiating full autonomous cycle...');
    try {
      const res = await api.post('/agent/run');
      if (res.data.success) {
        setMessage('Job hunt cycle completed successfully!');
        await fetchHistory();
      }
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setRunning(false);
    }
  };

  const handleForceStop = async () => {
    try {
      setMessage('Stopping agent execution...');
      const res = await api.post('/agent/stop');
      if (res.data.success) {
        setMessage('Agent execution force stopped.');
        setRunning(false);
        await fetchHistory();
      }
    } catch (err) {
      setMessage('Error stopping agent: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleTogglePause = async () => {
    try {
      const endpoint = isPaused ? '/agent/resume' : '/agent/pause';
      const res = await api.post(endpoint);
      if (res.data.success) {
        setIsPaused(!isPaused);
        setMessage(res.data.message);
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agent Activity & Audit Logs</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time execution telemetry, duration metrics, and complete job processing provenance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Force Stop / Reset Button (Always visible) */}
          <button
            onClick={handleForceStop}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
              running || latestRunStatus === 'running'
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50'
            }`}
            title="Immediately force stop any active agent cycle or clear stuck locks"
          >
            <StopCircle className="h-4 w-4" />
            <span>{running || latestRunStatus === 'running' ? 'Force Stop' : 'Force Stop / Reset'}</span>
          </button>

          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              isPaused
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span>{isPaused ? 'Resume Agent' : 'Pause All Runs'}</span>
          </button>

          <button
            onClick={handleTriggerRun}
            disabled={running || isPaused}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
          >
            <RotateCcw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Running...' : 'Run Cycle Now'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {/* History Log List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading agent telemetry...</div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No agent runs recorded</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click "Run Cycle Now" or wait for scheduled execution at 8:00 AM IST.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((run) => (
            <div
              key={run._id}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      run.status === 'completed' ? 'bg-emerald-500' : run.status === 'running' ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Run #{String(run._id).slice(-6)} • {run.runType === 'manual' ? 'Manual Execution' : 'Scheduled GitHub Actions (8 AM IST)'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Started: {new Date(run.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Duration: {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'In Progress'}
                  </span>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {run.status}
                  </span>
                </div>
              </div>

              {/* Counter badges */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Discovered</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{run.summary?.discovered || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Matched</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{run.summary?.matched || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Prepared</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{run.summary?.prepared || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Submitted</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{run.summary?.submitted || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Pending</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{run.summary?.pending || 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-semibold">Failed</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{run.summary?.failed || 0}</span>
                </div>
              </div>

              {/* Error Summary if any */}
              {run.errorSummary && run.errorSummary.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1">
                    Encountered Issues ({run.errorSummary.length})
                  </span>
                  <ul className="text-[11px] text-rose-600 dark:text-rose-300 space-y-0.5 list-disc list-inside">
                    {run.errorSummary.map((err, errIdx) => (
                      <li key={errIdx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

