import React, { useEffect, useState } from 'react';

const ANALYSIS_STEPS = [
    { id: 1, label: "Scanning title, abstract, and study documentation...", duration: 600 },
    { id: 2, label: "Matching ICD-O-3 topographies (primary site) & optional histology morphology...", duration: 800 },
    { id: 3, label: "Classifying data type modalities & technologies...", duration: 700 },
    { id: 4, label: "Extracting governance & data access criteria...", duration: 600 },
    { id: 5, label: "Cross-referencing CRUK & TCGA vocabulary mappings...", duration: 500 }
];

/**
 * FilterRecommendationModal
 * Handles user prompts and multi-step progress tracking for automated filter recommendations.
 */
export const FilterRecommendationModal = ({
    isOpen,
    mode = 'prompt', // 'prompt' | 'scanning' | 'complete' | 'error'
    missingCategories = [],
    onProceedScan,
    onSkipToSave,
    onClose,
    errorMessage = ''
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);

    // Timer & Step simulation while in 'scanning' mode
    useEffect(() => {
        if (!isOpen || mode !== 'scanning') {
            setCurrentStepIndex(0);
            setElapsedMs(0);
            return;
        }

        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setElapsedMs(elapsed);

            // Dynamically advance steps based on elapsed time
            let accumulated = 0;
            let targetIndex = 0;
            for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
                accumulated += ANALYSIS_STEPS[i].duration;
                if (elapsed >= accumulated) {
                    targetIndex = Math.min(i + 1, ANALYSIS_STEPS.length - 1);
                } else {
                    break;
                }
            }
            setCurrentStepIndex(targetIndex);
        }, 80);

        return () => clearInterval(timer);
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
    const progressPercent = mode === 'complete' 
        ? 100 
        : Math.min(95, Math.round(((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100));

    return (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transform transition-all">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900/50">
                    <div className="flex items-center space-x-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300 text-sm">
                            ✨
                        </span>
                        <h2 className="text-base font-bold tracking-tight">
                            {mode === 'prompt' ? 'Dataset Filters Check' : 'Automated Filter Recommendation'}
                        </h2>
                    </div>
                    {mode !== 'scanning' && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white text-lg leading-none transition-colors p-1"
                            aria-label="Close"
                        >
                            &times;
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-6">
                    {/* MODE 1: PROMPT USER (when categories are already present) */}
                    {mode === 'prompt' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-xs leading-relaxed flex items-start gap-3">
                                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="font-bold text-sm text-emerald-900 mb-0.5">Filter Categories Populated</p>
                                    <p>Your dataset already has tags covering cancer type, data type, and accessibility.</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-700 leading-relaxed">
                                Would you like to scan your title, abstract, and study documentation to discover <strong>additional matching filter suggestions</strong> before saving?
                            </p>

                            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onSkipToSave}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    No, Save Draft Directly
                                </button>
                                <button
                                    type="button"
                                    onClick={onProceedScan}
                                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                                >
                                    <span>✨</span>
                                    <span>Yes, Scan & Recommend Filters</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MODE 2: SCANNING IN PROGRESS */}
                    {mode === 'scanning' && (
                        <div className="space-y-5">
                            {missingCategories.length > 0 && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                                    <span className="font-bold">Missing required categories: </span>
                                    {missingCategories.join(', ')}.
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                                    <span>Analyzing Metadata...</span>
                                    <span className="font-mono text-indigo-600 font-bold">{elapsedSeconds}s</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all duration-200 rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Multi-step progress list */}
                            <div className="space-y-2.5 pt-1">
                                {ANALYSIS_STEPS.map((step, idx) => {
                                    const isDone = idx < currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    return (
                                        <div
                                            key={step.id}
                                            className={`flex items-center gap-3 text-xs transition-all ${
                                                isCurrent 
                                                    ? 'text-indigo-950 font-bold translate-x-1' 
                                                    : isDone 
                                                        ? 'text-slate-500' 
                                                        : 'text-slate-400 opacity-60'
                                            }`}
                                        >
                                            <div className="flex-shrink-0">
                                                {isDone ? (
                                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                ) : isCurrent ? (
                                                    <span className="flex h-4 w-4 items-center justify-center">
                                                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    </span>
                                                ) : (
                                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-[10px]">
                                                        {idx + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="leading-tight">{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-[11px] text-slate-400 text-center italic pt-2">
                                Deep ontology matching in progress. Please allow a few seconds...
                            </p>
                        </div>
                    )}

                    {/* MODE 3: ERROR STATE */}
                    {mode === 'error' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs">
                                <p className="font-bold text-sm text-rose-800 mb-1">Recommendation Failed</p>
                                <p>{errorMessage || 'Unable to scan metadata at this time. You can still save your draft.'}</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onSkipToSave}
                                    className="px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Proceed to Save Draft
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterRecommendationModal;
