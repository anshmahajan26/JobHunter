import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldAlert,
  Users,
  Compass,
  Cpu,
  Plus,
  RefreshCw,
  Power,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [aiUsage, setAiUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // Add board form state
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardPlatform, setNewBoardPlatform] = useState('greenhouse');
  const [newBoardToken, setNewBoardToken] = useState('');
  const [message, setMessage] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, boardsRes, usageRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/boards'),
        api.get('/admin/ai-usage'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (usersRes.data.success) setUsers(usersRes.data.users || []);
      if (boardsRes.data.success) setBoards(boardsRes.data.boards || []);
      if (usageRes.data.success) setAiUsage(usageRes.data.usage || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/status`);
      if (res.data.success) {
        setMessage(res.data.message);
        await fetchAdminData();
      }
    } catch (e) {}
  };

  const handleToggleBoard = async (boardId) => {
    try {
      const res = await api.patch(`/admin/boards/${boardId}/toggle`);
      if (res.data.success) {
        setMessage(res.data.message);
        await fetchAdminData();
      }
    } catch (e) {}
  };

  const handleCheckBoardHealth = async (boardId) => {
    setMessage('Checking live feed API response...');
    try {
      const res = await api.get(`/admin/boards/${boardId}/health`);
      if (res.data.success) {
        setMessage(`Health check: ${res.data.health?.healthy ? 'HEALTHY (200 OK)' : 'UNREACHABLE'}`);
      }
    } catch (e) {
      setMessage('Health check error');
    }
  };

  const handleAddBoard = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/boards', {
        name: newBoardName,
        platform: newBoardPlatform,
        boardIdentifier: newBoardToken,
      });

      if (res.data.success) {
        setMessage(`Board '${newBoardName}' added successfully.`);
        setNewBoardName('');
        setNewBoardToken('');
        await fetchAdminData();
      }
    } catch (err) {
      setMessage('Error adding board');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading admin telemetry...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin System Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-tenant control, Greenhouse/Lever company board identifiers, and Gemini token analytics.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Users</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats?.totalUsers || 0}</p>
          <span className="text-[10px] text-emerald-500 font-semibold">{stats?.activeUsers || 0} active</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Configured Boards</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats?.boardsCount || 0}</p>
          <span className="text-[10px] text-slate-400">Greenhouse & Lever</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">AI Token Requests</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.aiUsage?.totalRequests || 0}
          </p>
          <span className="text-[10px] text-slate-400">Gemini Flash API</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Estimated AI Cost</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ${(stats?.aiUsage?.totalCost || 0).toFixed(4)}
          </p>
          <span className="text-[10px] text-slate-400">Multi-tenant usage</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        {['users', 'boards', 'ai-usage'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
              activeTab === t
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Registered Users</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <div key={u._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-slate-400">{u.email} • Role: {u.role}</p>
                </div>
                <button
                  onClick={() => handleToggleUser(u._id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    u.isActive
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boards Tab */}
      {activeTab === 'boards' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Company Job Board</h2>
            <form onSubmit={handleAddBoard} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder="Company Name (e.g. Figma)"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <select
                value={newBoardPlatform}
                onChange={(e) => setNewBoardPlatform(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
              </select>
              <input
                type="text"
                required
                placeholder="Board Token / Identifier"
                value={newBoardToken}
                onChange={(e) => setNewBoardToken(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                Add Board
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Configured Public Job Boards</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {boards.map((b) => (
                <div key={b._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {b.platform}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Identifier: <code>{b.boardIdentifier}</code> • Last synced:{' '}
                      {b.lastSyncedAt ? new Date(b.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCheckBoardHealth(b._id)}
                      className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Check API
                    </button>
                    <button
                      onClick={() => handleToggleBoard(b._id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        b.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Usage Tab */}
      {activeTab === 'ai-usage' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Gemini API Requests Telemetry</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {aiUsage.map((u) => (
              <div key={u._id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {u.requestType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-semibold">{u.model}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    User: {u.userId?.email || 'System'} • {new Date(u.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {u.inputTokens + u.outputTokens} tokens
                  </span>
                  <span className="text-[10px] text-slate-400">${(u.estimatedCost || 0).toFixed(6)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

