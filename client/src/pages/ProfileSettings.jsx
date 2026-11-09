import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  User,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const ProfileSettings = () => {
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [rolesText, setRolesText] = useState('');
  const [locationsText, setLocationsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        if (res.data.success) {
          setProfile(res.data.profile);
          setPreferences(res.data.preferences);
          setSkillsText((res.data.profile.skills?.technical || []).join(', '));
          setRolesText((res.data.preferences?.preferredRoles || []).join(', '));
          setLocationsText((res.data.preferences?.preferredLocations || []).join(', '));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update Profile
      await api.put('/profile', {
        personalDetails: profile.personalDetails,
        skills: {
          technical: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
        },
        summary: profile.summary,
      });

      // 2. Update Preferences
      await api.put('/profile/preferences', {
        preferredRoles: rolesText.split(',').map((r) => r.trim()).filter(Boolean),
        preferredLocations: locationsText.split(',').map((l) => l.trim()).filter(Boolean),
        customInstructions: preferences.customInstructions,
        exclusions: preferences.exclusions,
      });

      // 3. Mark verified
      await api.put('/profile/verify');

      setMessage('Profile and preferences updated and marked verified!');
    } catch (err) {
      setMessage('Error saving profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading profile data...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile & Preferences</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Edit your verified candidate profile, job preferences, and AI instructions.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Candidate Facts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile?.personalDetails?.fullName || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personalDetails: { ...profile.personalDetails, fullName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={profile?.personalDetails?.phone || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personalDetails: { ...profile.personalDetails, phone: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={profile?.personalDetails?.city || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personalDetails: { ...profile.personalDetails, city: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                LinkedIn URL
              </label>
              <input
                type="text"
                value={profile?.personalDetails?.linkedinUrl || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personalDetails: { ...profile.personalDetails, linkedinUrl: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Verified Technical Skills (Comma-separated)
            </label>
            <textarea
              rows={2}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Preferences & Prompt */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Job Search Preferences</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Roles (Comma-separated)
              </label>
              <input
                type="text"
                value={rolesText}
                onChange={(e) => setRolesText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Locations (Comma-separated)
              </label>
              <input
                type="text"
                value={locationsText}
                onChange={(e) => setLocationsText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Custom AI Instructions for Matcher & Tailor
              </label>
            </div>
            <textarea
              rows={3}
              value={preferences?.customInstructions || ''}
              onChange={(e) =>
                setPreferences({ ...preferences, customInstructions: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 text-xs text-slate-900 dark:text-white"
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
            <span>{saving ? 'Saving...' : 'Save & Verify Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

