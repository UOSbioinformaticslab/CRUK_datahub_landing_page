import React, { useState, useEffect } from 'react';
import { Header } from './Header.jsx';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const ToolPage = () => {
    const [tool, setTool] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const toolId = urlParams.get('id');

        if (!toolId) {
            setError("No tool ID specified.");
            setIsLoading(false);
            return;
        }

        fetch(`${API_BASE_URL}/tools/${toolId}`)
            .then(res => {
                if (!res.ok) throw new Error("Tool not found");
                return res.json();
            })
            .then(data => {
                setTool(data);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) return <div className="text-center py-10 text-gray-500 font-medium">Loading tool metadata...</div>;
    if (error) return <div className="text-center py-10 text-red-600 font-medium">Error: {error}</div>;
    if (!tool) return null;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <div className="flex-1 overflow-auto">
                {/* Banner using CRUK Blue Palette */}
                <div className="bg-gradient-to-r from-[#00468C] to-[#002D5C] text-white py-10 px-8 shadow-md">
                    <div className="max-w-6xl mx-auto">
                        {/* Back button to tools directory */}
                        <a
                            href="/src/tools.html"
                            className="inline-flex items-center text-sm font-semibold tracking-wider text-blue-100 hover:text-white hover:underline uppercase mb-3 transition-colors group"
                        >
                            <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Back to Tools Directory
                        </a>

                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">{tool.name}</h1>
                        
                        {tool.url && (
                            <a
                                href={tool.url.startsWith('http') ? tool.url : `https://${tool.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm font-medium text-blue-100 hover:text-white hover:underline transition-colors bg-white/10 px-3 py-1.5 rounded-md backdrop-blur-sm"
                            >
                                <span>View Source / Website</span>
                                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        )}
                    </div>
                </div>

                {/* Content Layout: Main Panel on LEFT (w-2/3), Metadata on RIGHT (w-1/3) */}
                <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col md:flex-row gap-8">
                    
                    {/* LEFT COLUMN: Main Panel (Description, Results & Insights) */}
                    <div className="w-full md:w-2/3 space-y-8">
                        <section>
                            <h2 className="text-xl font-bold text-[#00468C] border-b pb-2 mb-4 flex items-center">
                                Description
                            </h2>
                            <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                {tool.description || 'No description provided.'}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-[#00468C] border-b pb-2 mb-4 flex items-center">
                                Results & Insights
                            </h2>
                            <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                {tool.results_insights || 'No results/insights provided.'}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Metadata Panel */}
                    <div className="w-full md:w-1/3 space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-[#00468C] border-b pb-2 mb-4">Metadata</h3>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">License</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{tool.license || 'Not specified'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tech Stack / Language</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">
                                        {tool.tech_stack ? (Array.isArray(tool.tech_stack) ? tool.tech_stack.join(', ') : tool.tech_stack) : 'Not specified'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Authors</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">
                                        {tool.associated_authors && tool.associated_authors.length > 0 
                                            ? tool.associated_authors.join(', ') 
                                            : 'Not specified'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Linked Datasets</dt>
                                    <dd className="mt-1 text-sm text-gray-900 flex flex-wrap gap-1.5">
                                        {tool.datasets && tool.datasets.length > 0 ? (
                                            tool.datasets.map(ds => (
                                                <a key={ds.id} href={`/src/meta?id=${ds.id}`} className="text-xs bg-blue-50 text-[#00468C] border border-blue-200 px-2 py-1 rounded font-medium hover:underline">
                                                    {ds.computed_title || ds.title || `Dataset ${ds.id}`}
                                                </a>
                                            ))
                                        ) : <span className="text-gray-400 italic">None linked</span>}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">Linked Projects</dt>
                                    <dd className="mt-1 text-sm text-gray-900 flex flex-wrap gap-1.5">
                                        {tool.projects && tool.projects.length > 0 ? (
                                            tool.projects.map(proj => (
                                                <a key={proj.id} href={`/src/project_meta?pid=${proj.id}`} className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1 rounded font-medium hover:underline">
                                                    {proj.project_grant_name || proj.projectGrantName || proj.title || `Project ${proj.id}`}
                                                </a>
                                            ))
                                        ) : <span className="text-gray-400 italic">None linked</span>}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
