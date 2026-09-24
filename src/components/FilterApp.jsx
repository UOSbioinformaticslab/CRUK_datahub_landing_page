import { DatasetsSection } from './DatasetsSection.jsx';
import { filterDetailsMap, filterData } from '../utils/filter-setup.js';
import { filterType, includeParents, plusParents, getMessage, calculateLogicTokens
} from '../utils/logic-utils.js';
import { executeFilterLogic } from '../utils/filterLogic.js';
import React from 'react'; // React is now imported from node_modules
import "../styles/style.css"

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
// --- UTILITY FUNCTIONS FOR LOGIC MESSAGE CALCULATION ---


// --- ALL REACT COMPONENTS FROM knockdown.html START HERE ---
const { useState, useMemo, useCallback, useEffect } = React;

// Utility component for nested filters with toggle
const NestedFilterList = ({ items, handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys, level = 0 }) => {
    if (!items || items.length === 0) return null;
    const itemsArray = Array.isArray(items) ? items : Object.values(items);

    return (
        <div className="nested-list space-y-1">
            {itemsArray.map(item => (
                <NestedFilterItem
                    key={item.id}
                    item={item}
                    handleFilterChange={handleFilterChange}
                    selectedFilters={selectedFilters}
                    expandedKeys={expandedKeys}
                    setExpandedKeys={setExpandedKeys}
                    level={level}
                />
            ))}
        </div>
    );
};
// Component for a single filter item
const NestedFilterItem = ({ item, handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys, level }) => {
    const fullId = item.id;
    const childrenArray = item.children ? Object.values(item.children) : [];
    const hasChildren = childrenArray.length > 0;
    const isChecked = selectedFilters.has(fullId);

    // Check if description exists
    const hasDescription = item.description && item.description.trim().length > 0;

    const [localExpanded, setLocalExpanded] = useState(false);
    const isExpanded = localExpanded || (expandedKeys && expandedKeys.has(fullId));

    const toggleExpansion = (e) => {
        e.preventDefault();
        if (setExpandedKeys) {
            setExpandedKeys(prev => {
                const next = new Set(prev);
                if (next.has(fullId)) next.delete(fullId);
                else next.add(fullId);
                return next;
            });
        }
        setLocalExpanded(prev => !prev);
    };

    const rowIndentStyle = {
        paddingLeft: level > 0 ? `${level * 1.25}rem` : '0',
    };

    const details = filterDetailsMap.get(fullId) || {};
    const primaryGroup = details.group;


    return (
        <div className="flex flex-col">
            <div
                className="flex items-center group hover:var(--cruk-pink) p-1 -m-1 rounded transition duration-100"
                style={rowIndentStyle}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        id={`expand-${fullId}`}
                        className={`transition-transform duration-200 w-4 h-4 flex items-center justify-center text-gray-500 hover:var(--cruk-pink)  mr-1 ${isExpanded ? 'rotate-90' : ''}`}
                        onClick={toggleExpansion}
                        aria-expanded={isExpanded}
                    >
                        {/* Chevron Right Icon */}
                        <svg
                            className="w-3 h-3 transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                ) : (
                    <span className="w-4 h-4 mr-1"></span>
                )}

                <input
                    type="checkbox"
                    id={fullId}
                    className="rounded text-[var(--cruk-pink)] border-gray-300 focus:ring-[var(--cruk-pink)] mr-2 w-4 h-4 cursor-pointer"
                    data-filter-group={primaryGroup}
                    checked={isChecked}
                    onChange={() => handleFilterChange(fullId)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFilterChange(fullId);
                        }
                    }}
                />

                {/* FIX 2: Applied 'relative' and 'hover:z-20' here instead.
                   This ensures the label (and tooltip) sits on top of the next row
                   without messing up the layout of the current row.
                */}
                <div className="relative flex-grow flex items-center group/tooltip hover:z-20">
                    <label
                        htmlFor={fullId}
                        className="text-gray-700 select-none flex-grow cursor-pointer text-sm flex items-center"
                    >
                        {item.label}
                        {/* <span className="text-xs text-gray-500 ml-1">({item.count})</span> */}

                        {hasDescription && (
                            <svg className="w-3 h-3 ml-1 text-gray-400 opacity-50 group-hover/tooltip:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        )}
                    </label>

                    {/* TOOLTIP POPUP */}
                    {hasDescription && (
                        /* FIX 3: Changed to 'top-full' (Below) and added 'mt-1'.
                           This lowers the tooltip so it doesn't clip off the top filter.
                        */
                        <div className="absolute top-full left-4 mt-1 hidden group-hover/tooltip:block w-64 p-2 bg-[var(--cruk-blue)] text-white text-xs rounded shadow-xl cursor-auto whitespace-normal">
                            {item.description}

                            {/* Arrow pointing UP (Attached to top of tooltip) */}
                            <div className="absolute bottom-full left-4 -mb-px border-4 border-transparent border-b-[var(--cruk-blue)]"></div>
                        </div>
                    )}
                </div>
            </div>
            {hasChildren && isExpanded && (
                <NestedFilterList
                    items={childrenArray}
                    handleFilterChange={handleFilterChange}
                    selectedFilters={selectedFilters}
                    expandedKeys={expandedKeys}
                    setExpandedKeys={setExpandedKeys}
                    level={level + 1}
                />
            )}
        </div>
    );
};

// NEW COMPONENT: Interactive Token Builder UI
const FilterLogicBuilder = ({
    selectedFilters,
    logicTokens,
    setLogicTokens,
    isMessageManuallyEdited,
    setIsMessageManuallyEdited,
    logicError
}) => {
    const [focusedIndex, setFocusedIndex] = React.useState(null);
    const [selectedTokenIndices, setSelectedTokenIndices] = React.useState([]);

    const handleReset = useCallback(() => {
        const filters = Array.from(selectedFilters);
        const autoTokens = calculateLogicTokens(filters);
        setLogicTokens(autoTokens);
        setIsMessageManuallyEdited(false);
        setSelectedTokenIndices([]);
    }, [selectedFilters, setLogicTokens, setIsMessageManuallyEdited]);

    if (!selectedFilters || selectedFilters.size === 0) {
        return null;
    }

    const toggleOperator = (index) => {
        const newTokens = [...logicTokens];
        if (newTokens[index].type === 'operator') {
            newTokens[index].value = newTokens[index].value === 'AND' ? 'OR' : 'AND';
            setLogicTokens(newTokens);
            setIsMessageManuallyEdited(true);
        }
    };

    const removeToken = (index) => {
        const newTokens = [...logicTokens];
        newTokens.splice(index, 1);
        setLogicTokens(newTokens);
        setIsMessageManuallyEdited(true);
        setSelectedTokenIndices([]);
        if (focusedIndex === index) setFocusedIndex(null);
    };

    const toggleTokenSelection = (index) => {
        setSelectedTokenIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
        );
    };

    const handleWrapSelectedInBrackets = () => {
        if (selectedTokenIndices.length === 0) return;
        const minIdx = Math.min(...selectedTokenIndices);
        const maxIdx = Math.max(...selectedTokenIndices);

        const newTokens = [...logicTokens];
        newTokens.splice(maxIdx + 1, 0, { type: 'bracket', value: ')', keyId: `b_close_${Date.now()}_${Math.random()}` });
        newTokens.splice(minIdx, 0, { type: 'bracket', value: '(', keyId: `b_open_${Date.now()}_${Math.random()}` });

        setLogicTokens(newTokens);
        setIsMessageManuallyEdited(true);
        setSelectedTokenIndices([]);
    };

    const handleKeyDown = (e, index, token) => {
        if ((e.metaKey && e.key === 'Enter') || e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            removeToken(index);
        } else if (token.type === 'operator' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleOperator(index);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextEl = document.getElementById(`token-${index + 1}`);
            if (nextEl) nextEl.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevEl = document.getElementById(`token-${index - 1}`);
            if (prevEl) prevEl.focus();
        }
    };

    return (
        <div className="p-1 mt-2 border-t border-gray-200">
            <div className="flex flex-wrap items-center space-x-3 gap-y-2 mb-2">
                {isMessageManuallyEdited && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs text-white bg-blue-600 hover:bg-blue-700 transition duration-150 font-bold py-1.5 px-4 rounded shadow-md whitespace-nowrap"
                    >
                        Reset to Auto Logic
                    </button>
                )}
                {selectedTokenIndices.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={handleWrapSelectedInBrackets}
                            className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition duration-150 font-bold py-1.5 px-4 rounded shadow-md whitespace-nowrap"
                        >
                            Bracket
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTokenIndices([])}
                            className="text-xs text-gray-600 hover:text-gray-900 underline font-medium"
                        >
                            Clear Selection
                        </button>
                    </div>
                )}
                <p className="text-sm text-gray-700 font-semibold">
                    Default logic shown below. You can toggle AND/OR or bracket groups by clicking the filters to be bracketed and then pressing the Bracket Button that appears.
                </p>
            </div>

            <div 
                className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-300 rounded min-h-[60px]"
                role="toolbar"
                aria-label="Filter Logic Builder"
            >
                {(() => {
                    let andOpCount = 0;
                    return logicTokens && logicTokens.map((token, idx) => {
                    const isSelected = selectedTokenIndices.includes(idx);
                    if (token.type === 'filter') {
                        return (
                            <div
                                key={token.keyId || idx}
                                id={`token-${idx}`}
                                tabIndex={0}
                                role="group"
                                aria-label={`Filter token: ${token.label}. Press Backspace, Delete, or Cmd+Enter to remove.`}
                                className={`inline-flex items-center px-2 py-1 text-xs rounded border transition-all cursor-pointer ${
                                    isSelected 
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-500 font-bold'
                                        : 'bg-blue-100 text-blue-800 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                }`}
                                onKeyDown={(e) => handleKeyDown(e, idx, token)}
                                onFocus={() => setFocusedIndex(idx)}
                                onClick={() => toggleTokenSelection(idx)}
                            >
                                <span className="mr-1">{token.label}</span>
                                <button 
                                    type="button"
                                    className="ml-1 text-blue-400 hover:text-blue-700 font-bold p-0.5 rounded"
                                    onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
                                    aria-label={`Remove filter ${token.label}`}
                                >✕</button>
                            </div>
                        );
                    } else if (token.type === 'operator') {
                        if (token.value === 'AND') andOpCount++;
                        const isTargetSecondAnd = token.value === 'AND' && andOpCount === 2;
                        return (
                            <div
                                key={token.keyId || idx}
                                id={`token-${idx}`}
                                tabIndex={0}
                                role="group"
                                aria-label={`Operator token: ${token.value}. Press Enter to toggle AND/OR, or Backspace/Delete/Cmd+Enter to remove.`}
                                className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                                    isSelected ? 'ring-2 ring-emerald-500 border-emerald-400' : 'focus:outline-none focus:ring-2 focus:ring-orange-500'
                                } ${
                                    token.value === 'AND' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                                onFocus={() => setFocusedIndex(idx)}
                                onKeyDown={(e) => handleKeyDown(e, idx, token)}
                                onClick={() => toggleTokenSelection(idx)}
                            >
                                <button 
                                    type="button"
                                    data-tour={isTargetSecondAnd ? "operator-toggle-second-and" : undefined}
                                    className="hover:underline font-bold px-1 py-0.5 rounded bg-white/40 hover:bg-white/80 transition"
                                    onClick={(e) => { e.stopPropagation(); toggleOperator(idx); }}
                                    title="Click text to toggle AND/OR"
                                    aria-label={`Toggle operator ${token.value}`}
                                >
                                    {token.value}
                                </button>
                                <button 
                                    type="button"
                                    className={`ml-2 font-bold ${token.value === 'AND' ? 'text-orange-400 hover:text-orange-600' : 'text-red-400 hover:text-red-600'}`}
                                    onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
                                    aria-label={`Remove operator ${token.value}`}
                                >✕</button>
                            </div>
                        );
                    } else if (token.type === 'bracket') {
                        return (
                            <div
                                key={token.keyId || idx}
                                id={`token-${idx}`}
                                tabIndex={0}
                                role="group"
                                aria-label={`Bracket token: ${token.value}. Press Backspace, Delete, or Cmd+Enter to remove.`}
                                className={`inline-flex items-center px-2 py-1 text-sm font-bold rounded border cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-500'
                                        : 'bg-white text-gray-700 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500'
                                }`}
                                onKeyDown={(e) => handleKeyDown(e, idx, token)}
                                onFocus={() => setFocusedIndex(idx)}
                                onClick={() => toggleTokenSelection(idx)}
                            >
                                <span className="mr-1">{token.value}</span>
                                <button 
                                    type="button"
                                    className="ml-1 text-gray-400 hover:text-gray-600 font-bold"
                                    onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
                                    aria-label={`Remove bracket ${token.value}`}
                                >✕</button>
                            </div>
                        );
                    }
                    return null;
                });
                })()}
            </div>

            {isMessageManuallyEdited && !logicError && (
                 <p className="text-xs text-orange-600 mt-1">Note: Filter logic has been manually edited. If you need to add new filters via checkboxes, reset logic first.</p>
            )}
            {logicError && (
                 <p className="text-xs font-bold text-red-600 mt-1 border border-red-200 bg-red-50 p-2 rounded">Your expression needs fixing - click Reset to Auto Logic to try again</p>
            )}
        </div>
    );
};
// --- END LOGIC SUMMARY COMPONENT ---


// Component for the dynamic chips display
const FilterChipArea = ({ 
    selectedFilters, 
    handleFilterChange,
    logicTokens,
    setLogicTokens,
    isMessageManuallyEdited,
    setIsMessageManuallyEdited,
    snomedOverrides,
    logicError,
    shouldPulse,
    showAdvancedLogic,
    setShowAdvancedLogic
}) => {

    const chips = useMemo(() => {
        const chipArray = Array.from(selectedFilters).map(fullId => {
            const details = filterDetailsMap.get(fullId);
            if (!details) return null;

            const isCancer = details.group === 'cancer-type';
            const chipClass = isCancer
                ? 'bg-[var(--cruk-white)] text-[var(--cruk-pink)] border border-[var(--cruk-pink)]'
                : 'bg-[var(--cruk-white)] text-[var(--cruk-blue)] border border-[var(--cruk-blue)]';

            return {
                fullId,
                // Check override state first, fallback to standard label
                label: snomedOverrides[fullId] || details.label,
                // Set category to null if it is a SNOMED override so it doesn't print
                category: snomedOverrides[fullId] ? null : details.category,
                chipClass,
            };
        }).filter(Boolean);
        return chipArray;
    }, [selectedFilters, snomedOverrides]);

    if (chips.length === 0) {
        return (
            <div className={`bg-gray-50 border-b border-l border-r border-gray-300 p-6 rounded-b-xl text-center shadow-inner transition duration-300 ease-in-out ${shouldPulse ? 'animate-pulse' : ''}`}>
                <span className="text-gray-500 font-medium italic">👆 Select a category above to start building your custom filter</span>
            </div>
        );
    }

    return (
        <div
            id="selected-filters-area"
            className="bg-white rounded-b-xl shadow-lg border-b border-l border-r border-gray-300 p-3 transition duration-300 ease-in-out"
        >
            <div id="filter-chip-list" className="flex items-start flex-wrap gap-2 text-sm">
                {chips.map(chip => (
                    <div
                        key={chip.fullId}
                        className={`filter-chip inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${chip.chipClass}`}
                    >

                        <span className="mr-1 opacity-75">{chip.category}:</span>
                        <span className="font-bold">{chip.label}</span>
                        <button
                            type="button"
                            className="ml-2 h-4 w-4 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-50 transition duration-150"
                            onClick={() => handleFilterChange(chip.fullId)}
                            aria-label={`Remove filter ${chip.label}`}
                        >
                            {/* Close Icon (inline SVG) */}
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-center space-x-3">
                <button
                    data-tour="toggle-logic-builder"
                    onClick={() => setShowAdvancedLogic(!showAdvancedLogic)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center transition duration-150"
                >
                    {showAdvancedLogic ? 'Hide Advanced Logic Builder' : 'Show Advanced Logic Builder'}
                    <svg className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${showAdvancedLogic ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {!showAdvancedLogic && isMessageManuallyEdited && (
                    <span className="text-xs text-orange-600 font-bold bg-orange-50 border border-orange-200 rounded px-2 py-0.5">(Custom Logic Active)</span>
                )}
            </div>

            {/* Now using the interactive token builder component */}
            {showAdvancedLogic && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-inner">
                    <FilterLogicBuilder
                        selectedFilters={selectedFilters}
                        logicTokens={logicTokens}
                        setLogicTokens={setLogicTokens}
                        isMessageManuallyEdited={isMessageManuallyEdited}
                        setIsMessageManuallyEdited={setIsMessageManuallyEdited}
                        logicError={logicError}
                    />
                </div>
            )}
        </div>
    );
};

// --- NEW COMPONENT: Help Overlay ---
const HelpOverlay = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-3xl font-bold text-[var(--cruk-blue)]">How to use filters</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6 text-lg text-gray-700">

                        <section>
                            <p>The list of studies can be filtered to pick out those with relating to specific cancers, including particular data or matching your accessibility needs.</p>
                        </section>

                        <section>
                            <h3 className="font-bold text-[var(--cruk-pink)] mb-2">1. Selecting Categories</h3>
                            <p>Use the top tabs to switch between <strong>Cancer Type</strong>, <strong>Data Type</strong>, and <strong>Accessibility</strong> categories.</p>
                            <p>You can search for cancers using CRUK terms, TCGA codes, or ICD-O classifications.</p>
                        </section>

                        <section>
                            <h3 className="font-bold text-[var(--cruk-pink)] mb-2">2. Searching for Terms</h3>
                            <p>In each category, use the search bar to find specific terms. You must enter at least <strong>4 characters</strong> to start the search.</p>
                        </section>

                        <section>
                            <h3 className="font-bold text-[var(--cruk-pink)] mb-2">3. Expanding Options</h3>
                            <p>Wherever there is a <strong>chevron (&gt;)</strong> next to a filter name, you can click to see more specific sub-categories.</p>
                        </section>

                        <section>
                            <h3 className="font-bold text-[var(--cruk-pink)] mb-2">4. Adjusting Logic</h3>
                            <p>Filters appear as chips. You can manually edit the <strong>Filter Logic</strong> text box if you need to combine filters using specific logic (e.g., AND/OR).</p>
                        </section>
                    </div>

                    <div className="mt-8 pt-4 border-t flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-[var(--cruk-blue)] text-white font-bold py-2 px-6 rounded-lg hover:opacity-90"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Application Component
export const FilterApp = ({ custodianFilter }) => {
    const [activePanel, setActivePanel] = useState(null);
    const [selectedClassification, setSelectedClassification] = useState(null);
    const [selectedFilters, setSelectedFilters] = useState(new Set());
    const [snomedOverrides, setSnomedOverrides] = useState({}); // New state
    const [logicTokens, setLogicTokens] = useState([]);
    const [isMessageManuallyEdited, setIsMessageManuallyEdited] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredIds, setFilteredIds] = useState(null); // Set of IDs that match the current search
    const [isSearching, setIsSearching] = useState(false); // Flag for search status
    const [logicError, setLogicError] = React.useState(false);
    const [showAdvancedLogic, setShowAdvancedLogic] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState(new Set());

    useEffect(() => {
        const broadcastSetters = () => {
            window.dispatchEvent(new CustomEvent('registerFilterSetters', {
                detail: {
                    setActivePanel,
                    setSelectedClassification,
                    setSearchTerm,
                    setSelectedFilters,
                    setExpandedKeys,
                    setShowAdvancedLogic
                }
            }));
        };

        broadcastSetters();
        window.addEventListener('requestFilterSetters', broadcastSetters);
        return () => window.removeEventListener('requestFilterSetters', broadcastSetters);
    }, [setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic]);

    // Flatten all data for efficient searching
    const allFiltersArray = useMemo(() => Array.from(filterDetailsMap.values()), []);

    // Reuse the filter logic utilities
    // Removed utilityFunctions as they are directly imported now.

    // EFFECT to update logicMessage when filters change (unless manually edited)
    useEffect(() => {
        // Only calculate if the user hasn't manually overridden the message
        if (!isMessageManuallyEdited) {
            const newTokens = calculateLogicTokens(Array.from(selectedFilters));
            setLogicTokens(newTokens);
        }
    }, [selectedFilters, isMessageManuallyEdited, filterType, plusParents, includeParents, getMessage]);

    // NEW SEARCH EFFECT WITH DEBOUNCE AND MIN LENGTH
    useEffect(() => {
        // Clear search results if the term is too short or empty
        if (!searchTerm || searchTerm.length < 4) {
            setFilteredIds(null);
            setIsSearching(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsSearching(true);

            const activeGroupMap = {
                'cancer': 'cancer-type',
                'data': 'data-type',
                'access': 'access'
            };
            const activeGroup = activeGroupMap[activePanel];

            if (!activeGroup) {
                setFilteredIds(null);
                setIsSearching(false);
                return;
            }

            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            const results = allFiltersArray.filter(item => {
                // 1. Check if the item belongs to the active panel's group
                if (item.group !== activeGroup) return false;

                // 2. Perform case-insensitive search on the label
                return item.label.toLowerCase().includes(lowerCaseSearchTerm);
            });

            const newFilteredIds = new Set(results.map(item => item.id));
            setFilteredIds(newFilteredIds);
            setIsSearching(false);

        }, 300); // Debounce delay

        return () => clearTimeout(timer); // Cleanup function to clear the previous timer
    }, [searchTerm, activePanel, allFiltersArray]);

    // NEW HIERARCHY PRUNING UTILITY
    const pruneHierarchy = useCallback((nodes, currentFilteredIds) => {
        if (!nodes) return null;
        if (!currentFilteredIds) return nodes; // No search active, return all nodes

        const filteredNodes = {};
        const nodesArray = Array.isArray(nodes) ? nodes : Object.values(nodes);

        nodesArray.forEach(item => {
            // Recursively prune children first
            const filteredChildren = pruneHierarchy(item.children, currentFilteredIds);

            // Check if the current item is a match, or if any of its children matched
            const isMatch = currentFilteredIds.has(item.id);
            const hasMatchingChildren = filteredChildren && Object.keys(filteredChildren).length > 0;

            if (isMatch || hasMatchingChildren) {
                // Include this node (and its filtered children)
                const newNode = { ...item };
                if (filteredChildren) {
                    newNode.children = filteredChildren;
                }
                filteredNodes[item.id] = newNode;
            }
        });

        return Object.keys(filteredNodes).length > 0 ? filteredNodes : null;
    }, []);


    const counts = useMemo(() => {
        let cancerTypeSelected = 0;
        let dataTypeSelected = 0;
        let accessibilitySelected = 0;

        selectedFilters.forEach(id => {
            const details = filterDetailsMap.get(id);
            if (!details) return;

            if (details.group === 'cancer-type') {
                cancerTypeSelected++;
            } else if (details.group === 'data-type') {
                dataTypeSelected++;
            } else if (details.group === 'access') {
                accessibilitySelected++;
            }
        });

        return {
            total: selectedFilters.size,
            cancer: cancerTypeSelected,
            data: dataTypeSelected,
            access: accessibilitySelected,
        };
    }, [selectedFilters]);

  const handleFilterChange = useCallback((id) => {
        setSelectedFilters(prevFilters => {
            const newFilters = new Set(prevFilters);
            if (newFilters.has(id)) {
                newFilters.delete(id);
                // Clear the override so it reverts to default if selected manually later
                setSnomedOverrides(prev => {
                    if (prev[id]) {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                    }
                    return prev;
                });
            } else {
                newFilters.add(id);
            }
            if (isMessageManuallyEdited) {
                setIsMessageManuallyEdited(false);
            }
            return newFilters;
        });
    }, [isMessageManuallyEdited]);

    const clearAllFilters = useCallback(() => {
        setSelectedFilters(new Set());
        setActivePanel(null);
        setSearchTerm(''); // Clear search on filter clear
        setLogicTokens([]); // NEW: Clear message
        setIsMessageManuallyEdited(false); // NEW: Reset edit state
        setLogicError(false);
    }, []);

    const handleFindStudies = useCallback(() => {
        // Log the current action
        console.log(`Executing search with ${counts.total} filters. Current logic tokens length: ${logicTokens?.length}`);

        if (counts.total > 0 && logicTokens && logicTokens.length > 0) {
            // Validate syntax before applying
            const validationResult = executeFilterLogic(logicTokens, []);
            if (!validationResult.success) {
                setLogicError(true);
                setShowAdvancedLogic(true); // Auto-expand on error
                return; // Stop execution, keep sidebar open
            }
            
            setLogicError(false); // Clear any previous error

            // Dispatch the AST tokens directly to the dataset list for evaluation
            window.dispatchEvent(new CustomEvent('apply-dataset-filters', { detail: { tokens: logicTokens } }));
        } else {
             setLogicError(false);
             // If no filters selected, dispatch event with null tokens to show all
             window.dispatchEvent(new CustomEvent('apply-dataset-filters', { detail: { tokens: null } }));
        }

        // Close the panel after finding studies
        setActivePanel(null);

    }, [counts.total, logicTokens]); // Dependencies remain the same


const renderPanel = () => {
        const props = {
            handleFilterChange,
            selectedFilters,
            searchTerm,
            setSearchTerm,
            filteredIds,
            isSearching,
            pruneHierarchy,
            setSnomedOverrides, // Add this line
            setSelectedFilters,  // Add this line
            selectedClassification,
            setSelectedClassification,
            expandedKeys,
            setExpandedKeys
        };
        switch (activePanel) {
            case 'cancer':
                return (
                    <CancerTypePanel {...props} />
                );
            case 'data':
                return (
                    <DataTypePanel {...props} />
                );
            case 'access':
                return (
                    <AccessibilityPanel {...props} />
                );
            default:
                return null;
        }
    };
    const getNavButtonClasses = (panelKey) => {
        const isActive = activePanel === panelKey;
        const noFiltersSelected = counts.total === 0 && !activePanel;
        const baseClasses = "flex flex-col items-center justify-center p-3 sm:p-4 bg-white rounded-lg shadow-md border-2 transition duration-200 cursor-pointer text-center relative flex-1 mx-1 sm:mx-2 my-1 sm:my-0";
        const activeClasses = 'border-[var(--cruk-pink)] shadow-lg scale-[1.02]';
        const inactiveClasses = 'border-gray-200 hover:border-[var(--cruk-pink)]/50 hover:shadow-lg';

        let finalClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
        if (noFiltersSelected) finalClasses += " animate-pulse ring-2 ring-[var(--cruk-pink)] ring-opacity-30";
        return finalClasses;
    };
    const isFindStudiesDisabled = counts.total === 0;

return (
        <div className="p-2 sm:p-8 bg-gray-50">
            <HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />
            <div id="filter-container" className="w-full flex flex-col relative z-10">

                {/* Main Filter Layout: Pink Strip, High Shadow for 3D Pop */}
                <div className="flex flex-col bg-white rounded-xl shadow-2xl border-t-8 border-t-[var(--cruk-pink)] border-x border-b border-gray-300 overflow-hidden">

                    {/* --- Horizontal Filter Navigation Bar (Top Row) --- */}
                    <div id="filter-navbar" className="flex flex-col sm:flex-row flex-shrink-0 w-full bg-gray-50 border-b border-gray-200 p-2 sm:p-4 items-center">
                        {/* Title and Category Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-stretch sm:w-3/4">
                            <div className="p-4 sm:pr-8 sm:w-1/4 flex items-center justify-between border-b sm:border-b-0 sm:border-r border-gray-200">
                                <h2 className="text-3xl sm:text-4xl font-bold text-[var(--cruk-blue)]">

                                    First filter the datasets
                                </h2>
                                <button
                                    onClick={() => setShowHelp(true)}
                                    className="ml-4 px-3 py-1 font-bold text-xs text-white bg-[var(--cruk-blue)] rounded-lg shadow-sm hover:opacity-90 transition duration-150 whitespace-nowrap flex items-center"
                                >
                                    <span className="mr-1 text-sm">❓</span> Help
                                </button>
                            </div>

                            {/* Category Buttons with Questions */}
                            <div className="flex flex-grow justify-around sm:w-3/4">
                                <button data-tour="cancer-tab" onClick={() => { setActivePanel('cancer'); setSearchTerm(''); }} className={getNavButtonClasses('cancer')}>
                                    <span className="text-xl font-extrabold">Which Cancers are you interested in? <span className="text-sm opacity-80 font-normal ml-1">({counts.cancer})</span></span>

                                </button>
                                <button data-tour="data-tab" onClick={() => { setActivePanel('data'); setSearchTerm(''); }} className={getNavButtonClasses('data')}>
                                    <span className="text-xl font-extrabold">What kind of data do you need? <span className="text-sm opacity-80 font-normal ml-1">({counts.data})</span></span>

                                </button>
                                <button data-tour="access-tab" onClick={() => { setActivePanel('access'); setSearchTerm(''); }} className={getNavButtonClasses('access')}>
                                    <span className="text-xl font-extrabold">Which access restrictions apply? <span className="text-sm opacity-80 font-normal ml-1">({counts.access})</span></span>

                                </button>
                            </div>
                        </div>

                        {/* Action Buttons (Right Side of Horizontal Nav) */}
                        <div className="flex flex-row sm:flex-col sm:w-1/4 p-2 sm:p-2 border-t sm:border-t-0 sm:border-l border-gray-200 justify-around items-center space-x-2 sm:space-x-0 sm:space-y-2">
                            <button
                                onClick={clearAllFilters}
                                className="w-1/2 sm:w-auto px-4 py-2 font-medium text-sm text-gray-500 hover:text-[var(--cruk-pink)] transition duration-150 bg-white rounded-lg shadow-sm border border-gray-300"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleFindStudies}
                                className={`w-1/2 sm:w-auto bg-[var(--cruk-pink)] text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ${isFindStudiesDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} ${!isFindStudiesDisabled && !logicError ? 'animate-pulse ring-4 ring-[var(--cruk-pink)] ring-opacity-50' : ''}`}
                                disabled={isFindStudiesDisabled}
                            >
                                Find ({counts.total})
                            </button>
                        </div>
                    </div>
                    {/* --- End Horizontal Navigation Bar --- */}

                    {/* --- Filter Content Panel (Content Below Nav) --- */}
                    <div className="flex-grow w-full p-0">
                        {/* Filter Chip Area (Includes the new Logic Summary) */}
                        <FilterChipArea
                            selectedFilters={selectedFilters}
                            handleFilterChange={handleFilterChange}
                            logicTokens={logicTokens}
                            setLogicTokens={setLogicTokens}
                            isMessageManuallyEdited={isMessageManuallyEdited}
                            setIsMessageManuallyEdited={setIsMessageManuallyEdited}
                            snomedOverrides={snomedOverrides} // Add this line here
                            logicError={logicError}
                            shouldPulse={counts.total === 0 && !activePanel}
                            showAdvancedLogic={showAdvancedLogic}
                            setShowAdvancedLogic={setShowAdvancedLogic}
                        />

                        {/* Filter Panel Content / Default Content */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* 1. Render the filter panel ONLY if active */}
                            {activePanel ? (
                                renderPanel()
                            ) : (
                                null
                            )}
                        </div>
                    </div>
                    {/* --- End Filter Content Panel --- */}
                    {/* Render DatasetsSection inside the unified container */}
                    <div className="border-t border-gray-300 bg-white">
                        <DatasetsSection custodianFilter={custodianFilter} />
                    </div>
                </div>
            </div>

        </div>
    );
};
// --- PANEL COMPONENTS (MODIFIED TO INCLUDE SEARCH) ---

const SearchInput = ({ searchTerm, setSearchTerm, isSearching, placeholder }) => {
    return (
        <div className="mb-4">
            <div className="relative">
                <input
                    type="search"
                    placeholder={placeholder || "Search terms (min 4 characters)..."}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-[var(--cruk-pink)] focus:border-[var(--cruk-pink)] text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {/* Search Icon or Loading Spinner */}
                    {isSearching ? (
                         <svg className="animate-spin h-5 w-5 text-[var(--cruk-pink)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                    )}
                </div>
            </div>
            {searchTerm && searchTerm.length < 4 && (
                <p className="text-xs text-red-500 mt-1">Please enter at least 4 characters to search.</p>
            )}
        </div>
    );
};

const CancerTypePanel = ({ handleFilterChange,
    selectedFilters,
    searchTerm,
    setSearchTerm,
    filteredIds,
    isSearching,
    pruneHierarchy,
    setSnomedOverrides,
    setSelectedFilters,
    selectedClassification,
    setSelectedClassification}) => {

    const cancerGroups = filterData['0_0'].children;

    // --- DATA RETRIEVAL and PRUNING ---
    // ICD-O (Combined Topography and Histology)
    const filteredTopographyItems = pruneHierarchy(cancerGroups['0_0_0']?.children, filteredIds);
    const filteredHistologyItems = pruneHierarchy(cancerGroups['0_0_1']?.children, filteredIds);

    // CRUK (0_0_2)
    const filteredCrukTermItems = pruneHierarchy(cancerGroups['0_0_2']?.children, filteredIds);

    // SNOMED-CT (0_0_3)
    const snomedData = cancerGroups['0_0_3'] || { children: {} };
    const filteredSnomedItems = pruneHierarchy(snomedData.children, filteredIds);

    // TCGA (0_0_4)
    const tcgaData = cancerGroups['0_0_4'] || { children: {} };
    const filteredTcgaItems = pruneHierarchy(tcgaData.children, filteredIds);

    // --- Sub-Component for a Classification Card/Button ---
    const ClassificationCard = ({ title, description, classificationKey, emoji }) => {
        const isActive = selectedClassification === classificationKey;
        const baseClasses = "flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md border-2 transition duration-200 cursor-pointer text-center relative focus:outline-none focus:ring-4 focus:ring-[var(--cruk-pink)]/50";
        const activeClasses = 'border-[var(--cruk-pink)] ring-4 ring-[var(--cruk-pink)]/20 shadow-lg scale-[1.02]';
        const inactiveClasses = 'border-gray-200 hover:border-[var(--cruk-pink)]/50';

        // Check for filters selected within this group to show a count/badge
        let filterCount = 0;
        if (classificationKey === 'icdo') {
             selectedFilters.forEach(id => {
                 if (id.startsWith('0_0_0') || id.startsWith('0_0_1')) filterCount++;
            });
        } else if (classificationKey === 'cruk' && cancerGroups['0_0_2']) {
             selectedFilters.forEach(id => { if (id.startsWith('0_0_2')) filterCount++; });
        } else if (classificationKey === 'snomed' && cancerGroups['0_0_3']) {
             selectedFilters.forEach(id => { if (id.startsWith('0_0_3')) filterCount++; });
        } else if (classificationKey === 'tcga' && cancerGroups['0_0_4']) {
             selectedFilters.forEach(id => { if (id.startsWith('0_0_4')) filterCount++; });
        }

        return (
            <button
                type="button"
                id={`classification-card-${classificationKey}`}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                onClick={() => setSelectedClassification(classificationKey)}
            >
                <div className="flex items-center space-x-2">
                    <span className="text-3xl">{emoji}</span>
                    <h4 className="text-xl font-bold text-gray-800">{title}</h4>
                </div>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
                {filterCount > 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--cruk-pink)] text-white">
                        {filterCount} Selected
                    </span>
                )}
            </button>
        );
    };

    // --- Content for a selected classification ---
    const renderClassificationContent = () => {
        const listProps = { handleFilterChange, selectedFilters };

        // FIX APPLIED HERE: Added 'pb-28' to allow scrolling space for bottom tooltips
        const baseListClass = "h-[250px] overflow-y-auto space-y-1 text-sm pr-2 pb-28";

        // Display Search Input for all sub-panels
        const searchInput = (
            <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isSearching={isSearching}
                placeholder={`Search ${selectedClassification.toUpperCase()} terms`}
            />
        );

        switch (selectedClassification) {
            case 'cruk':
                return (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">CRUK Cancer Terms </h3>
                        {searchInput}
                        <div id="cruk-terms-list" className={baseListClass}>
                            <NestedFilterList
                                items={filteredCrukTermItems}
                                {...listProps}
                            />
                        </div>
                    </>
                );

            case 'tcga':
                return (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">TCGA Terms </h3>
                        {searchInput}
                        <div id="tcga-terms-list" className={baseListClass}>
                            <NestedFilterList
                                items={filteredTcgaItems}
                                {...listProps}
                            />
                        </div>
                    </>
                );

            case 'snomed':
                return (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">SNOMED-CT Lookup</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Enter the SNOMED code and press Return:</p>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="e.g. 288536007"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--cruk-pink)] focus:border-[var(--cruk-pink)] text-sm"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const snomedId = e.target.value.trim();
                                            if (!snomedId) return;

                                            try {
                                                // Adjust port 8000 if your FastAPI runs elsewhere
                                                const response = await fetch(`${API_BASE_URL}/snomed-filters/${snomedId}`);

                                                if (!response.ok) {
                                                    alert("SNOMED code not found in database.");
                                                    return;
                                                }

                                                const record = await response.json();

                                                // Look up the corresponding ICD-O details from your local map
                                                // using the filter_code returned by the database
                                                const icdoDetails = filterDetailsMap.get(record.filter_code);
                                                const icdoLabel = icdoDetails ? icdoDetails.label : "Unknown Label";

                                                // Determine Topography vs Histology
                                                const icdoType = record.topography === 'top' ? 'icdOTopography' : 'icdOHistology';

                                                // Construct the custom display string
                                                const customLabel = `SNOMED ${record.id} - corresponding to ${icdoType}: ${icdoLabel}`;

                                                // 1. Set the cosmetic override for this specific filter code
                                                setSnomedOverrides(prev => ({ ...prev, [record.filter_code]: customLabel }));

                                                // 2. Add the actual underlying filter code to the selected filters set
                                                setSelectedFilters(prev => {
                                                    const newFilters = new Set(prev);
                                                    newFilters.add(record.filter_code);
                                                    return newFilters;
                                                });

                                                // Clear the input field for the next search
                                                e.target.value = '';

                                            } catch (error) {
                                                console.error("Error fetching SNOMED code:", error);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </>
                );

            case 'icdo':
                return (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">ICD-O Classification</h3>
                        {searchInput}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-md shadow-inner border border-gray-200">
                                <h4 className="text-base font-bold text-gray-700 mb-2">Topography</h4>
                                <div id="icdo-topography-list" className={baseListClass}>
                                    <NestedFilterList
                                        items={filteredTopographyItems}
                                        {...listProps}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-md shadow-inner border border-gray-200">
                                <h4 className="text-base font-bold text-gray-700 mb-2">Histology</h4>
                                <div id="icdo-histology-list" className={baseListClass}>
                                    <NestedFilterList
                                        items={filteredHistologyItems}
                                        {...listProps}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                );

            default:
                return null;
        }
    };


    // --- Main Panel Render Logic ---
    return (
        <div id="cancer-type-panel" className="md:col-span-3 bg-white rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 text-gray-600 flex-grow overflow-hidden">
                <div className="text-2xl font-bold text-gray-800 mb-3 border-b pb-2">
                    {selectedClassification && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedClassification(null);
                                    setSearchTerm("");
                                }}
                                className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                            >
                                ← Back to Cancer Type Selection
                            </button>
                        )}
                </div>
                {!selectedClassification && (
                    <div className="mt-4">
                        <p className="text-lg font-medium text-gray-700 mb-6">
                            Click on your choice of classification to begin
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ClassificationCard
                                title="CRUK Cancer Terms"
                                description="Patient-friendly, simplified cancer terms."
                                classificationKey="cruk"
                                emoji="🏥"
                            />
                            <ClassificationCard
                                title="TCGA Terms"
                                description="The Cancer Genome Atlas terminology."
                                classificationKey="tcga"
                                emoji="🧬"
                            />
                            <ClassificationCard
                                title="SNOMED-CT"
                                description="Systematized Nomenclature of Medicine."
                                classificationKey="snomed"
                                emoji="🏷️"
                            />
                            <ClassificationCard
                                title="ICD-O Classification"
                                description="Official pathology terms (Topography & Histology)."
                                classificationKey="icdo"
                                emoji="🔬"
                            />
                        </div>
                    </div>
                )}

                {/* Detailed Filter Content */}
                {selectedClassification && (
                    <div className="mt-4 border p-4 rounded-lg bg-gray-50">
                        {renderClassificationContent()}
                    </div>
                )}
            </div>
        </div>
    );
};

const DataTypePanel = ({ handleFilterChange, selectedFilters, searchTerm, setSearchTerm, filteredIds, isSearching, pruneHierarchy, expandedKeys, setExpandedKeys }) => {
    const dataTypeGroups = filterData['0_2'].children;
    const primaryGroup = filterData['0_2'].primaryGroup;

    // Apply pruning logic to each main group
    const filteredBiobankItems = pruneHierarchy(dataTypeGroups['0_2_0'].children, filteredIds);
    const filteredInvitroItems = pruneHierarchy(dataTypeGroups['0_2_1'].children, filteredIds);
    const filteredAnimalItems = pruneHierarchy(dataTypeGroups['0_2_2'].children, filteredIds);
    const filteredPatientItems = pruneHierarchy(dataTypeGroups['0_2_3'].children, filteredIds);
    const filteredNonBioItems = pruneHierarchy(dataTypeGroups['0_2_4'].children, filteredIds);

    // Helper class for the lists: Added 'pb-28' for tooltip space
    const listClass = "h-40 overflow-y-auto space-y-1 text-sm pr-2 pb-28";

    return (
        <div id="data-type-panel" className="md:col-span-3 bg-white rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 text-gray-600 flex-grow overflow-hidden">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Data Type Selection</h2>

                {/* Search Bar for Data Terms */}
                <SearchInput
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    isSearching={isSearching}
                    placeholder="Search data types"
                />

                <p className="text-sm italic text-gray-500 mb-2">
                    Select one or more modalities to include in your search.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Biobank Samples (0_2_0) */}
                    <div className="border p-3 rounded-lg bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Biobank Samples</h4>
                        <div id="biobank-samples-list" className={listClass}>
                            <NestedFilterList
                                items={filteredBiobankItems} // USE FILTERED DATA
                                {...{handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys}}
                            />
                        </div>
                    </div>

                    {/* In Vitro Studies (0_2_1) */}
                    <div className="border p-3 rounded-lg bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">In Vitro Studies</h4>
                        <div id="invitro-studies-list" className={listClass}>
                            <NestedFilterList
                                items={filteredInvitroItems} // USE FILTERED DATA
                                {...{handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys}}
                            />
                        </div>
                    </div>

                    {/* Model Organisms (0_2_2) */}
                    <div className="border p-3 rounded-lg bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Model Organisms</h4>
                        <div id="animal-studies-list" className={listClass}>
                            <NestedFilterList
                                items={filteredAnimalItems} // USE FILTERED DATA
                                {...{handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys}}
                            />
                        </div>
                    </div>

                    {/* Patient Studies (0_2_3) */}
                    <div className="border p-3 rounded-lg bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Patient Studies</h4>
                        <div id="patient-studies-list" className={listClass}>
                            <NestedFilterList
                                items={filteredPatientItems} // USE FILTERED DATA
                                {...{handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys}}
                            />
                        </div>
                    </div>
                    {/* Techniques (0_2_4) */}
                    <div className="border p-3 rounded-lg bg-gray-50">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Techniques</h4>
                        <div id="techniques-studies-list" className={listClass}>
                            <NestedFilterList
                                items={filteredNonBioItems} // USE FILTERED DATA
                                {...{handleFilterChange, selectedFilters, expandedKeys, setExpandedKeys}}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
const AccessibilityPanel = ({ handleFilterChange, selectedFilters, searchTerm, setSearchTerm, filteredIds, isSearching, pruneHierarchy }) => {
    const accessibilityItems = Object.values(filterData['0_1'].children);
    const primaryGroup = filterData['0_1'].primaryGroup;

    // Accessibility items are flat, so we just filter them here if a search is active
    const finalAccessibilityItems = useMemo(() => {
        if (!filteredIds) {
            return accessibilityItems;
        }

        return accessibilityItems.filter(item => filteredIds.has(item.id));
    }, [accessibilityItems, filteredIds]);


    return (
        <div id="accessibility-panel" className="md:col-span-3 bg-white rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 text-gray-600 flex-grow overflow-hidden">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Accessibility and Source</h2>

                {/* Search Bar for Accessibility Terms */}
                <SearchInput
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    isSearching={isSearching}
                    placeholder="Search accessibility/source terms"
                />

                <p className="text-sm italic text-gray-500 mb-2">
                    Filter by data access level and source.
                </p>

                {/* FIX APPLIED HERE: Added 'pb-28' to the container */}
                <div className="h-32 overflow-y-auto pr-2 border p-3 rounded-lg pb-28">
                    <div className="space-y-2">
                        {/* Render the filtered or full list */}
                        {finalAccessibilityItems.map(item => {
                            const fullId = item.id;
                            const isChecked = selectedFilters.has(fullId);
                            // NOTE: Tooltip logic isn't in a separate component here,
                            // but if you want tooltips here too, you'd need to duplicate the logic
                            // or use NestedFilterItem here as well.
                            // Assuming you just want the scrolling space for consistency:
                            return (
                                <div key={item.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={fullId}
                                        className="rounded text-[var(--cruk-pink)] border-gray-300 focus:ring-[var(--cruk-pink)] mr-2 w-4 h-4 cursor-pointer"
                                        data-filter-group="access"
                                        checked={isChecked}
                                        onChange={() => handleFilterChange(fullId)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleFilterChange(fullId);
                                            }
                                        }}
                                    />
                                    <label htmlFor={fullId} className="text-gray-700 select-none flex-grow cursor-pointer text-sm">
                                        {item.label} <span className="text-xs text-gray-500 ml-1">({item.count})</span>
                                    </label>
                                </div>
                            );
                        })}
                        {isSearching === false && searchTerm.length >= 4 && finalAccessibilityItems.length === 0 && (
                            <p className="text-sm text-gray-500">No results found for "{searchTerm}".</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};