import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  Send,
  FileText,
  Download,
  RotateCcw,
} from 'lucide-react';

export const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        if (res.data.success) {
          setJob(res.data.job);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleTailorResume = async () => {
    setTailoring(true);
    setMessage('Analyzing job description, extracting ATS keywords, and generating truth-preserving tailored resume...');

    try {
      const res = await api.post(`/resumes/tailor/${id}`);
      if (res.data.success) {
        setMessage('ATS-friendly resume successfully tailored with aligned keywords!');
        setJob((prev) => ({
          ...prev,
          tailoredResume: res.data.tailoredResume,
        }));
      }
    } catch (err) {
      setMessage('Tailoring failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setTailoring(false);
    }
  };

  const handlePrepareApplication = async () => {
    setPreparing(true);
    setMessage('Generating job-tailored resume with truth-preserving keyword alignment and preparing application answers...');

    try {
      const res = await api.post(`/applications/jobs/${id}/prepare`);
      if (res.data.success) {
        setMessage(res.data.message);
        // Refresh job details
        const refreshed = await api.get(`/jobs/${id}`);
        if (refreshed.data.success) {
          setJob(refreshed.data.job);
        }
      }
    } catch (err) {
      setMessage('Preparation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setPreparing(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading original job details...</div>;
  }

  if (!job) {
    return <div className="py-12 text-center text-xs text-slate-400">Job position not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Discover Jobs
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{job.title}</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {job.source}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location} ({job.workplaceType})
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Posted: {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Recent'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span>Original Application Link</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={handleTailorResume}
            disabled={tailoring}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-60"
            title="Generate or update ATS-friendly tailored resume for this job"
          >
            {tailoring ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                <span>Tailoring ATS Resume...</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>{job.tailoredResume ? 'Re-Tailor ATS Resume' : 'Tailor ATS Resume'}</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrepareApplication}
            disabled={preparing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{preparing ? 'Preparing Answers...' : 'Prepare & Apply'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {/* Main 2-Column Split: AI Match Evaluation vs Verbatim Original Job Description */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: ATS Tailored Resume & AI Evaluation */}
        <div className="space-y-6">
          {/* ATS Tailored Resume Card */}
          {job.tailoredResume ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">ATS-Tailored Resume</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    v{job.tailoredResume.version} ATS-Ready
                  </span>
                </div>
              </div>

              {job.tailoredResume.tailoringMetadata?.summaryStatement && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 leading-relaxed">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">Tailored Professional Summary:</span>
                  {job.tailoredResume.tailoringMetadata.summaryStatement}
                </div>
              )}

              {/* Aligned ATS Keywords */}
              {job.tailoredResume.tailoringMetadata?.alignedKeywords?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Aligned ATS Keywords ({job.tailoredResume.tailoringMetadata.alignedKeywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tailoredResume.tailoringMetadata.alignedKeywords.map((kw, kIdx) => (
                      <span
                        key={kIdx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlighted Skills */}
              {job.tailoredResume.tailoringMetadata?.highlightedSkills?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Highlighted Core Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tailoredResume.tailoringMetadata.highlightedSkills.map((sk, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Download PDF */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <a
                  href={
                    job.tailoredResume.fileUrl.startsWith('http')
                      ? job.tailoredResume.fileUrl
                      : `/uploads/tailored/${job.tailoredResume.fileUrl.split('/').pop()}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Tailored PDF</span>
                </a>
                <span className="text-[10px] text-slate-400">PDFKit • Truth-Preserved</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No ATS Resume Tailored Yet</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Click "Tailor ATS Resume" to generate an ATS-friendly resume aligned with {job.company}'s keywords.
              </p>
              <button
                onClick={handleTailorResume}
                disabled={tailoring}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              >
                <Sparkles className="h-3 w-3" />
                <span>Tailor Resume Now</span>
              </button>
            </div>
          )}

          {/* AI Match Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Evaluation</h2>
              </div>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {job.matchScore !== null ? `${job.matchScore}%` : 'Unscored'}
              </span>
            </div>

            {job.explanation && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                {job.explanation}
              </p>
            )}

            {/* Matching Skills */}
            {job.matchingSkills && job.matchingSkills.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Matching Skills ({job.matchingSkills.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.matchingSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Required Skills */}
            {job.missingSkills && job.missingSkills.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Potential Skill Gaps
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingSkills.map((gap, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium"
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {job.strengths && job.strengths.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Candidate Strengths
                </span>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {job.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Verbatim Untouched Original Job Description */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Original Job Description
              </h2>
              <p className="text-[11px] text-slate-400">
                Verbatim listing from {job.company}'s official job portal. Never rewritten or summarized.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              Source: {job.companyIdentifier}
            </span>
          </div>

          {/* Renders verbatim content. Greenhouse provides HTML, Lever provides text/HTML */}
          <div
            className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words space-y-4"
            dangerouslySetInnerHTML={{ __html: job.originalDescription }}
          />
        </div>
      </div>
    </div>
  );
};

