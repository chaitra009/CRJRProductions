import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Server,
  Layers,
  Users,
  Home,
  Code,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { HouseholdRecord, UserRecord } from '../types';
import {
  getAllHouseholds,
  getAllUsers,
  seedInitialDatabase,
  saveHouseholdRecord,
  saveUserRecord,
  deleteUserRecord,
} from '../services/dbService';
import { testConnection } from '../firebase';

interface DatabaseViewerProps {
  onSelectHousehold?: (household: HouseholdRecord) => void;
  onClose?: () => void;
}

export function DatabaseViewer({ onSelectHousehold, onClose }: DatabaseViewerProps) {
  const [activeTab, setActiveTab] = useState<'households' | 'users' | 'raw'>('households');
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Form states for adding custom DB records directly
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserAge, setNewUserAge] = useState<number | ''>(42);
  const [newUserGender, setNewUserGender] = useState('Female');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'caregiver' | 'cook' | 'dietitian' | 'patient'>('caregiver');
  const [newUserHouseholdId, setNewUserHouseholdId] = useState('');

  const fetchDbData = async () => {
    setIsLoading(true);
    setStatusMessage('Querying Cloud Firestore collections...');
    try {
      const conn = await testConnection();
      setIsConnected(conn);

      const [hhList, uList] = await Promise.all([
        getAllHouseholds(),
        getAllUsers(),
      ]);

      setHouseholds(hhList);
      setUsers(uList);
      setStatusMessage(`Synced ${hhList.length} households and ${uList.length} users directly from Cloud Firestore.`);
    } catch (err: any) {
      setStatusMessage(`Query error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  useEffect(() => {
    fetchDbData();
  }, []);

  const handleSeedData = async () => {
    setIsLoading(true);
    setStatusMessage('Writing verified test tables to Cloud Firestore...');
    try {
      const { household, users: createdUsers } = await seedInitialDatabase();
      await fetchDbData();
      setStatusMessage(`Successfully seeded household "${household.name}" with ${createdUsers.length} users into Cloud Firestore!`);
    } catch (err: any) {
      setStatusMessage(`Seeding error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const uId = `usr-${Date.now()}`;
    const userObj: UserRecord = {
      id: uId,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      age: newUserAge === '' ? undefined : Number(newUserAge),
      gender: newUserGender,
      roles: [newUserRole],
      isHomeHead: newUserRole === 'admin',
      householdId: newUserHouseholdId || (households[0]?.id ?? 'hh-default'),
      createdAt: new Date().toISOString(),
    };

    setIsLoading(true);
    try {
      await saveUserRecord(userObj);
      // If linked to existing household, append to household's memberIds array
      if (userObj.householdId) {
        const hh = households.find((h) => h.id === userObj.householdId);
        if (hh) {
          const updatedHh: HouseholdRecord = {
            ...hh,
            memberIds: Array.from(new Set([...(hh.memberIds || []), uId])),
          };
          await saveHouseholdRecord(updatedHh);
        }
      }
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      await fetchDbData();
      setStatusMessage(`Created user ${userObj.name} in Firestore /users table!`);
    } catch (err: any) {
      setStatusMessage(`Error creating user: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleDeleteUser = async (userId: string, hhId?: string) => {
    if (!confirm('Delete this user from Firestore users table?')) return;
    setIsLoading(true);
    try {
      await deleteUserRecord(userId, hhId);
      await fetchDbData();
      setStatusMessage(`Removed user ${userId} from Firestore.`);
    } catch (err: any) {
      setStatusMessage(`Delete error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 mb-8">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Cloud Firestore Database Inspector</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isConnected ? 'Connected & Live' : 'Connecting'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              DB ID: <span className="text-emerald-400 font-semibold">{import.meta.env.VITE_FIREBASE_DATABASE_ID}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDbData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            title="Query Firestore directly"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh DB
          </button>

          <button
            onClick={handleSeedData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50"
            title="Write test household with memberIds array and user records to Firestore"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Seed Sample Data to Cloud DB
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="px-6 py-2 bg-emerald-950/50 border-b border-emerald-900/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 bg-slate-950/40 border-b border-slate-800 flex items-center gap-4 text-xs">
        <button
          onClick={() => setActiveTab('households')}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'households'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Households Table ({households.length})
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            /households
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Users Table ({users.length})
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            /users
          </span>
        </button>

        <button
          onClick={() => setActiveTab('raw')}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'raw'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Raw JSON Inspection
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* Households Table View */}
        {activeTab === 'households' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <p>
                Each household is stored in a separate table with an array of <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">memberIds</code> referencing user documents.
              </p>
              <span className="text-[11px] font-mono">{households.length} Record(s)</span>
            </div>

            {households.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Home className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">No households currently in Firestore</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  No default data is pre-stored. You can create a home via the role onboarding wizard, or click below to seed sample verified records directly into Cloud Firestore.
                </p>
                <button
                  onClick={handleSeedData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Seed Sample Household & Users to DB
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {households.map((hh) => (
                  <div
                    key={hh.id}
                    className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{hh.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
                            {hh.homeCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                            {hh.region}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-1">Doc ID: {hh.id}</p>
                      </div>

                      {onSelectHousehold && (
                        <button
                          onClick={() => onSelectHousehold(hh)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1 font-medium"
                        >
                          Load in App <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Member IDs Array Section */}
                    <div className="mt-3 pt-3 border-t border-slate-900">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-mono text-[11px] font-semibold">
                          memberIds ({hh.memberIds?.length || 0}):
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Array of IDs linking to /users
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {hh.memberIds && hh.memberIds.length > 0 ? (
                          hh.memberIds.map((mId) => {
                            const matchedUser = users.find((u) => u.id === mId);
                            return (
                              <span
                                key={mId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                                title={`Matched user: ${matchedUser ? matchedUser.name : 'Not yet created in users table'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${matchedUser ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <span className="text-slate-300">{mId}</span>
                                {matchedUser && (
                                  <span className="text-emerald-400 font-sans text-[11px] font-medium ml-1">
                                    ({matchedUser.name})
                                  </span>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-500 italic">No member IDs in array</span>
                        )}
                      </div>
                    </div>

                    {/* Kitchen preferences */}
                    {(hh.activeCuisines?.length > 0 || hh.defaultCookLanguage) && (
                      <div className="mt-3 pt-2 text-xs text-slate-400 flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] font-mono text-slate-500">Cuisines:</span>
                        {hh.activeCuisines?.map((c) => (
                          <span key={c} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[11px]">
                            {c}
                          </span>
                        ))}
                        {hh.defaultCookLanguage && (
                          <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/40 text-[11px]">
                            Dialect: {hh.defaultCookLanguage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Table View */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <p>
                Each user is stored in the separate <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">/users</code> table with complete user details (name, email, age, gender, roles, householdId).
              </p>
              <button
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add User to DB
              </button>
            </div>

            {/* Add user form */}
            {isAddingUser && (
              <form onSubmit={handleCreateUser} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-mono text-emerald-400 uppercase font-semibold block">
                  New Firestore User Document (/users)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. Maria Chen"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="maria@vitalplate.app"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Age</label>
                    <input
                      type="number"
                      value={newUserAge}
                      onChange={(e) => setNewUserAge(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="40"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Gender</label>
                    <select
                      value={newUserGender}
                      onChange={(e) => setNewUserGender(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Assigned Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="admin">Household Admin</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="cook">Domestic Helper / Cook</option>
                      <option value="dietitian">Clinical Dietitian</option>
                      <option value="patient">Senior Citizen / Patient</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Household Link</label>
                    <select
                      value={newUserHouseholdId}
                      onChange={(e) => setNewUserHouseholdId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Household</option>
                      {households.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.homeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Save to Firestore Users Table
                  </button>
                </div>
              </form>
            )}

            {users.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">No users currently in Firestore</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Users are stored in the separate users table when registered or added. Seed sample data or add a user above.
                </p>
                <button
                  onClick={handleSeedData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Seed Sample Users to DB
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-mono font-medium">User ID</th>
                      <th className="py-2.5 px-3 font-medium">Name</th>
                      <th className="py-2.5 px-3 font-medium">Email</th>
                      <th className="py-2.5 px-3 font-medium">Age / Gender</th>
                      <th className="py-2.5 px-3 font-medium">Roles</th>
                      <th className="py-2.5 px-3 font-medium">Household</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{u.id}</td>
                        <td className="py-2.5 px-3 font-medium text-white flex items-center gap-1.5">
                          {u.name}
                          {u.isHomeHead && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950/70 text-amber-300 border border-amber-800/80">
                              Head
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {u.age ? `${u.age} yrs` : '—'} / {u.gender || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono capitalize"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {u.householdId || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.householdId)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Raw JSON inspection */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Live snapshot of Firestore database tables (<code className="text-emerald-400">households</code> and <code className="text-emerald-400">users</code>):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase font-semibold mb-1 block">
                  Collection: /households ({households.length})
                </span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-auto max-h-80">
                  {JSON.stringify(households, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase font-semibold mb-1 block">
                  Collection: /users ({users.length})
                </span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-auto max-h-80">
                  {JSON.stringify(users, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
