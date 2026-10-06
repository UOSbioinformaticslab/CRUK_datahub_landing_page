import React, { useState, useEffect } from 'react';
import { Header } from './Header.jsx';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const AI_MICROSERVICE_URL = import.meta.env.VITE_MICROSERVICE_URL || "http://localhost:8001";

export const ToolUploadPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        category_id: '',
        description: '',
        results_insights: '',
        associated_authors: '',
        tech_stack: '',
        license: '',
        any_dataset: false,
    });
    
    // Dataset & Project Linking state
    const [datasetSearchText, setDatasetSearchText] = useState('');
    const [linkedDatasets, setLinkedDatasets] = useState([]);
    
    const [projectSearchText, setProjectSearchText] = useState('');
    const [linkedProjects, setLinkedProjects] = useState([]);
    const [teamProjects, setTeamProjects] = useState([]);

    // Existing Tools State for Active Team Amendment
    const [teamTools, setTeamTools] = useState([]);
    const [editingToolId, setEditingToolId] = useState(null);
    
    // AI Assistant state
    const [teamDatasets, setTeamDatasets] = useState([]);
    const [selectedAiDatasetId, setSelectedAiDatasetId] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiTools, setAiTools] = useState([]);
    const [aiError, setAiError] = useState(null);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const fetchTeamTools = (activeTeamId) => {
        if (!activeTeamId) return;
        fetch(`${API_BASE_URL}/tools/`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const teamTls = data.filter(t => t.team_id === parseInt(activeTeamId, 10));
                    setTeamTools(teamTls);
                }
            })
            .catch(err => console.error("Error fetching team tools:", err));
    };

    useEffect(() => {
        const activeTeamId = localStorage.getItem('activeTeamId');
        if (activeTeamId) {
            fetch(`${API_BASE_URL}/datasets/`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const teamDs = data.filter(d => d.team_id === parseInt(activeTeamId, 10));
                        setTeamDatasets(teamDs);
                    }
                })
                .catch(err => console.error("Error fetching datasets for AI panel:", err));
                
            fetch(`${API_BASE_URL}/projects/`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const teamProjs = data.filter(p => p.team_id === parseInt(activeTeamId, 10));
                        setTeamProjects(teamProjs);
                    }
                })
                .catch(err => console.error("Error fetching projects:", err));

            fetchTeamTools(activeTeamId);
        }
    }, []);

    const handleSelectTool = (toolIdStr) => {
        setError(null);
        setSuccess(false);
        if (!toolIdStr) {
            setEditingToolId(null);
            setFormData({
                name: '',
                url: '',
                category_id: '',
                description: '',
                results_insights: '',
                associated_authors: '',
                tech_stack: '',
                license: '',
                any_dataset: false,
            });
            setLinkedDatasets([]);
            setLinkedProjects([]);
            return;
        }

        const selected = teamTools.find(t => t.id.toString() === toolIdStr.toString());
        if (selected) {
            setEditingToolId(selected.id);
            setFormData({
                name: selected.name || '',
                url: selected.url || '',
                category_id: selected.category_id !== null && selected.category_id !== undefined ? selected.category_id : '',
                description: selected.description || '',
                results_insights: selected.results_insights || '',
                associated_authors: Array.isArray(selected.associated_authors) ? selected.associated_authors.join(', ') : (selected.associated_authors || ''),
                tech_stack: Array.isArray(selected.tech_stack) ? selected.tech_stack.join(', ') : (selected.tech_stack || ''),
                license: selected.license || '',
                any_dataset: selected.any_dataset || false,
            });
            
            const dsTitles = (selected.datasets || []).map(d =>
                d.metadata_blob?.summary?.title || d.computed_title || d.title || `Dataset ID: ${d.id}`
            );
            setLinkedDatasets(dsTitles);
            
            const projNames = (selected.projects || []).map(p =>
                p.project_grant_name || p.projectGrantName || p.metadata_blob?.project_grant_name || p.metadata_blob?.summary?.title || p.title || `Project ID: ${p.id}`
            );
            setLinkedProjects(projNames);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    const handleAddDataset = () => {
        if (datasetSearchText && !linkedDatasets.includes(datasetSearchText)) {
            setLinkedDatasets(prev => [...prev, datasetSearchText]);
            setDatasetSearchText('');
        }
    };
    
    const handleRemoveDataset = (idToRemove) => {
        setLinkedDatasets(prev => prev.filter(id => id !== idToRemove));
    };

    const handleAddProject = () => {
        if (projectSearchText && !linkedProjects.includes(projectSearchText)) {
            setLinkedProjects(prev => [...prev, projectSearchText]);
            setProjectSearchText('');
        }
    };
    
    const handleRemoveProject = (idToRemove) => {
        setLinkedProjects(prev => prev.filter(id => id !== idToRemove));
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(false);
        const token = localStorage.getItem('token');
        const activeTeamId = localStorage.getItem('activeTeamId');

        if (!token) {
            setError("You must be logged in to save a tool.");
            return;
        }
        if (!activeTeamId) {
            setError("You must select an active team before saving.");
            return;
        }
        
        let authors = [];
        if (formData.associated_authors) {
            authors = formData.associated_authors.split(',').map(s => s.trim()).filter(Boolean);
        }
        let stack = [];
        if (formData.tech_stack) {
            stack = formData.tech_stack.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Resolve linked datasets from names to IDs
        const resolvedDatasetIds = linkedDatasets.map(name => {
            const ds = teamDatasets.find(d => {
                const dName = d.metadata_blob?.summary?.title || d.computed_title || d.title || `Dataset ID: ${d.id}`;
                return dName === name;
            });
            return ds ? parseInt(ds.id, 10) : null;
        }).filter(id => id !== null);
        
        // Resolve linked projects from names to IDs
        const resolvedProjectIds = linkedProjects.map(name => {
            const proj = teamProjects.find(p => {
                const pName = p.project_grant_name || p.projectGrantName || p.metadata_blob?.project_grant_name || p.metadata_blob?.summary?.title || p.title || `Project ID: ${p.id}`;
                return pName === name;
            });
            return proj ? parseInt(proj.id, 10) : null;
        }).filter(id => id !== null);

        const payload = {
            ...formData,
            category_id: formData.category_id === '' ? null : formData.category_id,
            associated_authors: authors,
            tech_stack: stack,
            team_id: parseInt(activeTeamId, 10),
            linked_datasets: resolvedDatasetIds,
            linked_projects: resolvedProjectIds,
            status: "ACTIVE",
        };

        const endpoint = editingToolId ? `${API_BASE_URL}/tools/${editingToolId}` : `${API_BASE_URL}/tools/`;
        const method = editingToolId ? 'PUT' : 'POST';

        try {
            const res = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to save tool.");
            }

            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/src/tools.html';
            }, 1500);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteTool = async () => {
        if (!editingToolId) return;
        if (!window.confirm("Are you sure you want to delete this tool?")) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/tools/${editingToolId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to delete tool.");
            }
            alert("Tool deleted successfully.");
            window.location.href = '/src/tools.html';
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAutoDiscover = async () => {
        if (!selectedAiDatasetId) return;
        setAiError(null);
        setIsAiLoading(true);
        setAiTools([]);
        
        // Find dataset details
        const ds = teamDatasets.find(d => d.id === parseInt(selectedAiDatasetId));
        if (!ds) {
            setAiError("Dataset not found");
            setIsAiLoading(false);
            return;
        }

        const datasetName = ds.metadata_blob?.summary?.title || ds.title || "Unknown Dataset";
        const datasetAbstract = ds.metadata_blob?.summary?.abstract || "";

        try {
            const res = await fetch(`${AI_MICROSERVICE_URL}/api/tools/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataset_name: datasetName, dataset_abstract: datasetAbstract })
            });
            if (!res.ok) throw new Error("Failed to discover tools.");
            const data = await res.json();
            setAiTools(data);
        } catch (err) {
            setAiError(err.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handlePrefill = (tool) => {
        setFormData(prev => ({
            ...prev,
            name: tool.name || prev.name,
            url: tool.url || prev.url,
            description: tool.description || prev.description,
            results_insights: tool.results_insights || prev.results_insights,
            associated_authors: tool.associated_authors || prev.associated_authors,
            tech_stack: tool.tech_stack || prev.tech_stack,
            license: tool.license || prev.license
        }));
        
        // Auto-link to the selected dataset!
        if (selectedAiDatasetId) {
            const ds = teamDatasets.find(d => d.id.toString() === selectedAiDatasetId.toString());
            if (ds) {
                const displayName = ds.metadata_blob?.summary?.title || ds.title || `Dataset ID: ${ds.id}`;
                if (!linkedDatasets.includes(displayName)) {
                    setLinkedDatasets(prev => [...prev, displayName]);
                }
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <Header />
            <div className="flex-1 p-8">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT PANEL: Manual Form */}
                    <div className="w-full lg:w-2/3 bg-white p-8 rounded shadow-sm border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    {editingToolId ? "Amend Analysis Script, Tool or Software" : "Create Analysis Script, Tool or Software"}
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {editingToolId
                                        ? `Editing Tool #${editingToolId}. Changes will update this tool in-place.`
                                        : "Analysis script, tool or software can be anything you or someone else created or used during a research project."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingToolId && (
                                    <button 
                                        onClick={handleDeleteTool}
                                        className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium py-2 px-4 rounded text-sm transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        Delete Tool
                                    </button>
                                )}
                                <button onClick={handleSave} className="bg-[var(--cruk-blue)] hover:bg-blue-800 text-white font-medium py-2 px-6 rounded text-sm transition-colors shadow-sm whitespace-nowrap">
                                    {editingToolId ? "Update Tool" : "Save Tool"}
                                </button>
                            </div>
                        </div>

                        {/* Select existing tool for active team */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
                                Select uploaded tool to amend (Active Team)
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <select
                                    value={editingToolId || ''}
                                    onChange={(e) => handleSelectTool(e.target.value)}
                                    className="flex-1 bg-white border border-indigo-300 rounded px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Create New Tool --</option>
                                    {teamTools.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} (ID: {t.id})
                                        </option>
                                    ))}
                                </select>
                                {editingToolId ? (
                                    <button
                                        onClick={() => handleSelectTool('')}
                                        className="px-4 py-2 bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100 rounded text-sm font-semibold whitespace-nowrap"
                                    >
                                        + Create New Tool
                                    </button>
                                ) : (
                                    <span className="text-xs text-indigo-700 italic flex items-center">
                                        {teamTools.length} tool(s) found in active team
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-6 text-sm border border-red-200">{error}</div>}
                        {success && <div className="bg-green-50 text-green-600 p-4 rounded mb-6 text-sm border border-green-200">Successfully saved! Redirecting...</div>}
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL or Github link</label>
                                <p className="text-xs text-gray-400 mb-2">Where can we find this analysis script, tool or software?</p>
                                <input type="text" name="url" value={formData.url} onChange={handleChange} className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Results / Insights</label>
                                <textarea name="results_insights" value={formData.results_insights} onChange={handleChange} rows="4" className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                                <input type="text" name="associated_authors" value={formData.associated_authors} onChange={handleChange} placeholder="e.g. Jane Doe, John Smith" className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack (comma separated)</label>
                                    <input type="text" name="tech_stack" value={formData.tech_stack} onChange={handleChange} placeholder="e.g. Python, R, React" className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
                                    <input type="text" name="license" list="license-options" value={formData.license} onChange={handleChange} placeholder="e.g. MIT, GPL-3.0" className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                    <datalist id="license-options">
                                        <option value="MIT" />
                                        <option value="GPL-3.0" />
                                        <option value="Apache-2.0" />
                                        <option value="BSD-3-Clause" />
                                        <option value="Proprietary" />
                                        <option value="Open Access" />
                                    </datalist>
                                </div>
                            </div>
                            
                            <hr />
                            
                            {/* Linking Datasets and Projects */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link to Datasets</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={datasetSearchText} 
                                            onChange={(e) => setDatasetSearchText(e.target.value)} 
                                            placeholder="Search dataset by name..." 
                                            list="dataset-options"
                                            className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" 
                                        />
                                        <datalist id="dataset-options">
                                            {teamDatasets.map(ds => {
                                                const displayName = ds.metadata_blob?.summary?.title || ds.title || `Dataset ID: ${ds.id}`;
                                                return <option key={ds.id} value={displayName} />;
                                            })}
                                        </datalist>
                                        <button onClick={handleAddDataset} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700">Add</button>
                                    </div>
                                    {linkedDatasets.length > 0 && (
                                        <ul className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                            {linkedDatasets.map(name => {
                                                return (
                                                    <li key={name} className="flex justify-between items-center mb-1">
                                                        <span className="truncate pr-2 text-[13px]" title={name}>{name}</span>
                                                        <button onClick={() => handleRemoveDataset(name)} className="text-red-500 hover:text-red-700 text-xs whitespace-nowrap">Remove</button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link to Projects</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={projectSearchText} 
                                            onChange={(e) => setProjectSearchText(e.target.value)} 
                                            placeholder="Search project by name..." 
                                            list="project-options"
                                            className="w-full border border-teal-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" 
                                        />
                                        <datalist id="project-options">
                                            {teamProjects.map(proj => {
                                                const displayName = proj.project_grant_name || proj.projectGrantName || proj.title || `Project ID: ${proj.id}`;
                                                return <option key={proj.id} value={displayName} />;
                                            })}
                                        </datalist>
                                        <button onClick={handleAddProject} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700">Add</button>
                                    </div>
                                    {linkedProjects.length > 0 && (
                                        <ul className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                            {linkedProjects.map(name => (
                                                <li key={name} className="flex justify-between items-center mb-1">
                                                    <span className="truncate pr-2 text-[13px]" title={name}>{name}</span>
                                                    <button onClick={() => handleRemoveProject(name)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center text-sm font-medium text-gray-700">
                                    <input type="checkbox" name="any_dataset" checked={formData.any_dataset} onChange={handleChange} className="mr-2" />
                                    Can this tool be used with any dataset?
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: AI Assistant */}
                    <div className="w-full lg:w-1/3 bg-gradient-to-b from-blue-50 to-white p-6 rounded shadow-sm border border-blue-100 flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-blue-900 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                AI Auto-Discovery
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">Let our AI find tools used with your datasets on GitHub.</p>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Dataset</label>
                                <select 
                                    className="w-full border border-blue-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    value={selectedAiDatasetId}
                                    onChange={(e) => setSelectedAiDatasetId(e.target.value)}
                                >
                                    <option value="">-- Choose a dataset --</option>
                                    {teamDatasets.map(ds => (
                                        <option key={ds.id} value={ds.id}>{ds.metadata_blob?.summary?.title || ds.title || `Dataset ${ds.id}`}</option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                onClick={handleAutoDiscover} 
                                disabled={!selectedAiDatasetId || isAiLoading}
                                className={`w-full py-2 px-4 rounded font-medium text-sm transition-colors flex justify-center items-center ${!selectedAiDatasetId || isAiLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-sm`}
                            >
                                {isAiLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Searching GitHub...
                                    </>
                                ) : "Auto-discover tools"}
                            </button>

                            {aiError && <div className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">{aiError}</div>}
                            
                            {aiTools.length > 0 && (
                                <div className="mt-6 space-y-3">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Suggestions</h3>
                                    {aiTools.map((tool, idx) => (
                                        <div key={idx} className="bg-white border border-blue-200 rounded p-4 hover:border-blue-400 transition-colors shadow-sm group">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{tool.name}</h4>
                                                <button 
                                                    onClick={() => handlePrefill(tool)}
                                                    className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Use This
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {tool.tech_stack && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{tool.tech_stack}</span>}
                                                {tool.license && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{tool.license}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!isAiLoading && aiTools.length === 0 && selectedAiDatasetId && !aiError && (
                                <p className="text-xs text-gray-500 italic text-center mt-4">Click discover to find tools.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
