import React, { useState, useEffect, useCallback } from 'react';

const MIDDLELAYER_URL = (import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002").replace(/\/+$/, '');

const FilterTelemetryTab = () => {
    const [activeSubTab, setActiveSubTab] = useState('rejections'); // 'rejections' | 'additions'
    const [timeframe, setTimeframe] = useState('30d'); // '7d' | '30d' | 'all'
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [rejectionsData, setRejectionsData] = useState(null);
    const [additionsData, setAdditionsData] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [expandedFilterIds, setExpandedFilterIds] = useState(new Set());
    const [isResetting, setIsResetting] = useState(false);

    // Slide-out Drawer state (Option A & B)
    const [drawerState, setDrawerState] = useState({
        isOpen: false,
        datasetName: '',
        filterContext: null,
        loading: false,
        datasetData: null,
        error: ''
    });

    // Copied feedback for drawer rule definition
    const [drawerRuleCopied, setDrawerRuleCopied] = useState(false);

    // Promote to Rule Draft Modal state (Option C)
    const [draftRuleItem, setDraftRuleItem] = useState(null);
    const [copiedRuleJson, setCopiedRuleJson] = useState(false);

    // Escape key listener for drawer and modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (drawerState.isOpen) {
                    setDrawerState(prev => ({ ...prev, isOpen: false }));
                }
                if (draftRuleItem) {
                    setDraftRuleItem(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerState.isOpen, draftRuleItem]);

    // Compute `since` parameter string
    const getSinceDate = useCallback(() => {
        if (timeframe === 'all') return '';
        const days = timeframe === '7d' ? 7 : 30;
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    }, [timeframe]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');
        const sinceParam = getSinceDate();
        const queryStr = sinceParam ? `?since=${encodeURIComponent(sinceParam)}` : '';

        try {
            const [rejRes, addRes] = await Promise.all([
                fetch(`${MIDDLELAYER_URL}/filter-modifications/rejections${queryStr}`),
                fetch(`${MIDDLELAYER_URL}/filter-modifications/manual-additions${queryStr}`)
            ]);

            if (!rejRes.ok || !addRes.ok) {
                throw new Error(`Failed to load telemetry (HTTP ${rejRes.status}/${addRes.status})`);
            }

            const rejJson = await rejRes.json();
            const addJson = await addRes.json();

            setRejectionsData(rejJson);
            setAdditionsData(addJson);
        } catch (err) {
            console.error('Error fetching filter modification analytics:', err);
            setErrorMessage(err.message || 'Could not connect to middlelayer analytics endpoint on port 8002.');
        } finally {
            setIsLoading(false);
        }
    }, [getSinceDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleExpand = (filterId) => {
        setExpandedFilterIds(prev => {
            const next = new Set(prev);
            if (next.has(filterId)) {
                next.delete(filterId);
            } else {
                next.add(filterId);
            }
            return next;
        });
    };

    const handleResetTelemetry = async () => {
        if (!window.confirm('Are you sure you want to reset all telemetry data? This clears all recorded upload sessions and rejection events to start a fresh tracking period.')) {
            return;
        }

        setIsResetting(true);
        try {
            const res = await fetch(`${MIDDLELAYER_URL}/filter-modifications/reset`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Reset failed');
            await fetchData();
            alert('Telemetry reset successfully.');
        } catch (err) {
            alert(`Error resetting telemetry: ${err.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    const handleResetSingleFilter = async (filterId, filterLabel) => {
        if (!window.confirm(`Are you sure you want to reset telemetry for filter "${filterLabel || filterId}" (${filterId})? This will clear its rejection history and manual addition records.`)) {
            return;
        }

        try {
            const res = await fetch(`${MIDDLELAYER_URL}/filter-modifications/reset?filter_id=${encodeURIComponent(filterId)}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to reset filter');
            await fetchData();
        } catch (err) {
            alert(`Error resetting filter telemetry: ${err.message}`);
        }
    };

    // Drawer opener: fetches full metadata and rule definition for the clicked dataset
    const handleOpenDrawer = async (datasetName, filterContext) => {
        setDrawerState({
            isOpen: true,
            datasetName,
            filterContext,
            loading: true,
            datasetData: null,
            error: ''
        });

        try {
            const fid = filterContext?.filter_id || '';
            const queryParams = new URLSearchParams({ name: datasetName });
            if (fid) {
                queryParams.set('filter_id', fid);
            }
            const res = await fetch(`${MIDDLELAYER_URL}/filter-modifications/dataset-metadata?${queryParams.toString()}`);
            if (!res.ok) {
                throw new Error(`Dataset metadata could not be retrieved (HTTP ${res.status})`);
            }
            const data = await res.json();
            setDrawerState(prev => ({
                ...prev,
                loading: false,
                datasetData: data
            }));
        } catch (err) {
            setDrawerState(prev => ({
                ...prev,
                loading: false,
                error: err.message || 'Failed to load dataset details'
            }));
        }
    };

    const handleCloseDrawer = () => {
        setDrawerState(prev => ({ ...prev, isOpen: false }));
    };

    // Generates a complete, syntactically valid JSON rule snippet for filter_rules.json
    const generateDraftRuleJson = (item, customKeyword = '') => {
        if (!item) return '';
        const fid = item.filter_id || item.id || '';
        const label = item.filter_label || item.label || '';
        const category = item.category || (fid.startsWith('0_0') ? 'Cancer Type' : fid.startsWith('0_1') ? 'Access' : 'Data Type');
        
        let primaryGroup = 'data-type';
        if (fid.startsWith('0_0')) primaryGroup = 'cancer-type';
        else if (fid.startsWith('0_1')) primaryGroup = 'access-type';

        const kw = (customKeyword || label || '').toLowerCase().replace(/[()]/g, '').trim();
        const escaped = kw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const pattern = `\\b(${escaped})\\b`;

        const ruleObj = {
            id: fid,
            label: label,
            category: category,
            primaryGroup: primaryGroup,
            patterns: [pattern],
            keywords: [kw],
            case_sensitive: false,
            confidence: 0.85,
            rationale: `Detected mention of '${label}' in dataset metadata.`
        };

        if (category && category.toLowerCase().includes('biobank')) {
            ruleObj.requires_biobank_context = true;
        } else if (category && category.toLowerCase().includes('in vitro')) {
            ruleObj.requires_in_vitro_context = true;
        } else if (category && category.toLowerCase().includes('in vivo')) {
            ruleObj.requires_model_organism_context = true;
        }

        return JSON.stringify(ruleObj, null, 2);
    };

    const handleCopyRuleJson = (jsonString) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(jsonString);
            setCopiedRuleJson(true);
            setTimeout(() => setCopiedRuleJson(false), 2000);
        }
    };

    // Helper: Highlights markdown bold (**word**) or keyword in snippet
    const renderHighlightedSnippet = (snippetText, keyword = '') => {
        if (!snippetText) return null;

        // Check if markdown bold is present: **matched text**
        if (snippetText.includes('**')) {
            const parts = snippetText.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const cleanWord = part.slice(2, -2);
                    return (
                        <mark key={idx} className="bg-amber-100 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-amber-300/80 not-italic">
                            {cleanWord}
                        </mark>
                    );
                }
                return <span key={idx}>{part}</span>;
            });
        }

        // Fallback: highlight keyword case-insensitively
        if (keyword && snippetText.toLowerCase().includes(keyword.toLowerCase())) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = snippetText.split(regex);
            return parts.map((part, idx) => {
                if (part.toLowerCase() === keyword.toLowerCase()) {
                    return (
                        <mark key={idx} className="bg-amber-100 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-amber-300/80 not-italic">
                            {part}
                        </mark>
                    );
                }
                return <span key={idx}>{part}</span>;
            });
        }

        return <span>{snippetText}</span>;
    };

    const filteredRejections = (rejectionsData?.filters || []).filter(f => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            f.filter_id.toLowerCase().includes(q) ||
            f.filter_label.toLowerCase().includes(q) ||
            (f.filter_hierarchy && f.filter_hierarchy.toLowerCase().includes(q)) ||
            (f.dataset_names || []).some(d => d.toLowerCase().includes(q))
        );
    });

    const filteredAdditions = (additionsData?.filters || []).filter(f => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            f.filter_id.toLowerCase().includes(q) ||
            f.filter_label.toLowerCase().includes(q) ||
            (f.filter_hierarchy && f.filter_hierarchy.toLowerCase().includes(q)) ||
            (f.category && f.category.toLowerCase().includes(q)) ||
            (f.datasets || []).some(d => d.toLowerCase().includes(q))
        );
    });

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-gray-900">
            
            {/* Top Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[var(--cruk-darkblue)] flex items-center gap-2">
                        Filter Modification Telemetry & Recommender Feedback
                        <span className="text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Admin Telemetry
                        </span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Inspect why custodians rejected automated filter recommendations and review taxonomy terms added by hand.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-300 bg-white shadow-sm flex items-center gap-1.5 text-xs font-medium"
                        title="Refresh Telemetry Data"
                    >
                        <svg className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Subheader: Tabs, Search & Reset Controls */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3 text-sm">
                
                {/* Rejections vs Additions Sub-tabs */}
                <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setActiveSubTab('rejections')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all flex items-center gap-1.5 ${
                            activeSubTab === 'rejections'
                                ? 'bg-white text-rose-700 shadow-sm border border-gray-200 font-semibold'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Rejected Filters
                        {rejectionsData && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                                {rejectionsData.total_rejections}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveSubTab('additions')}
                        className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all flex items-center gap-1.5 ${
                            activeSubTab === 'additions'
                                ? 'bg-white text-emerald-700 shadow-sm border border-gray-200 font-semibold'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Manual Additions (AI Blind Spots)
                        {additionsData && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                {additionsData.total_manual_additions}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Controls & Search */}
                <div className="flex items-center space-x-3">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search filter or dataset..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 shadow-sm"
                        />
                        {searchFilter && (
                            <button
                                onClick={() => setSearchFilter('')}
                                className="absolute right-2 top-1 text-gray-400 hover:text-gray-600 text-sm"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {/* Timeframe buttons */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200">
                        {[
                            { key: '7d', label: '7 Days' },
                            { key: '30d', label: '30 Days' },
                            { key: 'all', label: 'All Time' }
                        ].map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setTimeframe(opt.key)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                    timeframe === opt.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Reset Telemetry Button with Pale-Background Hover Explanation Box */}
                    <div className="relative group inline-block">
                        <button
                            onClick={handleResetTelemetry}
                            disabled={isResetting}
                            className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-medium transition-all flex items-center gap-1 shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            {isResetting ? 'Resetting...' : 'Reset Telemetry'}
                            <svg className="w-3 h-3 text-red-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>

                        {/* Interactive Tooltip Card on Hover: Pale background with dark text */}
                        <div className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-white text-gray-800 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 leading-relaxed border border-gray-300">
                            <div className="font-bold text-red-700 mb-1 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Reset Telemetry Explanation</span>
                            </div>
                            Permanently clears all recorded custodian upload sessions and filter rejection history, resetting counters to zero to begin a fresh tracking period.
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 space-y-4">
                {errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {isLoading && !rejectionsData ? (
                    <div className="py-16 flex flex-col items-center justify-center text-gray-500 space-y-2">
                        <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        <span className="text-sm">Loading telemetry records from middlelayer...</span>
                    </div>
                ) : null}

                {/* TAB 1: REJECTIONS */}
                {activeSubTab === 'rejections' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 pb-1 border-b border-gray-100">
                            <span>Showing <strong>{filteredRejections.length}</strong> rejected filter types ({rejectionsData?.total_rejections || 0} total dismissals)</span>
                            <span>Ranked by highest rejection frequency</span>
                        </div>

                        {filteredRejections.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                                No rejected filters recorded in the selected timeframe.
                            </div>
                        ) : (
                            filteredRejections.map(item => {
                                const isExpanded = expandedFilterIds.has(item.filter_id);
                                return (
                                    <div
                                        key={item.filter_id}
                                        className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                                    >
                                        {/* Card Top Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-white text-gray-800 border border-gray-300 font-semibold shadow-2xs">
                                                        {item.filter_id}
                                                    </span>
                                                    <h3 className="font-bold text-gray-900 text-sm">
                                                        {item.filter_label}
                                                    </h3>
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                        {item.rejection_count} {item.rejection_count === 1 ? 'rejection' : 'rejections'}
                                                    </span>
                                                </div>

                                                {/* Taxonomy Hierarchy Breadcrumb */}
                                                {item.filter_hierarchy && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-1.5 ml-1 mt-0.5">
                                                        <span className="font-medium text-gray-400">Hierarchy:</span>
                                                        <span className="text-indigo-800 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                            {item.filter_hierarchy}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => toggleExpand(item.filter_id)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                                                >
                                                    {isExpanded ? 'Hide Details' : 'View Datasets & Trigger Words'}
                                                    <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>

                                                <button
                                                    onClick={() => handleResetSingleFilter(item.filter_id, item.filter_label)}
                                                    className="text-xs text-rose-700 hover:text-rose-900 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs"
                                                >
                                                    <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    Reset Filter
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable Details */}
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 text-xs">
                                                {/* Affected Datasets */}
                                                <div>
                                                    <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                                        Rejected In ({item.dataset_names.length} datasets):
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {item.dataset_names.map((name, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => handleOpenDrawer(name, item)}
                                                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-gray-700 hover:text-rose-800 font-medium shadow-2xs transition-all cursor-pointer text-left"
                                                                title={`Inspect metadata & rule definition for ${name}`}
                                                            >
                                                                <span>{name}</span>
                                                                <svg className="w-3 h-3 opacity-40 group-hover:opacity-100 text-rose-600 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Triggering Reasons & Actual Highlighted Words */}
                                                <div>
                                                    <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                        Triggering Reasons & Actual Matched Words:
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {item.triggering_phrases.map((tp, idx) => (
                                                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 shadow-2xs">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <div className="text-gray-800">
                                                                        Trigger Word: <mark className="bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded border border-amber-300 font-mono">"{tp.phrase}"</mark> in <span className="font-mono text-indigo-700 font-semibold">{tp.field}</span>
                                                                    </div>
                                                                    <span className="text-gray-500 font-medium">
                                                                        Matched {tp.count} {tp.count === 1 ? 'time' : 'times'}
                                                                    </span>
                                                                </div>

                                                                {/* Snippet Contexts with Explicit Highlighting */}
                                                                {tp.sample_snippets && tp.sample_snippets.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        {tp.sample_snippets.map((snip, sIdx) => (
                                                                            <div key={sIdx} className="bg-gray-50 p-2.5 rounded-md text-gray-800 text-[11px] font-mono leading-relaxed border border-gray-200">
                                                                                {renderHighlightedSnippet(snip, tp.phrase)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* TAB 2: MANUAL ADDITIONS */}
                {activeSubTab === 'additions' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 pb-1 border-b border-gray-100">
                            <span>Showing <strong>{filteredAdditions.length}</strong> manually added filter tags ({additionsData?.total_manual_additions || 0} total additions)</span>
                            <span>Identifies filters custodians manually selected that the AI recommender missed</span>
                        </div>

                        {filteredAdditions.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                                No manually added filters recorded in the selected timeframe.
                            </div>
                        ) : (
                            filteredAdditions.map(item => (
                                <div
                                    key={item.filter_id}
                                    className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-white text-gray-800 border border-gray-300 font-semibold shadow-2xs">
                                                    {item.filter_id}
                                                </span>
                                                <h3 className="font-bold text-gray-900 text-sm">
                                                    {item.filter_label}
                                                </h3>
                                                {item.category && (
                                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                                                        {item.category}
                                                    </span>
                                                )}
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    Added {item.times_added} {item.times_added === 1 ? 'time' : 'times'}
                                                </span>
                                            </div>

                                            {/* Taxonomy Hierarchy */}
                                            {item.filter_hierarchy && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1.5 ml-1 mt-0.5">
                                                    <span className="font-medium text-gray-400">Hierarchy:</span>
                                                    <span className="text-indigo-800 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                        {item.filter_hierarchy}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => setDraftRuleItem(item)}
                                                className="text-xs text-indigo-700 hover:text-indigo-900 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-2xs"
                                                title="Draft a regex rule for filter_rules.json to automatically detect this filter"
                                            >
                                                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                                Draft Rule
                                            </button>

                                            <button
                                                onClick={() => handleResetSingleFilter(item.filter_id, item.filter_label)}
                                                className="text-xs text-rose-700 hover:text-rose-900 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs"
                                            >
                                                <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                Reset Filter
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                                        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            Added to datasets ({item.datasets.length}):
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.datasets.map((name, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleOpenDrawer(name, item)}
                                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-800 font-medium shadow-2xs transition-all cursor-pointer text-left"
                                                    title={`Inspect metadata & rule definition for ${name}`}
                                                >
                                                    <span>{name}</span>
                                                    <svg className="w-3 h-3 opacity-40 group-hover:opacity-100 text-indigo-600 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span>Active Endpoints:</span>
                    <code className="text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">
                        {MIDDLELAYER_URL}/filter-modifications/rejections
                    </code>
                    <code className="text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">
                        {MIDDLELAYER_URL}/filter-modifications/manual-additions
                    </code>
                </div>
                <span>Connected to Middlelayer (Port 8002)</span>
            </div>

            {/* ======================================================== */}
            {/* OPTION A & B: SLIDE-OUT RIGHT DATASET METADATA DRAWER    */}
            {/* ======================================================== */}
            {drawerState.isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity duration-300"
                        onClick={handleCloseDrawer}
                        aria-hidden="true"
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div 
                            className="w-screen max-w-xl bg-white shadow-2xl border-l border-gray-300 flex flex-col text-gray-900 transition-transform duration-300 ease-in-out"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="drawer-title"
                        >
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 id="drawer-title" className="text-lg font-bold text-gray-900 leading-snug">
                                            {drawerState.datasetName}
                                        </h3>
                                        {drawerState.datasetData?.datasetid && (
                                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-300 font-semibold shadow-2xs">
                                                {drawerState.datasetData.datasetid}
                                            </span>
                                        )}
                                    </div>
                                    {drawerState.filterContext && (
                                        <div className="text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-gray-400">Context Filter:</span>
                                            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                                                {drawerState.filterContext.filter_id}
                                            </span>
                                            <span className="font-semibold text-indigo-950">
                                                {drawerState.filterContext.filter_label}
                                            </span>
                                            {drawerState.filterContext.category && (
                                                <span className="text-gray-400">({drawerState.filterContext.category})</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Discrete Close Button */}
                                <button
                                    onClick={handleCloseDrawer}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none"
                                    aria-label="Close drawer"
                                    title="Close drawer (Esc)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            {/* Drawer Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                                {drawerState.loading ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-gray-500 space-y-2">
                                        <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        <span className="text-xs">Loading dataset metadata...</span>
                                    </div>
                                ) : drawerState.error ? (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                                        {drawerState.error}
                                    </div>
                                ) : drawerState.datasetData ? (
                                    <>
                                        {/* ======================================================== */}
                                        {/* RECOMMENDER RULE DEFINITION (CODE SNIPPET)              */}
                                        {/* ======================================================== */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                                    Recommender Rule Definition
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-300">
                                                        filter_rules.json
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                                Exact matching rule configuration and regex patterns defined in the recommendation engine for filter <span className="font-mono text-indigo-800 font-semibold">{drawerState.filterContext?.filter_id}</span> ({drawerState.filterContext?.filter_label}).
                                            </p>

                                            {/* Render Rule Snippet(s) */}
                                            {(() => {
                                                const ruleInfo = drawerState.datasetData?.rule_info;
                                                const matchedRules = ruleInfo?.matched_rules || [];
                                                const parentRule = ruleInfo?.parent_rule;

                                                if (matchedRules.length > 0) {
                                                    return (
                                                        <div className="space-y-3">
                                                            {matchedRules.map((m, idx) => {
                                                                const ruleJson = JSON.stringify(m.rule, null, 2);
                                                                return (
                                                                    <div key={idx} className="space-y-1.5">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                                                {m.rule.name || m.rule.matched_term || 'Rule'}
                                                                            </span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                                    {m.section}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleCopyRuleJson(ruleJson);
                                                                                        setDrawerRuleCopied(true);
                                                                                        setTimeout(() => setDrawerRuleCopied(false), 2000);
                                                                                    }}
                                                                                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                                                                >
                                                                                    {drawerRuleCopied ? (
                                                                                        <>
                                                                                            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                                                            <span className="text-emerald-700 font-semibold">Copied!</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                                                            <span>Copy JSON</span>
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <pre className="bg-white border border-gray-300 p-3 rounded-lg font-mono text-[11px] text-gray-900 leading-relaxed overflow-x-auto shadow-2xs select-all">
                                                                            {ruleJson}
                                                                        </pre>

                                                                        {m.rule.trigger_prefixes && (
                                                                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900 leading-relaxed flex items-start gap-1.5">
                                                                                <svg className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                                                <span>
                                                                                    <strong>Hierarchical Inheritance:</strong> Automatically triggered when any child filter with prefix <code className="bg-white px-1 py-0.2 rounded border border-blue-200 font-mono font-bold">{JSON.stringify(m.rule.trigger_prefixes)}</code> is detected in the dataset.
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                if (parentRule) {
                                                    const parentJson = JSON.stringify(parentRule.rule, null, 2);
                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
                                                                Inherited from parent category <strong className="font-mono">{parentRule.parent_id}</strong> ({parentRule.rule.name || parentRule.rule.matched_term}):
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-semibold text-gray-800">{parentRule.rule.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleCopyRuleJson(parentJson);
                                                                        setDrawerRuleCopied(true);
                                                                        setTimeout(() => setDrawerRuleCopied(false), 2000);
                                                                    }}
                                                                    className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    {drawerRuleCopied ? 'Copied!' : 'Copy JSON'}
                                                                </button>
                                                            </div>
                                                            <pre className="bg-white border border-gray-300 p-3 rounded-lg font-mono text-[11px] text-gray-900 leading-relaxed overflow-x-auto shadow-2xs select-all">
                                                                {parentJson}
                                                            </pre>
                                                        </div>
                                                    );
                                                }

                                                // No rule currently in filter_rules.json (manual addition / AI blind spot)
                                                const draftJson = generateDraftRuleJson(drawerState.filterContext);
                                                return (
                                                    <div className="space-y-2.5">
                                                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed flex items-center justify-between gap-2">
                                                            <span>No automated rule currently exists in <code className="font-bold">filter_rules.json</code> for this filter (AI Blind Spot).</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleCopyRuleJson(draftJson);
                                                                    setDrawerRuleCopied(true);
                                                                    setTimeout(() => setDrawerRuleCopied(false), 2000);
                                                                }}
                                                                className="text-xs px-2.5 py-1 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold shrink-0 shadow-2xs transition-all cursor-pointer"
                                                            >
                                                                {drawerRuleCopied ? 'Copied!' : 'Copy Proposed Rule JSON'}
                                                            </button>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                            Proposed Rule Definition:
                                                        </div>
                                                        <pre className="bg-white border border-gray-300 p-3 rounded-lg font-mono text-[11px] text-gray-900 leading-relaxed overflow-x-auto shadow-2xs select-all">
                                                            {draftJson}
                                                        </pre>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Metadata Attributes */}
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Lead Researcher</div>
                                                <div className="font-semibold text-gray-800">{drawerState.datasetData.lead_researcher || 'Not specified'}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Institute</div>
                                                <div className="font-semibold text-gray-800">{drawerState.datasetData.lead_institute || 'Not specified'}</div>
                                            </div>
                                        </div>

                                        {/* Access Rights */}
                                        {drawerState.datasetData.access_rights && (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Access Governance</div>
                                                <div className="text-gray-700 leading-relaxed">{drawerState.datasetData.access_rights}</div>
                                            </div>
                                        )}

                                        {/* Active Assigned Filters */}
                                        <div>
                                            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                Assigned Filters ({drawerState.datasetData.filters.length}):
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                {drawerState.datasetData.filters.map((f, fIdx) => {
                                                    const fid = typeof f === 'object' ? f.id : f;
                                                    const flabel = typeof f === 'object' ? (f.label || f.name || f.id) : f;
                                                    const isTarget = drawerState.filterContext && String(drawerState.filterContext.filter_id) === String(fid);

                                                    let badgeColor = 'bg-white text-gray-800 border-gray-300';
                                                    if (fid.startsWith('0_0')) badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                                                    else if (fid.startsWith('0_1')) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                                                    else if (fid.startsWith('0_2')) badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';

                                                    return (
                                                        <span
                                                            key={fIdx}
                                                            className={`text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${badgeColor} ${isTarget ? 'ring-2 ring-indigo-500 font-bold' : ''}`}
                                                        >
                                                            <span className="font-mono text-[10px] opacity-75">{fid}</span>
                                                            <span>{flabel}</span>
                                                            {isTarget && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Abstract */}
                                        {drawerState.datasetData.abstract && (
                                            <div>
                                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Abstract</div>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                    {drawerState.datasetData.abstract}
                                                </div>
                                            </div>
                                        )}

                                        {/* Documentation Description */}
                                        {drawerState.datasetData.description && (
                                            <div>
                                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Documentation Description</div>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                    {drawerState.datasetData.description}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                {drawerState.datasetData?.id ? (
                                    <a
                                        href={`/src/meta.html?id=${drawerState.datasetData.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 hover:underline"
                                    >
                                        <span>Open Full Dataset Record</span>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>
                                ) : <div />}

                                <button
                                    type="button"
                                    onClick={handleCloseDrawer}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Close Panel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* OPTION C: DRAFT RECOMMENDER RULE MODAL                   */}
            {/* ======================================================== */}
            {draftRuleItem && (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
                        onClick={() => setDraftRuleItem(null)}
                        aria-hidden="true"
                    />

                    {/* Modal Card */}
                    <div 
                        className="relative bg-white rounded-xl shadow-2xl border border-gray-300 max-w-2xl w-full p-6 text-gray-900 space-y-4 z-10"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                    Draft Recommender Rule
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Incorporate filter <strong>{draftRuleItem.filter_label}</strong> ({draftRuleItem.filter_id}) into the automated filter recommendation engine.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setDraftRuleItem(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                aria-label="Close modal"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        {/* JSON Rule Snippet */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-700">Generated Rule Snippet:</span>
                                <span className="text-[11px] text-gray-500 font-mono">filter_rules.json</span>
                            </div>

                            <div className="relative">
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-gray-800">
                                    {generateDraftRuleJson(draftRuleItem, draftRuleItem.customKeyword)}
                                </pre>

                                <button
                                    type="button"
                                    onClick={() => handleCopyRuleJson(generateDraftRuleJson(draftRuleItem, draftRuleItem.customKeyword))}
                                    className="absolute top-3 right-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copiedRuleJson ? (
                                        <>
                                            <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                                            <span>Copy Rule JSON</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Integration Guide Note */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>
                                <span className="font-bold">How to apply:</span> Copy the snippet above and paste it into <code className="bg-amber-100 text-amber-950 font-bold px-1.5 py-0.5 rounded font-mono text-[11px]">basic/basic_backend/helpers/filter_rules.json</code> under the appropriate section. The recommender engine will immediately begin detecting this filter across new custodian uploads.
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setDraftRuleItem(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FilterTelemetryTab;
