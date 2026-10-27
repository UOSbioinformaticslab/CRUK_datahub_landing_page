import React, { useState, useEffect, useCallback } from 'react';

const MIDDLELAYER_URL = (import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002").replace(/\/+$/, '');

const AdminAnalyticsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('rejections'); // 'rejections' | 'additions'
    const [timeframe, setTimeframe] = useState('30d'); // '7d' | '30d' | 'all'
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [rejectionsData, setRejectionsData] = useState(null);
    const [additionsData, setAdditionsData] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [expandedFilterIds, setExpandedFilterIds] = useState(new Set());
    const [isResetting, setIsResetting] = useState(false);

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
            setErrorMessage(err.message || 'Could not connect to middlelayer analytics endpoint.');
        } finally {
            setIsLoading(false);
        }
    }, [getSinceDate]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Keyboard escape listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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
        if (!window.confirm('Are you sure you want to reset all telemetry data in middlelayer.db? This clears all recorded upload sessions and rejection events.')) {
            return;
        }

        setIsResetting(true);
        try {
            const res = await fetch(`${MIDDLELAYER_URL}/filter-modifications/reset`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Reset failed');
            await fetchData();
            alert('Telemetry database reset successfully.');
        } catch (err) {
            alert(`Error resetting telemetry: ${err.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    if (!isOpen) return null;

    const filteredRejections = (rejectionsData?.filters || []).filter(f => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            f.filter_id.toLowerCase().includes(q) ||
            f.filter_label.toLowerCase().includes(q) ||
            (f.dataset_names || []).some(d => d.toLowerCase().includes(q))
        );
    });

    const filteredAdditions = (additionsData?.filters || []).filter(f => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            f.filter_id.toLowerCase().includes(q) ||
            f.filter_label.toLowerCase().includes(q) ||
            (f.category && f.category.toLowerCase().includes(q)) ||
            (f.datasets || []).some(d => d.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                Filter Modification Telemetry & Recommender Feedback
                                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                                    Admin Only
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Inspect why custodians rejected suggested filters and discover missing taxonomy items.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800"
                            title="Refresh Data"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800"
                            title="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Subheader: Tabs & Filters */}
                <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Navigation Tabs */}
                    <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setActiveTab('rejections')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                                activeTab === 'rejections'
                                    ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Rejected Filters
                            {rejectionsData && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-900/60 text-rose-300">
                                    {rejectionsData.total_rejections}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('additions')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                                activeTab === 'additions'
                                    ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Manual Additions (AI Blind Spots)
                            {additionsData && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-900/60 text-emerald-300">
                                    {additionsData.total_manual_additions}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Timeframe & Search Controls */}
                    <div className="flex items-center space-x-2">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search filters or datasets..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
                            />
                            {searchFilter && (
                                <button
                                    onClick={() => setSearchFilter('')}
                                    className="absolute right-2 top-1 text-slate-500 hover:text-slate-300"
                                >
                                    &times;
                                </button>
                            )}
                        </div>

                        {/* Timeframe selector */}
                        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                            {[
                                { key: '7d', label: '7 Days' },
                                { key: '30d', label: '30 Days' },
                                { key: 'all', label: 'All Time' }
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setTimeframe(opt.key)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                        timeframe === opt.key
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Reset Test Telemetry Button */}
                        <button
                            onClick={handleResetTelemetry}
                            disabled={isResetting}
                            className="px-2.5 py-1 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-950/40 text-[11px] font-medium transition-all"
                            title="Clear test telemetry sessions"
                        >
                            {isResetting ? 'Resetting...' : 'Reset Telemetry'}
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {errorMessage && (
                        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {isLoading && !rejectionsData ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span className="text-xs">Loading analytics data...</span>
                        </div>
                    ) : null}

                    {/* TAB 1: REJECTIONS */}
                    {activeTab === 'rejections' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                                <span>Showing <strong>{filteredRejections.length}</strong> rejected filter types ({rejectionsData?.total_rejections || 0} total dismissals)</span>
                                <span>Sorted by highest rejection frequency</span>
                            </div>

                            {filteredRejections.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                                    No rejected filters recorded in the selected timeframe.
                                </div>
                            ) : (
                                filteredRejections.map(item => {
                                    const isExpanded = expandedFilterIds.has(item.filter_id);
                                    return (
                                        <div
                                            key={item.filter_id}
                                            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700"
                                        >
                                            {/* Summary Row */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                        {item.filter_id}
                                                    </span>
                                                    <h3 className="font-semibold text-white text-sm">
                                                        {item.filter_label}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/50">
                                                        {item.rejection_count} {item.rejection_count === 1 ? 'rejection' : 'rejections'}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => toggleExpand(item.filter_id)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                                >
                                                    {isExpanded ? 'Hide Details' : 'View Datasets & Triggering Phrases'}
                                                    <svg className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>
                                            </div>

                                            {/* Expandable Details */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs">
                                                    {/* Affected Datasets */}
                                                    <div>
                                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                            Rejected In ({item.dataset_names.length} datasets):
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.dataset_names.map((name, i) => (
                                                                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Triggering Evidence */}
                                                    <div>
                                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                            Triggering Reasons & Algorithmic Matches:
                                                        </div>
                                                        <div className="space-y-2">
                                                            {item.triggering_phrases.map((tp, idx) => (
                                                                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-slate-200">
                                                                            Trigger: <strong className="text-amber-300 font-mono">"{tp.phrase}"</strong> in <span className="font-mono text-indigo-300">{tp.field}</span>
                                                                        </span>
                                                                        <span className="text-slate-400 text-[11px]">
                                                                            Matched {tp.count} {tp.count === 1 ? 'time' : 'times'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Snippet Contexts */}
                                                                    {tp.sample_snippets && tp.sample_snippets.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            {tp.sample_snippets.map((snip, sIdx) => (
                                                                                <div key={sIdx} className="bg-slate-950 p-2 rounded text-slate-300 text-[11px] font-mono leading-relaxed border border-slate-800/60">
                                                                                    {snip}
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
                    {activeTab === 'additions' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                                <span>Showing <strong>{filteredAdditions.length}</strong> manually added filter tags ({additionsData?.total_manual_additions || 0} total additions)</span>
                                <span>Identifies AI recommender blind spots</span>
                            </div>

                            {filteredAdditions.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                                    No manually added filters recorded in the selected timeframe.
                                </div>
                            ) : (
                                filteredAdditions.map(item => (
                                    <div
                                        key={item.filter_id}
                                        className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                    {item.filter_id}
                                                </span>
                                                <h3 className="font-semibold text-white text-sm">
                                                    {item.filter_label}
                                                </h3>
                                                {item.category && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                                        {item.category}
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                                    Added {item.times_added} {item.times_added === 1 ? 'time' : 'times'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs">
                                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Added to datasets:
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.datasets.map((name, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                                        {name}
                                                    </span>
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
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>API endpoints:</span>
                        <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            /filter-modifications/rejections
                        </code>
                        <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            /filter-modifications/manual-additions
                        </code>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AdminAnalyticsModal;
