import React, { useState, useEffect } from 'react';

const TargetSelector = ({ datasets, projects, selectedTarget, onSelectionChange, disabled }) => {
    const [targetType, setTargetType] = useState('dataset');
    const [searchTerm, setSearchTerm] = useState('');

    const activeList = targetType === 'dataset' ? datasets : projects;

    // Log the raw data whenever the active list or type changes to verify the structure
    useEffect(() => {
        console.log(`Current ${targetType} raw data array:`, activeList);
    }, [activeList, targetType]);

    const handleTypeToggle = (type) => {
        if (disabled) return;
        setTargetType(type);
        setSearchTerm('');
        onSelectionChange(null);
    };

    // Helper function to extract the correct name based on your specifications
    const getDisplayName = (item, type) => {
        if (type === 'dataset') {
            return item.metadata_blob?.summary?.title || item.computed_title || item.name || item.title || '';
        }
        if (type === 'project') {
            return item.project_grant_name || item.projectGrantName || item.metadata_blob?.project_grant_name || item.metadata_blob?.projectGrantName || item.metadata_blob?.summary?.title || item.name || item.title || '';
        }
        return '';
    };

    const filteredList = activeList.filter(item => {
        const displayName = getDisplayName(item, targetType);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">1. Select Target</h3>

            {/* Type Toggle */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => handleTypeToggle('dataset')}
                    disabled={disabled}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                        targetType === 'dataset'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100 disabled:opacity-50'
                    }`}
                >
                    Link to Dataset
                </button>
                <button
                    onClick={() => handleTypeToggle('project')}
                    disabled={disabled}
                    className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                        targetType === 'project'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100 disabled:opacity-50'
                    }`}
                >
                    Link to Project
                </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder={`Search ${targetType}s...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
            </div>

            {/* Filtered Results List */}
            <div className="bg-white border border-gray-200 rounded-md max-h-60 overflow-y-auto shadow-inner">
                {filteredList.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        No {targetType}s found matching your search.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredList.map(item => {
                            const isSelected = selectedTarget?.id === item.id && selectedTarget?.type === targetType;
                            const displayName = getDisplayName(item, targetType) || `Unnamed ${targetType}`;

                            return (
                                <li
                                    key={item.id}
                                    onClick={() => !disabled && onSelectionChange({ type: targetType, id: item.id, name: displayName })}
                                    className={`p-3 cursor-pointer transition-colors ${
                                        isSelected
                                        ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-900 font-medium'
                                        : 'hover:bg-gray-50 text-gray-700 border-l-4 border-transparent'
                                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {displayName}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Confirmation Banner */}
            {selectedTarget && (
                <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-md border border-green-200 flex items-center shadow-sm">
                    <svg className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <div>
                        <span className="font-semibold block text-sm text-green-900">Target Confirmed</span>
                        <span className="text-base">{selectedTarget.name}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TargetSelector;