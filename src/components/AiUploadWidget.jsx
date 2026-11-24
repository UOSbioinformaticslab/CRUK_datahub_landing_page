import React, { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const MICROSERVICE_URL = import.meta.env.VITE_MICROSERVICE_URL || "http://localhost:8001";

const AiUploadWidget = ({ formData, onFormChange }) => {
    const [dragActive, setDragActive] = useState(false);
    const [processingState, setProcessingState] = useState('idle'); // 'idle', 'processing', 'conflict', 'done', 'error'
    const [conflicts, setConflicts] = useState([]);
    const [resolvedData, setResolvedData] = useState({});
    const [errorMsg, setErrorMsg] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            startProcessing(e.dataTransfer.files[0]);
        }
    }, [formData]);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            startProcessing(e.target.files[0]);
        }
    };

    const startProcessing = async (file) => {
        const isSandbox = localStorage.getItem('isSandboxTeam') === 'true';
        if (isSandbox) {
            setErrorMsg("AI metadata extraction is disabled in Sandbox mode.");
            setProcessingState('error');
            return;
        }

        setProcessingState('processing');
        setErrorMsg(null);

        try {
            const payload = new FormData();
            payload.append('file', file);
            if (formData) {
                payload.append('current_form_data', JSON.stringify(formData));
            }

            const response = await fetch(`${MICROSERVICE_URL}/api/extract-metadata`, {
                method: 'POST',
                headers: {
                    'X-Is-Sandbox': isSandbox ? 'true' : 'false'
                },
                body: payload
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to extract metadata');
            }

            const data = await response.json();
            const { dataset, conflicts: backendConflicts } = data;

            if (backendConflicts && backendConflicts.length > 0) {
                const uiConflicts = backendConflicts.map(c => ({
                    ...c,
                    choice: 'devised'
                }));
                setConflicts(uiConflicts);
                setResolvedData(dataset);
                setProcessingState('conflict');
            } else {
                applyUpdates(dataset);
                setProcessingState('done');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message);
            setProcessingState('error');
        }
    };

    const applyUpdates = (datasetObj) => {
        // Iterate through top-level sections and apply them
        Object.keys(datasetObj).forEach(key => {
            if (datasetObj[key] !== null) {
                onFormChange([key], datasetObj[key]);
            }
        });
    };

    const handleResolveConflict = (index, choice) => {
        const newConflicts = [...conflicts];
        newConflicts[index].choice = choice;
        setConflicts(newConflicts);
    };

    const setNestedValue = (obj, path, value) => {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {};
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
    };

    const applyResolvedConflicts = () => {
        // Deep clone to safely mutate
        const finalDataset = JSON.parse(JSON.stringify(resolvedData));

        conflicts.forEach(c => {
            let finalValue = c.devised;
            if (c.choice === 'original') finalValue = c.original || '';
            if (c.choice === 'incoming') finalValue = c.incoming || '';
            if (c.choice === 'devised') finalValue = c.devised || '';

            setNestedValue(finalDataset, c.path, finalValue);
        });

        applyUpdates(finalDataset);
        setProcessingState('done');
    };

    const resetWidget = () => {
        setProcessingState('idle');
        setConflicts([]);
        setResolvedData({});
        setErrorMsg(null);
    };

    return (
        <div className="flex flex-col h-full bg-white text-sm">
            <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">AI Document Extraction</h3>
                <p className="text-gray-500 text-xs mt-1">Upload a PDF or document to automatically extract dataset metadata.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {processingState === 'idle' && (
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <svg className="w-10 h-10 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p className="text-gray-600 mb-2">Drag and drop your document here</p>
                        <p className="text-xs text-gray-400 mb-4">Supported: PDF, DOCX, PPTX, TXT, XLS/XLSX</p>

                        <label className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 cursor-pointer text-sm font-medium transition-colors">
                            Browse Files
                            <input type="file" className="hidden" onChange={handleChange} />
                        </label>
                    </div>
                )}

                {processingState === 'processing' && (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-700 font-medium text-center">Analyzing document...</p>
                        <p className="text-xs text-gray-500 mt-2 text-center max-w-xs">Extracting metadata and finding conflicts using Gemini AI.</p>
                    </div>
                )}

                {processingState === 'error' && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-800">
                            <h4 className="font-bold mb-1 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Extraction Failed
                            </h4>
                            <p className="text-sm">{errorMsg || "An unexpected error occurred during extraction."}</p>
                        </div>
                        <button
                            onClick={resetWidget}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {processingState === 'conflict' && (
                    <div className="flex flex-col gap-6">
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-800 rounded">
                            <p className="font-bold mb-1">Conflicts Detected</p>
                            <p className="text-xs">The uploaded document contains information that conflicts with existing data in the form. Please review the AI's suggested merged text.</p>
                        </div>

                        {conflicts.map((conflict, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                    <span className="font-mono text-xs font-bold text-gray-700">{conflict.path.join('.')}</span>
                                </div>

                                {conflict.contradiction && (
                                    <div className="bg-red-50 text-red-700 p-2 text-xs border-b border-red-100 flex items-start gap-2">
                                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        <span><strong>Contradiction Flagged:</strong> {conflict.contradiction}</span>
                                    </div>
                                )}

                                <div className="p-4 flex flex-col gap-4">
                                    {/* AI Devised (Recommended) */}
                                    <label className={`block border p-3 rounded-md cursor-pointer transition-colors ${conflict.choice === 'devised' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input type="radio" checked={conflict.choice === 'devised'} onChange={() => handleResolveConflict(index, 'devised')} className="text-indigo-600 focus:ring-indigo-500" />
                                            <span className="font-bold text-indigo-900 text-xs uppercase tracking-wider">AI Devised Text</span>
                                        </div>
                                        <div className="text-gray-700 text-sm pl-5 whitespace-pre-wrap">{conflict.devised}</div>
                                    </label>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Original */}
                                        <label className={`block border p-3 rounded-md cursor-pointer transition-colors ${conflict.choice === 'original' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input type="radio" checked={conflict.choice === 'original'} onChange={() => handleResolveConflict(index, 'original')} className="text-indigo-600 focus:ring-indigo-500" />
                                                <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">Keep Existing</span>
                                            </div>
                                            <div className="text-gray-500 text-xs pl-5 line-clamp-4">{conflict.original}</div>
                                        </label>

                                        {/* Incoming */}
                                        <label className={`block border p-3 rounded-md cursor-pointer transition-colors ${conflict.choice === 'incoming' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input type="radio" checked={conflict.choice === 'incoming'} onChange={() => handleResolveConflict(index, 'incoming')} className="text-indigo-600 focus:ring-indigo-500" />
                                                <span className="font-bold text-gray-700 text-xs uppercase tracking-wider">Use New Text Only</span>
                                            </div>
                                            <div className="text-gray-500 text-xs pl-5 line-clamp-4">{conflict.incoming}</div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={applyResolvedConflicts}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Apply Selected Resolutions
                        </button>
                    </div>
                )}

                {processingState === 'done' && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Extraction Complete</h4>
                        <p className="text-gray-500 text-center mb-6">Metadata has been successfully extracted and applied to the form.</p>
                        <button
                            onClick={resetWidget}
                            className="text-indigo-600 font-semibold hover:text-indigo-800 text-sm"
                        >
                            Upload another document
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiUploadWidget;
