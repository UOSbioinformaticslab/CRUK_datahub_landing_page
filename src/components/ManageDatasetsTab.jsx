import React, { useState, useEffect, useMemo } from 'react';
import FocusLock from 'react-focus-lock';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const ManageDatasetsTab = ({ token, teams = [], showMessage }) => {
    // Check if running on localhost / local site
    const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );

    // Environments
    const [environments, setEnvironments] = useState([
        { id: 'local', name: 'Local (SQLite)', configured: true },
        { id: 'railway_dev', name: 'Railway Dev', configured: false },
        { id: 'railway_staging', name: 'Railway Staging', configured: false }
    ]);
    const [currentEnv, setCurrentEnv] = useState('local');

    // Datasets state
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    // Modals
    const [teamModalDataset, setTeamModalDataset] = useState(null);
    const [selectedNewTeamId, setSelectedNewTeamId] = useState('');
    const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

    const [deleteModalDataset, setDeleteModalDataset] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [copyModalDataset, setCopyModalDataset] = useState(null);
    const [targetCopyEnv, setTargetCopyEnv] = useState('railway_dev');
    const [isCopying, setIsCopying] = useState(false);
    const [conflictWarning, setConflictWarning] = useState(null);

    // Fetch available environments (only if local)
    useEffect(() => {
        if (!token) return;
        if (isLocal) {
            fetch(`${API_BASE_URL}/admin/datasets/environments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.environments) {
                    setEnvironments(data.environments);
                }
            })
            .catch(() => {});
        }
    }, [token, isLocal]);

    // Switch environments: Always fetch live datasets immediately without stale cache
    useEffect(() => {
        if (!token) return;
        fetchDatasets(currentEnv);
    }, [token, currentEnv]);

    const fetchDatasets = async (envToFetch = currentEnv) => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const url = isLocal
                ? `${API_BASE_URL}/admin/datasets?env=${encodeURIComponent(envToFetch)}&_t=${timestamp}`
                : `${API_BASE_URL}/admin/datasets?_t=${timestamp}`;

            const res = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Failed to fetch datasets for ${envToFetch}`);
            }

            const data = await res.json();
            const loadedDatasets = data.datasets || [];
            setDatasets(loadedDatasets);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering
    const filteredDatasets = useMemo(() => {
        let result = datasets;
        if (teamFilter) {
            result = result.filter(d => String(d.team_id) === String(teamFilter));
        }
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter(d => {
                const title = (d.title || '').toLowerCase();
                const team = (d.team_name || '').toLowerCase();
                const dsId = (d.datasetid || '').toLowerCase();
                const id = String(d.id);
                return title.includes(term) || team.includes(term) || dsId.includes(term) || id === term;
            });
        }
        return result;
    }, [datasets, searchTerm, teamFilter]);

    // Handle Team Change (Cascading)
    const handleSaveNewTeam = async () => {
        if (!teamModalDataset || !selectedNewTeamId) return;
        setIsUpdatingTeam(true);
        try {
            const url = `${API_BASE_URL}/admin/datasets/${teamModalDataset.id}/team?env=${encodeURIComponent(currentEnv)}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ team_id: parseInt(selectedNewTeamId, 10) })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to update dataset team');

            const newTeamId = parseInt(selectedNewTeamId, 10);
            const newTeamName = teams.find(t => t.id === newTeamId)?.name || `Team ${newTeamId}`;
            const targetId = teamModalDataset.id;

            // In-memory optimistic update: immediate UI update without slow reload
            setDatasets(prev => prev.map(d => d.id === targetId ? { ...d, team_id: newTeamId, team_name: newTeamName } : d));

            showMessage(
                `Team updated! Linked assets also updated: ${data.updated_projects} projects, ${data.updated_publications} publications, ${data.updated_tools} tools.`
            );
            setTeamModalDataset(null);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setIsUpdatingTeam(false);
        }
    };

    // Handle Cascading Delete
    const handleConfirmDelete = async () => {
        if (!deleteModalDataset) return;
        setIsDeleting(true);
        try {
            const url = `${API_BASE_URL}/admin/datasets/${deleteModalDataset.id}?env=${encodeURIComponent(currentEnv)}`;
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to delete dataset');

            const deletedId = deleteModalDataset.id;

            // In-memory optimistic removal: removes immediately from view
            setDatasets(prev => prev.filter(d => d.id !== deletedId));

            showMessage(
                `Dataset and linked assets deleted (${data.deleted_projects_count} projects, ${data.deleted_publications_count} publications, ${data.deleted_tools_count} tools).`
            );
            setDeleteModalDataset(null);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle Copy to Environment
    const handleExecuteCopy = async (overwrite = false) => {
        if (!copyModalDataset || !targetCopyEnv) return;
        setIsCopying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/datasets/copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataset_id: copyModalDataset.id,
                    source_env: currentEnv,
                    target_env: targetCopyEnv,
                    overwrite: overwrite
                })
            });

            const data = await res.json();

            if (res.status === 409) {
                // Conflict detected: dataset already exists in target environment
                setConflictWarning(data.detail || {
                    message: `A dataset with title "${copyModalDataset.title}" or ID "${copyModalDataset.datasetid}" already exists in ${targetCopyEnv}.`
                });
                return;
            }

            if (!res.ok) {
                throw new Error(data.detail || 'Failed to copy dataset to target environment');
            }

            showMessage(data.message || `Successfully copied to ${targetCopyEnv}!`);
            setCopyModalDataset(null);
            setConflictWarning(null);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200 shadow-sm">
            {/* Header & Environment Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-6 border-b border-gray-200 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Dataset Management
                        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
                            {filteredDatasets.length} {filteredDatasets.length === 1 ? 'Dataset' : 'Datasets'}
                        </span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Search, reassign teams, delete, and copy datasets across environments.
                    </p>
                </div>

                {/* Environment Selector: Only shown on local site */}
                {isLocal && (
                    <div className="flex items-center gap-2 bg-white p-1.5 border border-gray-300 rounded-lg shadow-sm">
                        <span className="text-xs font-bold text-gray-500 uppercase px-2">Environment:</span>
                        {environments.map(env => (
                            <button
                                key={env.id}
                                onClick={() => {
                                    setCurrentEnv(env.id);
                                    setSearchTerm('');
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    currentEnv === env.id
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                title={env.configured ? `Switch to ${env.name}` : `${env.name} (Not configured)`}
                            >
                                {env.id === 'local' && '💻 '}
                                {env.id === 'railway_dev' && '☁️ '}
                                {env.id === 'railway_staging' && '🚀 '}
                                {env.name}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => fetchDatasets(currentEnv, true)}
                            disabled={loading}
                            className="ml-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-all flex items-center gap-1 font-semibold"
                            title="Force reload datasets from database"
                        >
                            <span className={loading ? 'animate-spin' : ''}>↻</span>
                            <span>Refresh</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Controls: Search Bar & Team Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                    <input
                        type="text"
                        placeholder="Search by Title, Team Name, or Dataset ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div>
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                        <option value="">All Teams</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Datasets Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-sm">Loading datasets from {currentEnv}...</p>
                </div>
            ) : filteredDatasets.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500">
                    <p className="text-base font-semibold">No datasets found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or switch environment.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold border-b">
                                <th className="p-3 w-28">Dataset ID</th>
                                <th className="p-3">Title</th>
                                <th className="p-3 w-44">Team</th>
                                <th className="p-3 w-40">Linked Assets</th>
                                <th className="p-3 w-28">Status</th>
                                <th className="p-3 w-48 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredDatasets.map(ds => (
                                <tr key={ds.id} className="hover:bg-blue-50/40 transition-colors">
                                    <td className="p-3 font-mono font-medium text-gray-800 text-xs">
                                        {ds.datasetid || `DS-${ds.id}`}
                                    </td>
                                    <td className="p-3 font-semibold text-gray-900">
                                        {ds.title}
                                        <div className="text-xs text-gray-400 font-normal">Internal ID: {ds.id}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {ds.team_name}
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">
                                        <div className="flex flex-wrap gap-1">
                                            {ds.linked_projects_count > 0 && (
                                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                                    {ds.linked_projects_count} Proj
                                                </span>
                                            )}
                                            {ds.linked_publications_count > 0 && (
                                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                                    {ds.linked_publications_count} Pub
                                                </span>
                                            )}
                                            {ds.linked_tools_count > 0 && (
                                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                                    {ds.linked_tools_count} Tool
                                                </span>
                                            )}
                                            {ds.linked_projects_count === 0 && ds.linked_publications_count === 0 && ds.linked_tools_count === 0 && (
                                                <span className="text-gray-400 italic">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            ds.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {ds.status || (ds.active ? 'ACTIVE' : 'DRAFT')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="inline-flex items-center gap-1.5">
                                            {/* Change Team Button */}
                                            <button
                                                onClick={() => {
                                                    setTeamModalDataset(ds);
                                                    setSelectedNewTeamId(ds.team_id ? String(ds.team_id) : '');
                                                }}
                                                className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                title="Change team for this dataset and all linked assets"
                                            >
                                                Team
                                            </button>

                                            {/* Copy to Env Button (Only on local site) */}
                                            {isLocal && (
                                                <button
                                                    onClick={() => {
                                                        setCopyModalDataset(ds);
                                                        setTargetCopyEnv(currentEnv === 'railway_dev' ? 'railway_staging' : 'railway_dev');
                                                        setConflictWarning(null);
                                                    }}
                                                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                                    title="Copy dataset and all linked assets to another environment"
                                                >
                                                    Copy
                                                </button>
                                            )}

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => setDeleteModalDataset(ds)}
                                                className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                                title="Delete dataset and all linked assets"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- MODAL 1: CHANGE TEAM (CASCADING) --- */}
            {teamModalDataset && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <FocusLock returnFocus={true}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                Change Team: {teamModalDataset.title}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 font-mono">
                                Dataset ID: {teamModalDataset.datasetid || `DS-${teamModalDataset.id}`} (Env: {currentEnv})
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Select New Team:
                                </label>
                                <select
                                    value={selectedNewTeamId}
                                    onChange={(e) => setSelectedNewTeamId(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Choose Team --</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r text-xs text-blue-900 mb-6">
                                <p className="font-semibold mb-0.5">Cascading Team Reassignment</p>
                                <p>
                                    Changing the team on this dataset will automatically reassign any associated
                                    projects ({teamModalDataset.linked_projects_count}), publications ({teamModalDataset.linked_publications_count}),
                                    and tools ({teamModalDataset.linked_tools_count}) to the same new team.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    onClick={() => setTeamModalDataset(null)}
                                    disabled={isUpdatingTeam}
                                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNewTeam}
                                    disabled={isUpdatingTeam || !selectedNewTeamId || String(selectedNewTeamId) === String(teamModalDataset.team_id)}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
                                >
                                    {isUpdatingTeam ? 'Updating...' : 'Confirm Team Change'}
                                </button>
                            </div>
                        </div>
                    </FocusLock>
                </div>
            )}

            {/* --- MODAL 2: DELETE DATASET (CASCADING) --- */}
            {deleteModalDataset && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <FocusLock returnFocus={true}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-red-200">
                            <div className="flex items-center gap-3 text-red-600 mb-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Confirm Cascading Deletion</h3>
                                    <p className="text-xs text-gray-500 font-mono">Environment: {currentEnv}</p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-700 mb-3">
                                Are you sure you want to permanently delete <strong className="text-gray-900">"{deleteModalDataset.title}"</strong> ({deleteModalDataset.datasetid || `DS-${deleteModalDataset.id}`})?
                            </p>

                            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r text-xs text-red-900 mb-6">
                                <p className="font-bold mb-1">Permanent Cascading Cleanup</p>
                                <p>This operation will also permanently delete:</p>
                                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                                    <li><strong>{deleteModalDataset.linked_projects_count}</strong> associated Project(s)</li>
                                    <li><strong>{deleteModalDataset.linked_publications_count}</strong> associated Publication(s)</li>
                                    <li><strong>{deleteModalDataset.linked_tools_count}</strong> associated Tool(s)</li>
                                </ul>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    onClick={() => setDeleteModalDataset(null)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-sm"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Dataset & Linked Assets'}
                                </button>
                            </div>
                        </div>
                    </FocusLock>
                </div>
            )}

            {/* --- MODAL 3: COPY TO ENVIRONMENT --- */}
            {copyModalDataset && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <FocusLock returnFocus={true}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                Copy Dataset: {copyModalDataset.title}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 font-mono">
                                Source: {currentEnv} ({copyModalDataset.datasetid || `DS-${copyModalDataset.id}`})
                            </p>

                            {/* Conflict Warning Alert if 409 received */}
                            {conflictWarning ? (
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r text-xs text-amber-900 mb-6">
                                    <p className="font-bold text-sm text-amber-900 mb-1">⚠️ Dataset Already Exists in Target Database</p>
                                    <p className="mb-2">
                                        {conflictWarning.message || `A dataset with title "${copyModalDataset.title}" or ID "${copyModalDataset.datasetid}" is already present in ${targetCopyEnv}.`}
                                    </p>
                                    <p className="font-semibold text-amber-950">
                                        Do you want to overwrite the existing dataset and update its linked assets in {targetCopyEnv}?
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleExecuteCopy(true)}
                                            disabled={isCopying}
                                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-sm text-xs"
                                        >
                                            {isCopying ? 'Overwriting...' : 'Yes, Overwrite Target Dataset'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConflictWarning(null)}
                                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-semibold"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Target Destination Environment:
                                        </label>
                                        <select
                                            value={targetCopyEnv}
                                            onChange={(e) => setTargetCopyEnv(e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            {environments
                                                .filter(e => e.id !== currentEnv)
                                                .map(e => (
                                                    <option key={e.id} value={e.id}>
                                                        {e.id === 'local' && '💻 '}
                                                        {e.id === 'railway_dev' && '☁️ '}
                                                        {e.id === 'railway_staging' && '🚀 '}
                                                        {e.name}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r text-xs text-indigo-900 mb-6">
                                        <p className="font-semibold mb-0.5">Non-Destructive Copy</p>
                                        <p>
                                            This will replicate the dataset and all linked projects ({copyModalDataset.linked_projects_count}),
                                            publications ({copyModalDataset.linked_publications_count}), and tools ({copyModalDataset.linked_tools_count})
                                            into <strong>{targetCopyEnv}</strong>. The original dataset will remain safely on <strong>{currentEnv}</strong>.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 border-t pt-4">
                                        <button
                                            onClick={() => {
                                                setCopyModalDataset(null);
                                                setConflictWarning(null);
                                            }}
                                            disabled={isCopying}
                                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleExecuteCopy(false)}
                                            disabled={isCopying || !targetCopyEnv}
                                            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                                        >
                                            {isCopying ? 'Copying...' : `Copy to ${targetCopyEnv}`}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </FocusLock>
                </div>
            )}
        </div>
    );
};
