import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  Filter,
  Bookmark,
  ExternalLink,
  Sparkles,
  MapPin,
  Building,
  Briefcase,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [search, setSearch] = useState('');
  const [workplaceType, setWorkplaceType] = useState('');
  const [source, setSource] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [message, setMessage] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (workplaceType) params.append('workplaceType', workplaceType);
      if (source) params.append('source', source);
      if (savedOnly) params.append('savedOnly', 'true');
      if (minScore > 0) params.append('minScore', minScore);

      const res = await api.get(`/jobs?${params.toString()}`);
      if (res.data.success) {
        setJobs(res.data.jobs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [workplaceType, source, savedOnly, minScore]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleTriggerDiscovery = async () => {
    setDiscovering(true);
    setMessage('Connecting to Greenhouse & Lever public feeds to fetch fresh job postings...');
    try {
      const res = await api.post('/jobs/discover');
      if (res.data.success) {
        setMessage(res.data.message);
        await fetchJobs();
      }
    } catch (err) {
      setMessage('Discovery failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDiscovering(false);
    }
  };

  const handleToggleSave = async (jobId) => {
    try {
      const res = await api.post(`/jobs/${jobId}/save`);
      if (res.data.success) {
        setJobs((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, isSaved: res.data.isSaved } : j))
        );
      }
    } catch (e) {}
  };

  const handleDismiss = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/dismiss`);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (e) {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discover Jobs</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real jobs directly from Greenhouse & Lever public feeds with verbatim descriptions.
          </p>
        </div>

        <button
          onClick={handleTriggerDiscovery}
          disabled={discovering}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
          <span>{discovering ? 'Fetching Feeds...' : 'Sync Live Feeds'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, company, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <select
            value={workplaceType}
            onChange={(e) => setWorkplaceType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
          >
            <option value="">All Workplace Types</option>
            <option value="remote">Remote Only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
          >
            <option value="">All Platforms</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>

          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
          >
            <option value={0}>Any Match Score</option>
            <option value={80}>≥ 80% (Eligible for Auto-Apply)</option>
            <option value={70}>≥ 70% (Strong Match)</option>
            <option value={50}>≥ 50% (Moderate Match)</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 font-medium">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => setSavedOnly(e.target.checked)}
              className="rounded text-indigo-600"
            />
            Saved Only
          </label>
        </div>
      </div>

      {/* Jobs Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading verified job listings...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No jobs match this criteria</h3>
          <p className="text-xs text-slate-400 mt-1">Try syncing live feeds or loosening filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isEligible = (job.matchScore || 0) >= 80;
            return (
              <div
                key={job._id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {job.title}
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {job.source}
                      </span>
                      {job.workplaceType && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {job.workplaceType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span>
                        Posted: {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Match Score Badge & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {job.matchScore !== null ? (
                      <div className="text-right">
                        <span
                          className={`text-sm font-extrabold px-3 py-1 rounded-xl border ${
                            isEligible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800'
                          }`}
                        >
                          {job.matchScore}% Match
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Unscored</span>
                    )}

                    <button
                      onClick={() => handleToggleSave(job._id)}
                      className={`p-2 rounded-xl border transition ${
                        job.isSaved
                          ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/50'
                          : 'border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-800'
                      }`}
                      title="Save Job"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDismiss(job._id)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 dark:border-slate-800 transition"
                      title="Dismiss Job"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Matching Skills Pill Preview */}
                {job.matchingSkills && job.matchingSkills.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-400">Matching Skills:</span>
                    {job.matchingSkills.slice(0, 5).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Footer Links */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Application Status:{' '}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {job.applicationStatus || 'NOT_APPLIED'}
                    </span>
                  </span>

                  <div className="flex items-center gap-3">
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition"
                    >
                      <span>Open Original Posting</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <Link
                      to={`/jobs/${job._id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                    >
                      View Details & Tailor
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

