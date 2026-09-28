import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { filterDetailsMap, filterData, getFilterData } from '../utils/filter-setup.js';
import "../styles/style.css"

// --- Helper Components ---

export const FilterChipArea = ({ selectedFilters, handleFilterChange }) => {
    const chips = useMemo(() => {
        return selectedFilters.map(item => {
            const isCancer = item.primaryGroup === 'cancer-type';
            const chipClass = isCancer
                ? 'bg-[var(--cruk-white)] text-[var(--cruk-pink)] border border-[var(--cruk-pink)]'
                : 'bg-[var(--cruk-white)] text-[var(--cruk-blue)] border border-[var(--cruk-blue)]';

            return {
                fullId: item.id,
                label: item.label,
                category: item.category,
                chipClass,
            };
        });
    }, [selectedFilters]);

    if (chips.length === 0) return <p className="text-sm text-gray-500 italic">No filters selected.</p>;

    return (
        <div className="flex items-start flex-wrap gap-2 text-sm">
            {chips.map(chip => (
                <div
                    key={chip.fullId}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${chip.chipClass}`}
                >
                    <span className="mr-1 opacity-75">{chip.category}:</span>
                    <span className="font-bold">{chip.label}</span>
                    <button
                        type="button"
                        className="ml-2 h-4 w-4 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-50 transition duration-150"
                        onClick={() => handleFilterChange(chip.fullId)}
                    >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

// Nested List Components
const NestedFilterList = ({ items, handleFilterChange, selectedFiltersSet, level = 0 }) => {
    if (!items || items.length === 0) return null;
    const itemsArray = Array.isArray(items) ? items : Object.values(items);

    return (
        <div className="nested-list space-y-1">
            {itemsArray.map(item => (
                <NestedFilterItem
                    key={item.id}
                    item={item}
                    handleFilterChange={handleFilterChange}
                    selectedFiltersSet={selectedFiltersSet}
                    level={level}
                />
            ))}
        </div>
    );
};

const NestedFilterItem = ({ item, handleFilterChange, selectedFiltersSet, level }) => {
    const fullId = item.id;
    const childrenArray = item.children ? Object.values(item.children) : [];
    const hasChildren = childrenArray.length > 0;
    const isChecked = selectedFiltersSet.has(fullId);
    const hasDescription = item.description && item.description.trim().length > 0;
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpansion = (e) => {
        e.preventDefault();
        setIsExpanded(prev => !prev);
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center p-1 -m-1 rounded transition duration-100" style={{ paddingLeft: level > 0 ? `${level * 1.25}rem` : '0' }}>
                {hasChildren ? (
                    <button
                        type="button"
                        className={`transition-transform duration-200 w-4 h-4 flex items-center justify-center text-gray-500 mr-1 ${isExpanded ? 'rotate-90' : ''}`}
                        onClick={toggleExpansion}
                    >
                        <svg className="w-3 h-3 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                ) : <span className="w-4 h-4 mr-1"></span>}

                <input
                    type="checkbox"
                    id={fullId}
                    className="rounded text-[var(--cruk-pink)] border-gray-300 focus:ring-[var(--cruk-pink)] mr-2 w-4 h-4 cursor-pointer"
                    checked={isChecked}
                    onChange={() => handleFilterChange(fullId)}
                />

                <div className="relative flex-grow flex items-center group/tooltip">
                    <label htmlFor={fullId} className="text-gray-700 select-none cursor-pointer text-sm flex items-center">
                        {item.label}
                    </label>

                    {hasDescription && (
                        <div className="flex items-center ml-1">
                            {/* Unified Info Icon */}
                            <svg className="w-3.5 h-3.5 text-gray-400 opacity-60 group-hover/tooltip:opacity-100 transition-opacity cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>

                            {/* Tooltip Box - Now properly anchored to the group/tooltip div */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-56 p-2 bg-gray-900 text-white text-[11px] leading-relaxed rounded shadow-2xl z-[100] pointer-events-none">
                                {item.description}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {hasChildren && isExpanded && (
                <NestedFilterList
                    items={childrenArray}
                    handleFilterChange={handleFilterChange}
                    selectedFiltersSet={selectedFiltersSet}
                    level={level + 1}
                />
            )}
        </div>
    );
};

const SearchInput = ({ searchTerm, setSearchTerm, isSearching, placeholder }) => (
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
                {isSearching ? (
                     <svg className="animate-spin h-5 w-5 text-[var(--cruk-pink)]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                )}
            </div>
        </div>
    </div>
);

// --- Sub-Panels (Cancer, Data, Access) ---

const CancerTypePanel = ({ handleFilterChange, selectedFiltersSet, searchTerm, setSearchTerm, filteredIds, pruneHierarchy }) => {
    // Defaulting to ICD-O views
    const cancerGroups = filterData['0_0']?.children || {};

    const filteredTopo = pruneHierarchy(cancerGroups['0_0_0']?.children, filteredIds);
    const filteredHisto = pruneHierarchy(cancerGroups['0_0_1']?.children, filteredIds);

    const listProps = { handleFilterChange, selectedFiltersSet };
    const listClass = "h-[450px] overflow-y-auto space-y-1 text-sm pr-2";

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-gray-700 mb-2">ICD-O Classification</h3>
            <p className="text-xs text-gray-500 mb-3">Please provide the ICD-O Topography and Histology codes. You will be asked to provide translations later.</p>

            <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isSearching={false}
                placeholder="Search ICD-O terms..."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col">
                    <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Topography</h4>
                    <div className={listClass}>
                        <NestedFilterList items={filteredTopo} {...listProps} />
                    </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col">
                    <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Histology</h4>
                    <div className={listClass}>
                        <NestedFilterList items={filteredHisto} {...listProps} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataTypePanel = ({ handleFilterChange, selectedFiltersSet, searchTerm, setSearchTerm, filteredIds, pruneHierarchy }) => {
    const [expandedSection, setExpandedSection] = useState(null); // Default first one open
    const dataTypeGroups = filterData['0_2']?.children || {};

    const sections = [
        { title: "Biobank", items: dataTypeGroups['0_2_0']?.children },
        { title: "In Vitro", items: dataTypeGroups['0_2_1']?.children },
        { title: "Model Organisms", items: dataTypeGroups['0_2_2']?.children },
        { title: "Patient Studies", items: dataTypeGroups['0_2_3']?.children },
        { title: "Techniques", items: dataTypeGroups['0_2_4']?.children }
    ];

    return (
        <div className="flex flex-col h-full">
            <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} isSearching={false} placeholder="Search data types..." />

            <div className="grid grid-cols-2 grid-auto-rows-fr gap-4 overflow-y-auto pr-2">
                {sections.map((sec, idx) => {
                    const isOpen = expandedSection === idx;

                    return (
                        <div
                            key={idx}
                            className={`flex flex-col border rounded-lg transition-all duration-200 shadow-sm ${isOpen ? 'bg-white border-indigo-300 ring-1 ring-indigo-50' : 'bg-gray-50 border-gray-200'}`}
                        >
                            <button
                                onClick={() => setExpandedSection(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 rounded-t-lg transition-colors"
                            >
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-tight">{sec.title}</h4>
                                <svg
                                    className={`w-4 h-4 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isOpen && (
                                <div className="p-3 pt-0 border-t border-gray-100 h-64 overflow-y-auto">
                                    <NestedFilterList
                                        items={pruneHierarchy(sec.items, filteredIds)}
                                        handleFilterChange={handleFilterChange}
                                        selectedFiltersSet={selectedFiltersSet}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AccessibilityPanel = ({ handleFilterChange, selectedFiltersSet, searchTerm, setSearchTerm, filteredIds }) => {
    const items = filterData['0_1']?.children ? Object.values(filterData['0_1'].children) : [];
    const visibleItems = filteredIds ? items.filter(i => filteredIds.has(i.id)) : items;

    return (
        <div>
            <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} isSearching={false} placeholder="Search access types..." />
            <div className="h-64 overflow-y-auto border p-3 rounded-lg bg-white">
                {visibleItems.map(item => (
                    <div key={item.id} className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            className="rounded text-[var(--cruk-pink)] border-gray-300 mr-2"
                            checked={selectedFiltersSet.has(item.id)}
                            onChange={() => handleFilterChange(item.id)}
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Exported Component ---
const DataTagger = ({ value = [], onChange }) => {
    const [activePanel, setActivePanel] = useState('cancer');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredIds, setFilteredIds] = useState(null);
    const [isFilterLoaded, setIsFilterLoaded] = useState(false);

    useEffect(() => {
        getFilterData().then(() => setIsFilterLoaded(true));
    }, []);

    const selectedFiltersSet = useMemo(() => {
        return new Set(value.map(item => item.id));
    }, [value]);
    const allFiltersArray = useMemo(() => Array.from(filterDetailsMap.values()), []);

    useEffect(() => {
        if (!searchTerm || searchTerm.length < 3) {
            setFilteredIds(null);
            return;
        }
        const timer = setTimeout(() => {
            const lower = searchTerm.toLowerCase();
            const activeGroupMap = { 'cancer': 'cancer-type', 'data': 'data-type', 'access': 'access' };
            const activeGroup = activeGroupMap[activePanel];

            const results = allFiltersArray.filter(item =>
                item.group === activeGroup && item.label.toLowerCase().includes(lower)
            );
            setFilteredIds(new Set(results.map(i => i.id)));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, activePanel, allFiltersArray]);

    const pruneHierarchy = useCallback((nodes, currentIds) => {
        if (!nodes) return null;
        if (!currentIds) return nodes;
        const filtered = {};
        const arr = Array.isArray(nodes) ? nodes : Object.values(nodes);
        arr.forEach(item => {
            const kids = pruneHierarchy(item.children, currentIds);
            if (currentIds.has(item.id) || (kids && Object.keys(kids).length > 0)) {
                filtered[item.id] = { ...item, children: kids };
            }
        });
        return Object.keys(filtered).length > 0 ? filtered : null;
    }, []);

    const handleFilterChange = (id) => {
        // 1. Get current selection (which is now an array of objects)
        const currentSelection = value || [];
        const isAlreadySelected = currentSelection.some(item => item.id === id);

        let nextSelection;
        if (isAlreadySelected) {
            // Remove the object
            nextSelection = currentSelection.filter(item => item.id !== id);
        } else {
            // 2. Look up the full metadata from the utility map
            const details = filterDetailsMap.get(id);
            if (details) {
                // Add the full object (id, label, category, primaryGroup/group, and description)
                nextSelection = [...currentSelection, {
                    id: details.id,
                    label: details.label,
                    category: details.category,
                    primaryGroup: details.group,
                    description: details.description || ""
                }];
            } else {
                nextSelection = currentSelection;
            }
        }

        onChange(nextSelection);
    };

    const props = { handleFilterChange, selectedFiltersSet, searchTerm, setSearchTerm, filteredIds, pruneHierarchy };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                {['cancer', 'data', 'access'].map(key => (
                    <button
                        key={key}
                        onClick={() => { setActivePanel(key); setSearchTerm(''); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activePanel === key ? 'bg-white border-b-2 border-[var(--cruk-pink)] text-[var(--cruk-pink)]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                ))}
            </div>

            {/* Panel Content */}
            <div className="p-4 bg-white flex-grow overflow-hidden">
                {activePanel === 'cancer' && <CancerTypePanel {...props} />}
                {activePanel === 'data' && <DataTypePanel {...props} />}
                {activePanel === 'access' && <AccessibilityPanel {...props} />}
            </div>
        </div>
    );
};

export default DataTagger;