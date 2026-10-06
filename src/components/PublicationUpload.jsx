import React, { useState, useEffect } from 'react';
import TargetSelector from './TargetSelector';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const MICROSERVICE_URL = import.meta.env.VITE_MICROSERVICE_URL || "http://localhost:8001";

const findMatchedKeys = (item, terms) => {
    const matches = new Set();
    const activeTerms = terms.filter(t => t && t.trim().length > 0).map(t => t.toLowerCase());

    if (activeTerms.length === 0) return [];

    const searchWithinObject = (obj, topLevelKey) => {
        if (typeof obj === 'string') {
            const lowerObj = obj.toLowerCase();
            activeTerms.forEach(term => {
                if (lowerObj.includes(term)) {
                    matches.add(topLevelKey);
                }
            });
        } else if (Array.isArray(obj)) {
            obj.forEach(val => searchWithinObject(val, topLevelKey));
        } else if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, val]) => {
                searchWithinObject(val, topLevelKey || key);
            });
        }
    };

    searchWithinObject(item, null);
    return Array.from(matches);
};

const PublicationUpload = () => {
    const teamId = parseInt(localStorage.getItem('activeTeamId'), 10) || parseInt(localStorage.getItem('teamId'), 10);
    const token = localStorage.getItem('token');

    const [datasets, setDatasets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);

    const [currentDoi, setCurrentDoi] = useState('');
    const [dois, setDois] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [resetCountdown, setResetCountdown] = useState(null);

    // Search state
    const [searchTitle, setSearchTitle] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (isNaN(teamId) || !token) return;

            try {
                const dsRes = await fetch(`${API_BASE_URL}/datasets/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dsData = dsRes.ok ? await dsRes.json() : [];
                const fetchedDatasets = dsData.filter(d => d.team_id === teamId);

                const projRes = await fetch(`${API_BASE_URL}/projects/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const projData = projRes.ok ? await projRes.json() : [];
                const fetchedProjects = projData.filter(p => p.team_id === teamId);

                const getProjectName = p => p.project_grant_name || p.projectGrantName || p.metadata_blob?.project_grant_name || p.metadata_blob?.projectGrantName || p.metadata_blob?.summary?.title || p.name || p.title || '';
                const getDatasetName = d => d.metadata_blob?.summary?.title || d.computed_title || d.name || d.title || '';
                const sortAlpha = (a, b) => (getProjectName(a) || getDatasetName(a)).localeCompare(getProjectName(b) || getDatasetName(b));
                setDatasets(fetchedDatasets.sort(sortAlpha));
                setProjects(fetchedProjects.sort(sortAlpha));
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };
        fetchData();
    }, [teamId, token]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && currentDoi.trim().length > 0) {
            const newDoisList = currentDoi
                .split(',')
                .map(d => d.trim())
                .filter(d => d.length > 0)
                .map(d => ({ value: d, status: 'pending' }));

            setDois([...dois, ...newDoisList]);
            setCurrentDoi('');
        }
    };

    const removeDoi = (index) => {
        setDois(dois.filter((_, i) => i !== index));
    };

    const updateDoi = (index, newValue) => {
        const updated = [...dois];
        updated[index].value = newValue;
        updated[index].status = 'pending';
        setDois(updated);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);
        setHasSearched(false);
        setElapsedTime(0);

        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        try {
            const url = `https://api.crossref.org/works?query=${encodeURIComponent(searchTitle)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch data from Crossref API');
            }

            const data = await response.json();
            const items = data.message.items;

            const termsToMatch = [
                searchTitle.toLowerCase(),
                ...searchKeyword.split(',').map(k => k.trim().toLowerCase()).filter(k => k)
            ];

            const filteredItems = items
                .filter(item => {
                    let searchableText = "";
                    if (item.title) searchableText += item.title.join(" ") + " ";
                    if (item.abstract) searchableText += item.abstract + " ";
                    if (item.author) {
                        searchableText += item.author.map(a => `${a.given || ''} ${a.family || ''}`).join(" ") + " ";
                    }
                    searchableText = searchableText.toLowerCase();

                    return termsToMatch.every(term => searchableText.includes(term));
                })
                .map(item => ({
                    doi: item.DOI,
                    title: item.title && item.title.length > 0 ? item.title[0] : 'No Title Provided',
                    abstract: item.abstract || 'No abstract provided for this publication.',
                    matchedFields: findMatchedKeys(item, [searchTitle])
                }));

            setSearchResults(filteredItems);
            setHasSearched(true);
        } catch (err) {
            setSearchError(err.message);
        } finally {
            clearInterval(timer);
            setIsSearching(false);
        }
    };

    const toggleSearchDoi = (doi) => {
        const index = dois.findIndex(d => d.value === doi);
        if (index >= 0) {
            removeDoi(index);
        } else {
            const newDois = [...dois, { value: doi, status: 'pending' }];
            newDois.sort((a, b) => {
                const idxA = searchResults.findIndex(r => r.doi === a.value);
                const idxB = searchResults.findIndex(r => r.doi === b.value);

                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0;
            });
            setDois(newDois);
        }
    };

    const isDoiSelected = (doi) => {
        return dois.some(d => d.value === doi);
    };

    const handleSubmit = async () => {
        if (selectedTarget === null) {
            setFeedback({ message: 'Please select a dataset or project first.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setFeedback({ message: 'Processing publications...', type: 'info' });

        let allSuccess = true;
        const updatedDois = [...dois];

        for (let i = 0; i < updatedDois.length; i++) {
            const doiObj = updatedDois[i];

            if (doiObj.status === 'success') continue;

            console.log(`\n🔍 [DOI DEBUG 1/3] Processing DOI #${i + 1}: '${doiObj.value}' for Team ID: ${teamId}`);

            try {
                // 1. Fetch structured JSON from Microservice
                const microserviceEndpoint = `${MICROSERVICE_URL}/api/publications/from-doi`;
                console.log(`🚀 [DOI DEBUG] Step 1: POST to Microservice -> ${microserviceEndpoint}`);
                
                const pubRes = await fetch(microserviceEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ doi: doiObj.value, team_id: teamId })
                });

                if (!pubRes.ok) {
                    const errBody = await pubRes.text();
                    console.error(`❌ [DOI DEBUG] Step 1 Failed (${pubRes.status}):`, errBody);
                    throw new Error(`Microservice Error (${pubRes.status}): ${errBody}`);
                }
                
                const pubPayload = await pubRes.json();
                console.log(`✅ [DOI DEBUG] Step 1 Success! Extracted payload:`, pubPayload);

                // Auto-detect bioRxiv DOIs (10.1101) if journal_name is missing or "Journal Unknown"
                const rawDoi = String(doiObj.value || '');
                const rawUrl = String(pubPayload.url || '');
                if (rawDoi.includes('10.1101') || rawUrl.toLowerCase().includes('biorxiv')) {
                    const currentJournal = (pubPayload.journal_name || '').toLowerCase().trim();
                    if (!currentJournal || ['journal unknown', 'unknown journal', 'unknown', ''].includes(currentJournal)) {
                        pubPayload.journal_name = 'bioRxiv';
                    }
                }

                // 2. Save structured JSON to Main Backend
                const backendEndpoint = `${API_BASE_URL}/publications/`;
                console.log(`🚀 [DOI DEBUG] Step 2: POST to Backend -> ${backendEndpoint}`);
                
                const saveRes = await fetch(backendEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(pubPayload)
                });

                if (!saveRes.ok) {
                    const errBody = await saveRes.text();
                    console.error(`❌ [DOI DEBUG] Step 2 Failed (${saveRes.status}):`, errBody);
                    throw new Error(`Save Backend Error (${saveRes.status}): ${errBody}`);
                }

                const pubData = await saveRes.json();
                const pubId = pubData.id;
                console.log(`✅ [DOI DEBUG] Step 2 Success! Created Publication ID: ${pubId}`);

                // 3. Link publication to target dataset/project
                const linkPath = selectedTarget.type === 'dataset'
                    ? `/publications/${pubId}/datasets/${selectedTarget.id}`
                    : `/publications/${pubId}/projects/${selectedTarget.id}`;

                const linkEndpoint = `${API_BASE_URL}${linkPath}`;
                console.log(`🚀 [DOI DEBUG] Step 3: POST Link -> ${linkEndpoint}`);

                const linkRes = await fetch(linkEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!linkRes.ok) {
                    const errBody = await linkRes.text();
                    console.error(`❌ [DOI DEBUG] Step 3 Failed (${linkRes.status}):`, errBody);
                    throw new Error(`Linking Error (${linkRes.status}): ${errBody}`);
                }

                console.log(`✅ [DOI DEBUG] Step 3 Success! Linked Publication ${pubId} to ${selectedTarget.type} ${selectedTarget.id}`);
                updatedDois[i].status = 'success';

            } catch (error) {
                console.error(`❌ [DOI DEBUG] Failed processing DOI '${doiObj.value}':`, error);
                updatedDois[i].status = 'error';
                updatedDois[i].errorMessage = error.message;
                allSuccess = false;
            }
        }

        setDois(updatedDois);

        if (allSuccess === true) {
            setFeedback({ message: 'All publications created and linked successfully. Resetting form.', type: 'success' });
            startResetTimer();
        } else {
            const failedDetails = updatedDois.filter(d => d.status === 'error').map(d => `${d.value}: ${d.errorMessage || 'Error'}`).join(' | ');
            setFeedback({ message: `Errors encountered: ${failedDetails}`, type: 'error' });
            setIsSubmitting(false);
        }
    };

    const startResetTimer = () => {
        let seconds = 5;
        setResetCountdown(seconds);
        const interval = setInterval(() => {
            seconds -= 1;
            setResetCountdown(seconds);
            if (seconds === 0) {
                clearInterval(interval);
                resetForm();
            }
        }, 1000);
    };

    const resetForm = () => {
        setDois([]);
        setSelectedTarget(null);
        setFeedback({ message: '', type: '' });
        setResetCountdown(null);
        setIsSubmitting(false);
        setSearchTitle('');
        setSearchKeyword('');
        setSearchResults([]);
        setHasSearched(false);
        setElapsedTime(0);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 mt-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 border-b pb-4">Upload Publications</h2>

            {!selectedTarget ? (
                <TargetSelector
                    datasets={datasets}
                    projects={projects}
                    selectedTarget={selectedTarget}
                    onSelectionChange={setSelectedTarget}
                    disabled={isSubmitting}
                />
            ) : (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 flex justify-between items-center mb-6">
                    <div>
                        <span className="text-sm text-gray-500 block">Selected Target</span>
                        <span className="font-bold text-gray-800 text-lg">
                            {selectedTarget.type === 'dataset' ? 'Dataset: ' : 'Project: '}
                            {selectedTarget.name || selectedTarget.title}
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedTarget(null)}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        Change Target
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 mt-6">

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Type comma-separated DOIs then press ENTER</h3>

                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hint - if you have a publications page, use an AI to convert it to just the comma-separated dois and add them here</label>
                        <input
                            type="text"
                            placeholder="eg 10.1002/hep.31391, 10.1002/hep.31327, 10.1016/j.cgh.2020.04.084"
                            value={currentDoi}
                            onChange={(e) => setCurrentDoi(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting || selectedTarget === null}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
                        />
                    </div>

                    <div className="border-t border-gray-300 my-6"></div>

                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Or Search Crossref to find and enter your DOIs</h4>
                        <form onSubmit={handleSearch} className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Key part of Dataset Title e.g OCCAMS</label>
                                <input
                                    type="text"
                                    value={searchTitle}
                                    onChange={(e) => setSearchTitle(e.target.value)}
                                    disabled={isSubmitting || selectedTarget === null}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords/Phrases (Optional, comma-separated)</label>
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    disabled={isSubmitting || selectedTarget === null}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSearching || isSubmitting || selectedTarget === null}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                {isSearching ? `Interrogating crossref... (${elapsedTime}s)` : 'Search Publications'}
                            </button>
                        </form>

                        {searchError && (
                            <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-md">
                                {searchError}
                            </div>
                        )}

                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {searchResults.map((pub) => (
                                <div key={pub.doi} className="flex items-start p-4 border border-gray-200 bg-white rounded-md hover:bg-gray-50 transition-colors">
                                    <div className="flex-shrink-0 pt-1 mr-4">
                                        <input
                                            type="checkbox"
                                            checked={isDoiSelected(pub.doi)}
                                            onChange={() => toggleSearchDoi(pub.doi)}
                                            disabled={isSubmitting || selectedTarget === null}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-indigo-600 mb-1">
                                            DOI: <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">{pub.doi}</a>
                                        </p>
                                        <p className="text-base font-bold text-gray-900 mb-2">
                                            {pub.title}
                                        </p>
                                        <div
                                            className="text-sm text-gray-600 mb-2"
                                            dangerouslySetInnerHTML={{ __html: pub.abstract }}
                                        />
                                        {pub.matchedFields && pub.matchedFields.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                    Dataset Title Matched In:
                                                </span>
                                                {pub.matchedFields.map(field => (
                                                    <span
                                                        key={field}
                                                        className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md"
                                                    >
                                                        {field}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {searchResults.length === 0 && !isSearching && !searchError && hasSearched && (
                                <p className="text-gray-500 italic">No publications found matching title and all keywords within the title, author, or abstract fields.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">3. Upload Queue</h3>

                    {dois.length === 0 ? (
                        <p className="text-gray-500 italic mb-6">No DOIs added yet. Enter manually or select from search.</p>
                    ) : (
                        <ul className="space-y-3 mb-6">
                            {dois.map((doi, index) => (
                                <li key={index} className="flex items-center space-x-3 bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                                    <div className="flex-grow flex items-center space-x-3">
                                        <input
                                            type="text"
                                            value={doi.value}
                                            onChange={(e) => updateDoi(index, e.target.value)}
                                            disabled={isSubmitting || doi.status === 'success'}
                                            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 ${
                                                doi.status === 'error' ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                            }`}
                                        />
                                        <a
                                            href={`https://doi.org/${doi.value}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-600 hover:underline whitespace-nowrap"
                                        >
                                            View
                                        </a>
                                    </div>
                                    <div className="w-20 text-center font-medium text-sm">
                                        {doi.status === 'error' && <span className="text-red-600">Failed</span>}
                                        {doi.status === 'success' && <span className="text-green-600">Linked</span>}
                                        {doi.status === 'pending' && <span className="text-gray-400">Pending</span>}
                                    </div>
                                    <button
                                        onClick={() => removeDoi(index)}
                                        disabled={isSubmitting}
                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || dois.length === 0 || selectedTarget === null}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow"
                    >
                        {isSubmitting ? 'Processing DOIs...' : 'Submit Publications'}
                    </button>

                    {feedback.message && (
                        <div className={`mt-4 p-4 rounded-md font-medium border ${
                            feedback.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                            feedback.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                            {feedback.message}
                        </div>
                    )}

                    {resetCountdown !== null && (
                        <div className="mt-2 text-sm text-gray-500 font-medium text-center">
                            Resetting form in {resetCountdown} seconds...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicationUpload;