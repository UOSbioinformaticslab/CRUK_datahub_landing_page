import React, { useState } from 'react';
import { getCategoryBadgeClass } from '../utils/filterRecommenderUtils';

/**
 * ProposedFilterArea
 * Displays automatically recommended datasetFilters as evidence cards.
 * Underneath each proposed filter, the justificatory material is presented:
 *  - Filter label & Category (e.g. C50 Breast)
 *  - Derived from: source field (e.g. summary.title) and verbatim text snippet
 *  - Term occurrences: Total instances of term in metadata
 *  - Expand Context toggle: Read wider surrounding context without truncation
 *  - Multi-instance browser: View all instances across the dataset with matched keywords highlighted
 *  - Clinical rule rationale (if applicable, e.g. ICD-O mapping)
 *  - Quick Accept (✓) and Dismiss (✕) buttons
 *
 * NOTE: Evidence exists strictly in-memory and is never persisted to the database.
 */
export const ProposedFilterArea = ({
    suggestions = [],
    title = "Recommended Filters",
    onAccept,
    onDismiss,
    onAcceptAll,
    onDismissAll,
    compact = false
}) => {
    const [expandedContextIds, setExpandedContextIds] = useState(new Set());
    const [expandedInstancesIds, setExpandedInstancesIds] = useState(new Set());

    if (!suggestions || suggestions.length === 0) return null;

    const toggleContext = (id) => {
        setExpandedContextIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleInstances = (id) => {
        setExpandedInstancesIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderHighlightedSnippet = (snippetText, highlightWord) => {
        if (!snippetText) return null;
        if (!highlightWord) return snippetText;
        try {
            const escaped = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = snippetText.split(new RegExp(`(${escaped})`, 'gi'));
            return parts.map((part, i) =>
                part.toLowerCase() === highlightWord.toLowerCase() ? (
                    <mark key={i} className="bg-amber-200/90 text-amber-950 font-bold px-1 py-0.5 rounded not-italic shadow-xs">
                        {part}
                    </mark>
                ) : (
                    part
                )
            );
        } catch {
            return snippetText;
        }
    };

    return (
        <div className={`rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-violet-50/60 shadow-sm transition-all ${compact ? 'p-3' : 'p-4 mb-6'}`}>
            {/* Header with Title & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-200/80">
                <div className="flex items-center space-x-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-inner">
                        ✨
                    </span>
                    <div>
                        <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                            {title}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-300">
                                {suggestions.length}
                            </span>
                        </h3>
                        {!compact && (
                            <p className="text-xs text-amber-800/80 mt-0.5">
                                Automatically extracted with verbatim evidence from your metadata. Review justifications and accept or dismiss.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {onAcceptAll && (
                        <button
                            type="button"
                            onClick={onAcceptAll}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow transition-all active:scale-95"
                            title="Accept all recommended filters"
                        >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Accept All
                        </button>
                    )}
                    {onDismissAll && (
                        <button
                            type="button"
                            onClick={onDismissAll}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50/80 border border-slate-300 hover:border-red-300 transition-all active:scale-95"
                            title="Dismiss all recommendations"
                        >
                            Dismiss All
                        </button>
                    )}
                </div>
            </div>

            {/* Cards Grid */}
            <div className={`pt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {suggestions.map(item => {
                    const evidence = item.evidence;
                    const categoryLabel = item.category || (item.primaryGroup === 'cancer-type' ? 'Cancer' : item.primaryGroup === 'data-type' ? 'Data' : 'Access');
                    const badgeClass = getCategoryBadgeClass(categoryLabel, item.primaryGroup);
                    const isContextExpanded = expandedContextIds.has(item.id);
                    const isInstancesExpanded = expandedInstancesIds.has(item.id);

                    return (
                        <div
                            key={item.id}
                            className="flex flex-col justify-between rounded-xl border border-amber-200/90 bg-white/95 p-3.5 shadow-sm hover:shadow-md hover:border-amber-400 transition-all"
                        >
                            {/* Card Top: Category Badge, Label & Actions */}
                            <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                                        {categoryLabel}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 leading-tight">
                                        {item.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {/* Accept Button */}
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 shadow-xs transition-all active:scale-95"
                                        onClick={() => onAccept && onAccept(item.id)}
                                        title={`Accept ${item.label}`}
                                        aria-label={`Accept ${item.label}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Accept</span>
                                    </button>

                                    {/* Dismiss Button */}
                                    <button
                                        type="button"
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                                        onClick={() => onDismiss && onDismiss(item.id)}
                                        title={`Dismiss ${item.label}`}
                                        aria-label={`Dismiss ${item.label}`}
                                    >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Card Body: Justificatory Evidence */}
                            {evidence ? (
                                <div className="space-y-2 text-xs text-slate-600">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                                derived from
                                            </span>
                                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100">
                                                {evidence.sourceField}
                                            </span>
                                        </div>

                                        {/* Expand / Collapse Snippet Context */}
                                        {evidence.expandedSnippet && evidence.expandedSnippet !== evidence.snippet && (
                                            <button
                                                type="button"
                                                onClick={() => toggleContext(item.id)}
                                                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                                            >
                                                {isContextExpanded ? 'Collapse context ▴' : 'Expand context ▾'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Snippet box with term highlighted */}
                                    <div className="bg-slate-50/90 rounded-lg p-2.5 border border-slate-200/80 font-serif italic text-slate-700 text-[11px] leading-relaxed transition-all">
                                        &ldquo;
                                        {renderHighlightedSnippet(
                                            isContextExpanded ? evidence.expandedSnippet : evidence.snippet,
                                            evidence.allInstances?.[0]?.matchedText || evidence.matchedTerm
                                        )}
                                        &rdquo;
                                    </div>

                                    {/* Instances count & Toggle All Instances */}
                                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-0.5 border-t border-slate-100">
                                        <span>
                                            total instances of <strong className="text-slate-800 font-semibold">{evidence.matchedTerm || item.label}</strong> = <strong className="text-indigo-900 font-bold">{evidence.instancesInMetadata}</strong>
                                        </span>

                                        {evidence.allInstances && evidence.allInstances.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleInstances(item.id)}
                                                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded text-[11px] transition-colors border border-indigo-200/50"
                                            >
                                                <span>{isInstancesExpanded ? 'Hide other instances ▴' : `View all ${evidence.allInstances.length} instances ▾`}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Expandable All Instances List */}
                                    {isInstancesExpanded && evidence.allInstances && (
                                        <div className="mt-2 space-y-2 pt-2 border-t border-amber-200/70">
                                            <p className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                                <span>All {evidence.allInstances.length} occurrences in metadata:</span>
                                            </p>
                                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                                {evidence.allInstances.map((inst, idx) => (
                                                    <div key={idx} className="bg-white rounded-lg p-2 border border-slate-200/80 text-[11px] shadow-xs">
                                                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
                                                            <span className="font-semibold text-slate-500 text-[10px]">
                                                                Instance #{idx + 1} &bull; <span className="font-mono text-indigo-700">{inst.sourceField}</span>
                                                            </span>
                                                            {inst.matchedText && (
                                                                <span className="text-[10px] text-slate-500">
                                                                    matched: <span className="font-bold text-amber-900 bg-amber-100/80 px-1 py-0.2 rounded">{inst.matchedText}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-serif italic text-slate-700 text-[10.5px] leading-relaxed">
                                                            &ldquo;{renderHighlightedSnippet(inst.snippet, inst.matchedText)}&rdquo;
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Clinical Rationale Box */}
                                    {evidence.ruleRationale && (
                                        <div className="text-[10px] text-amber-900/90 bg-amber-50/70 rounded px-2 py-1 border border-amber-200/60 flex items-start gap-1">
                                            <span className="flex-shrink-0 text-amber-600 font-bold">ℹ</span>
                                            <span>{evidence.ruleRationale}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">
                                    {item.description || 'Recommended based on study metadata analysis.'}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProposedFilterArea;
