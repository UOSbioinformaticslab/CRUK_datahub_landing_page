import React, { useState, useEffect } from 'react';
import { getToolUrl } from '../utils/urlUtils';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const DataCustodian = () => {
    const [teamData, setTeamData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team_id');

        if (!teamId) {
            setError("No team specified.");
            setIsLoading(false);
            return;
        }

        fetch(`${API_BASE_URL}/teams/${teamId}/assets`)
            .then(res => {
                if (!res.ok) throw new Error("Team not found");
                return res.json();
            })
            .then(data => {
                setTeamData(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching team assets:", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) return <div className="text-center py-10">Loading...</div>;
    if (error) return <div className="text-center py-10 text-red-600">Error: {error}</div>;
    if (!teamData) return null;

    const { team, datasets, projects, publications, tools } = teamData;
    
    const sortedProjects = [...projects].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const sortedDatasets = [...datasets].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const sortedPublications = [...publications].sort((a, b) => (a.paper_title || '').localeCompare(b.paper_title || ''));
    const sortedTools = [...(tools || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <div className="flex-grow overflow-hidden h-[calc(100vh-40px)]">
            <div className="flex flex-col md:flex-row h-full">
                {/* Sticky Sidebar Navigation */}
                <div className="w-full md:w-1/4 h-full bg-white shadow-md p-6 overflow-y-auto flex flex-col z-10 border-r border-gray-100">
                    <div className="mb-6">
                        <a href="./data_custodians.html" className="text-blue-600 hover:underline font-medium text-sm">← Back to all custodians</a>
                    </div>
                    <h3 className="text-xl font-bold text-blue-900 mb-6 border-b pb-2">Overview</h3>
                    <ul className="space-y-3">
                        <li><a href="#projects" className="block text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Projects ({sortedProjects.length})</a></li>
                        <li><a href="#datasets" className="block text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Datasets ({sortedDatasets.length})</a></li>
                        <li><a href="#publications" className="block text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Publications ({sortedPublications.length})</a></li>
                        <li><a href="#tools" className="block text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Tools & Software (0)</a></li>
                    </ul>
                </div>

                {/* Main Content Area */}
                <div className="w-full md:w-3/4 h-full bg-white overflow-y-auto relative">
                    {/* Header (sticky inside scrollable area) */}
                    <div className="sticky top-0 z-20 bg-white px-8 pt-8 pb-4 mb-8 border-b border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Data Custodian Profile</span>
                        </div>
                        {team.url ? (
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                                <a href={team.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{team.name}</a>
                            </h1>
                        ) : (
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{team.name}</h1>
                        )}
                        {team.introduction && (
                            <p className="text-gray-600 text-base md:text-lg max-w-4xl leading-relaxed whitespace-pre-wrap">{team.introduction}</p>
                        )}
                    </div>

                    <div className="px-8 space-y-12 pb-12">
                        {/* Projects Section */}
                        <section id="projects" className="scroll-mt-40">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Projects ({sortedProjects.length})</h2>
                            {sortedProjects.length > 0 ? (
                                <ul className="space-y-3">
                                    {sortedProjects.map(p => (
                                        <li key={p.id}>
                                            <a href={`/src/project_meta?pid=${p.id}`} className="text-lg font-medium text-blue-600 hover:underline break-all">
                                                {p.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No public projects available.</p>
                            )}
                        </section>

                        {/* Datasets Section */}
                        <section id="datasets" className="scroll-mt-40">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Datasets ({sortedDatasets.length})</h2>
                            {sortedDatasets.length > 0 ? (
                                <ul className="space-y-3">
                                    {sortedDatasets.map(ds => (
                                        <li key={ds.id}>
                                            <a href={`/src/meta?id=${ds.id}`} className="text-lg font-medium text-blue-600 hover:underline break-all">
                                                {ds.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No public datasets available.</p>
                            )}
                        </section>

                        {/* Publications Section */}
                        <section id="publications" className="scroll-mt-40">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2 border-b pb-2">Publications ({sortedPublications.length})</h2>
                            <p className="text-sm text-gray-500 mb-6">(Links are external)</p>
                            {sortedPublications.length > 0 ? (
                                <div className="space-y-6">
                                    {sortedPublications.map(pub => (
                                        <div key={pub.id} className="flex flex-col">
                                            {pub.url ? (
                                                <h3 className="font-bold text-gray-800 text-lg mb-1">
                                                    <a href={pub.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 break-all">
                                                        {pub.paper_title}
                                                    </a>
                                                </h3>
                                            ) : (
                                                <h3 className="font-bold text-gray-800 text-lg mb-1 break-words">{pub.paper_title}</h3>
                                            )}
                                            <p className="text-sm text-gray-600">{pub.journal_name} ({pub.year_of_publication})</p>
                                            <p className="text-xs text-gray-400 mt-1">DOI: {pub.paper_doi}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No associated publications.</p>
                            )}
                        </section>

                        {/* Tools Section */}
                        <section id="tools" className="scroll-mt-40">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Tools & Software ({sortedTools.length})</h2>
                            {sortedTools.length > 0 ? (
                                <ul className="space-y-3">
                                    {sortedTools.map(t => (
                                        <li key={t.id}>
                                            <a href={getToolUrl(t.id)} className="text-lg font-medium text-blue-600 hover:underline break-all">
                                                {t.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No tools or software currently listed for this custodian.</p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
