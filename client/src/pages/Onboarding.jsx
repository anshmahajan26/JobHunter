import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  User,
  GraduationCap,
  Briefcase,
  Sliders,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Personal Details
  const [personal, setPersonal] = useState({
    fullName: '',
    phone: '',
    city: '',
    state: '',
    country: 'India',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });

  // Education
  const [education, setEducation] = useState({
    degree: 'B.Tech Computer Science',
    fieldOfStudy: 'Computer Science',
    institution: '',
    graduationYear: '2024',
    cgpaOrPercentage: '8.2',
  });

  // Experience
  const [experienceType, setExperienceType] = useState('fresher');
  const [experience, setExperience] = useState({
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    responsibilities: '',
  });

  // Skills
  const [skills, setSkills] = useState('JavaScript, React, Node.js, Express, MongoDB, Tailwind CSS, Git');

  // Preferences & Custom AI Instructions
  const [preferences, setPreferences] = useState({
    preferredRoles: 'Full Stack Developer, React Developer, MERN Stack Developer, Software Engineer',
    preferredLocations: 'Bengaluru, Pune, Mumbai, Hyderabad, Remote',
    workplaceTypes: ['remote', 'hybrid'],
    minimumSalary: 600000,
    noticePeriodDays: 0,
    exclusions: {
      unpaidInternships: true,
      bondJobs: true,
      companies: '',
    },
    customInstructions:
      'I am looking for a MERN Stack Developer or React Developer role. Prefer Pune, Mumbai, Bengaluru or remote opportunities. Prioritize companies offering good learning opportunities. Avoid unpaid internships and jobs requiring extensive experience.',
  });

  // Resume file
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadedResume, setUploadedResume] = useState(null);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFile(file);

    const formData = new FormData();
    formData.append('resume', file);

    setLoading(true);
    setMessage('Uploading resume and parsing data with Gemini AI...');

    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setUploadedResume(res.data.resume);
        const ext = res.data.extractedData;
        if (ext) {
          if (ext.personalDetails) {
            setPersonal((p) => ({
              ...p,
              fullName: ext.personalDetails.fullName || p.fullName,
              phone: ext.personalDetails.phone || p.phone,
              city: ext.personalDetails.city || p.city,
              linkedinUrl: ext.personalDetails.linkedinUrl || p.linkedinUrl,
              githubUrl: ext.personalDetails.githubUrl || p.githubUrl,
            }));
          }
          if (ext.skills?.technical) {
            setSkills(ext.skills.technical.join(', '));
          }
        }
        setMessage('Resume parsed! Extracted details pre-filled for your verification.');
      }
    } catch (err) {
      setMessage('Upload error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Update Profile
      await api.put('/profile', {
        personalDetails: personal,
        education: [education],
        experienceType,
        experience: experience.company
          ? [
              {
                company: experience.company,
                title: experience.title,
                startDate: experience.startDate,
                endDate: experience.endDate,
                responsibilities: experience.responsibilities.split('\n').filter(Boolean),
                isVerified: true,
              },
            ]
          : [],
        skills: {
          technical: skills.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });

      // 2. Mark verified
      await api.put('/profile/verify');

      // 3. Update Preferences
      await api.put('/profile/preferences', {
        preferredRoles: preferences.preferredRoles.split(',').map((r) => r.trim()).filter(Boolean),
        preferredLocations: preferences.preferredLocations.split(',').map((l) => l.trim()).filter(Boolean),
        workplaceTypes: preferences.workplaceTypes,
        salaryPreference: {
          minimumSalary: Number(preferences.minimumSalary) || 0,
          currency: 'INR',
        },
        noticePeriodDays: Number(preferences.noticePeriodDays) || 0,
        exclusions: {
          unpaidInternships: preferences.exclusions.unpaidInternships,
          bondJobs: preferences.exclusions.bondJobs,
          companies: preferences.exclusions.companies.split(',').map((c) => c.trim()).filter(Boolean),
        },
        customInstructions: preferences.customInstructions,
      });

      navigate('/dashboard');
    } catch (err) {
      setMessage('Failed to save profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Resume' },
              { num: 2, label: 'Personal & Skills' },
              { num: 3, label: 'AI Instructions' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    step >= s.num
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    step >= s.num ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900">
            {message}
          </div>
        )}

        {/* Step 1: Resume Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upload Your Resume</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload your original resume in PDF or DOCX format. Gemini AI will parse your credentials.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-500 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/30">
              <Upload className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-3" />
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                {resumeFile ? resumeFile.name : 'Click or drag your resume file here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {uploadedResume && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Resume successfully parsed!
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Original file saved securely. Facts extracted for your review.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 transition"
              >
                Continue to Profile <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Personal Details & Skills */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Profile Information</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Review and correct extracted details. We strictly use verified information only.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={personal.fullName}
                  onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={personal.phone}
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={personal.city}
                  onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  value={personal.linkedinUrl}
                  onChange={(e) => setPersonal({ ...personal, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GitHub URL
                </label>
                <input
                  type="text"
                  value={personal.githubUrl}
                  onChange={(e) => setPersonal({ ...personal, githubUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Experience Level
                </label>
                <select
                  value={experienceType}
                  onChange={(e) => setExperienceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="fresher">Fresher / Entry Level</option>
                  <option value="experienced">Experienced Professional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verified Technical Skills (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 transition"
              >
                Configure Preferences <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preferences & Custom AI Instructions */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Agent Instructions & Rules</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tell your autonomous agent what to search, match, and exclude.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Job Roles (Comma-separated)
              </label>
              <input
                type="text"
                value={preferences.preferredRoles}
                onChange={(e) => setPreferences({ ...preferences, preferredRoles: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Locations (Comma-separated)
              </label>
              <input
                type="text"
                value={preferences.preferredLocations}
                onChange={(e) => setPreferences({ ...preferences, preferredLocations: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            {/* Custom AI Instructions Textarea */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Custom AI Agent Prompt Instructions
                </label>
              </div>
              <textarea
                rows={4}
                value={preferences.customInstructions}
                onChange={(e) => setPreferences({ ...preferences, customInstructions: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Tell your AI agent what you want from a job and how you want it to search and apply..."
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Exclusion Preferences
              </span>
              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={preferences.exclusions.unpaidInternships}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        exclusions: { ...preferences.exclusions, unpaidInternships: e.target.checked },
                      })
                    }
                    className="rounded text-indigo-600"
                  />
                  Exclude Unpaid Roles
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={preferences.exclusions.bondJobs}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        exclusions: { ...preferences.exclusions, bondJobs: e.target.checked },
                      })
                    }
                    className="rounded text-indigo-600"
                  />
                  Exclude Bond-Based Jobs
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleComplete}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
              >
                {loading ? 'Initializing Agent...' : 'Finish & Go to Dashboard'}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

