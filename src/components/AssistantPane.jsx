import React, { useState, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer.jsx';
import PreviewAccessCard from './PreviewAccessCard.jsx';
import PreviewTags from './PreviewTags.jsx';
import PreviewMainContent from './PreviewMainContent.jsx';
import AiUploadWidget from './AiUploadWidget.jsx';

import exampleData from '../utils/template_dataset.json';

const AssistantPane = ({ activeGuidance, formData, activeSection, setActiveSection, onFormChange, children }) => {
    const [activeTab, setActiveTab] = useState('guidance'); // 'guidance', 'ai', 'preview'
    const [viewMode, setViewMode] = useState('visual'); // 'visual', 'json'

    const handleDownloadExample = () => {
        try {
            const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "example_metadata.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error downloading example:", e);
        }
    };

    const handleDownloadGuide = () => {
        const link = document.createElement("a");
        link.href = "/guidance.pdf";
        link.download = "CRUK_Datahub_Guide.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (activeTab === 'preview' && viewMode === 'visual') {
            let targetId = 'preview-summary';

            if (activeSection === 'accessibility' || activeSection === 'usage') {
                targetId = 'preview-accessibility';
            } else if (activeSection === 'datasetFilters') {
                targetId = 'preview-datasetFilters';
            }

            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [activeSection, activeTab, viewMode]);

    return (
        <div className="w-full border-l border-gray-200 bg-gray-50 h-full flex flex-col flex-shrink-0">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 bg-white shadow-sm">
                <button
                    className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                        activeTab === 'guidance' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab('guidance')}
                >
                    Guidance
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                        activeTab === 'ai' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab('ai')}
                >
                    AI Import
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                        activeTab === 'preview' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab('preview')}
                >
                    Live Preview
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* 1. GUIDANCE TAB */}
                <div className={activeTab === 'guidance' ? 'block' : 'hidden'}>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex-1 h-full overflow-y-auto">
                        {/* Reference Downloads & Tools in Guidance Section (Placed at Top) */}
                        <div className="mb-6 border-b border-gray-100 pb-5">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Guidance Downloads & Tools
                            </h4>
                            <div className="space-y-2">
                                <button
                                    onClick={handleDownloadExample}
                                    className="w-full flex items-center px-3 py-2.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-gray-200 transition-all shadow-sm focus:outline-none group"
                                    title="Download a template example metadata JSON file"
                                >
                                    <svg className="w-4 h-4 mr-2.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Download Example Metadata (.json)</span>
                                </button>

                                <button
                                    onClick={handleDownloadGuide}
                                    className="w-full flex items-center px-3 py-2.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-gray-200 transition-all shadow-sm focus:outline-none group"
                                    title="Download the official CRUK Datahub PDF user guide"
                                >
                                    <svg className="w-4 h-4 mr-2.5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Download User Guide (.pdf)</span>
                                </button>
                            </div>
                        </div>

                        {activeGuidance ? (
                            <div className="flex flex-col h-full">
                                {activeGuidance.title && (
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                        {activeGuidance.title}
                                    </h3>
                                )}
                                <MarkdownRenderer content={activeGuidance.guidance || activeGuidance} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm italic">Select a field on the left to view guidance.</p>
                        )}
                        {children}
                    </div>
                </div>


                {/* 2. AI IMPORT TAB */}
                <div className={activeTab === 'ai' ? 'flex flex-col h-full' : 'hidden'}>
                    <AiUploadWidget formData={formData} onFormChange={onFormChange} />
                </div>

                {/* 3. LIVE PREVIEW TAB */}
                <div className={activeTab === 'preview' ? 'flex flex-col h-full' : 'hidden'}>
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 px-2">
                            <h3 className="text-sm font-bold text-gray-800">Live Preview</h3>
                            <button
                                onClick={() => setViewMode(prev => prev === 'visual' ? 'json' : 'visual')}
                                className="text-xs font-mono text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                            >
                                {viewMode === 'visual' ? '{ } JSON' : '👁 Visual'}
                            </button>
                        </div>

                        {/* Added id="preview-container" for scoping if needed */}
                        <div id="preview-container" className="flex-1 overflow-y-auto bg-gray-50 rounded border border-gray-200 p-4">
                            {viewMode === 'json' ? (
                                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                                    {JSON.stringify(formData, null, 2)}
                                </pre>
                            ) : (
                                // --- Unified Vertical Layout ---
                                <div className="flex flex-col gap-8 pb-6">

                                    {/* Left Panel Indicator */}
                                    <div id="preview-accessibility" className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-400 border-b border-gray-200 pb-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Left Navigation Panel</span>
                                        </div>
                                        <PreviewAccessCard data={formData} onSectionClick={setActiveSection} />
                                    </div>

                                    {/* Central Panel Indicator */}
                                    <div id="preview-summary" className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-400 border-b border-gray-200 pb-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="7" y1="3" x2="7" y2="21"></line>
                                                <line x1="17" y1="3" x2="17" y2="21"></line>
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Central Main Content</span>
                                        </div>
                                        <PreviewMainContent data={formData} onSectionClick={setActiveSection} />
                                    </div>

                                    {/* Right Panel Indicator */}
                                    <div id="preview-datasetFilters" className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-400 border-b border-gray-200 pb-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="15" y1="3" x2="15" y2="21"></line>
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Right Filters Panel</span>
                                        </div>
                                        <PreviewTags data={formData} onSectionClick={setActiveSection} />
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AssistantPane;