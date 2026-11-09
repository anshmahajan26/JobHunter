import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileText,
  Upload,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const ResumeManager = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resumes');
      if (res.data.success) {
        setResumes(res.data.resumes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setMessage('Uploading resume and running structured AI extraction...');

    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMessage('Resume uploaded successfully and parsed into verified profile data.');
        await fetchResumes();
      }
    } catch (err) {
      setMessage('Upload error: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      await fetchResumes();
    } catch (e) {}
  };

  const handleReparse = async (id) => {
    setMessage('Re-running structured AI extraction with Gemini...');
    try {
      const res = await api.post(`/resumes/${id}/parse`);
      if (res.data.success) {
        setMessage('Resume re-parsed successfully.');
        await fetchResumes();
      }
    } catch (err) {
      setMessage('Reparse error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resume Manager</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Original resumes, version history, and verified extraction provenance. Never altered directly.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center relative hover:border-indigo-500 transition cursor-pointer">
        <Upload className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-2" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          {uploading ? 'Processing Resume...' : 'Upload New Resume Version'}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Supports PDF, DOC, DOCX up to 10MB</p>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {/* Resumes List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Uploaded Resumes</h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No resumes uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <div
                key={r._id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {r.fileName}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        v{r.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploaded {new Date(r.createdAt).toLocaleString()} • Status: {r.parsedStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={r.originalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                    title="Download Original"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() => handleReparse(r._id)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition"
                    title="Re-Parse with AI"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(r._id)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

