import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const AnswerBank = () => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');

  const fetchAnswers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/answer-bank');
      if (res.data.success) {
        setAnswers(res.data.answerBank || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!question || !answer) return;

    try {
      const res = await api.post('/settings/answer-bank', {
        question,
        answer,
        questionCategory: category,
      });

      if (res.data.success) {
        setMessage('New verified answer added to bank!');
        setQuestion('');
        setAnswer('');
        setShowAdd(false);
        await fetchAnswers();
      }
    } catch (err) {
      setMessage('Error saving answer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this answer?')) return;
    try {
      await api.delete(`/settings/answer-bank/${id}`);
      await fetchAnswers();
    } catch (e) {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Application Answer Bank</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reusable verified answers for standard recruiter questions. Reused across automated applications.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Answer</span>
        </button>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {showAdd && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Add Verified Answer</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Application Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why are you interested in our company?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="general">General</option>
                  <option value="personal_experience">Personal Experience</option>
                  <option value="technical">Technical</option>
                  <option value="availability">Availability & Notice</option>
                  <option value="salary">Salary Expectation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Approved Answer
              </label>
              <textarea
                rows={4}
                required
                placeholder="Enter your truthful, polished response..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Save Answer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Answer Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading answer bank...</div>
      ) : answers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Answer Bank is Empty</h3>
          <p className="text-xs text-slate-400 mt-1">
            As you answer pending questions or add them manually, they will appear here for automated reuse.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {answers.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {item.questionCategory.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.question}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                    {item.answer}
                  </p>

                  <p className="text-[10px] text-slate-400 pt-1">
                    Verified {new Date(item.approvedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(item._id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition"
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
  );
};

