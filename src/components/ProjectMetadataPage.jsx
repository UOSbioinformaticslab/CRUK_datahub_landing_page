import React, { useState, useEffect, useMemo } from 'react';
import { getToolUrl, getDatasetUrl, getPageUrl } from '../utils/urlUtils';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const ProjectMetadataPage = () => {
    const [project, setProject] = useState(null);
    const [datasetId, setDatasetId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Section overflow toggles for projects with many linked items
    const [showAllDatasets, setShowAllDatasets] = useState(false);
    const [showAllPublications, setShowAllPublications] = useState(false);
    const [showAllTools, setShowAllTools] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                setIsLoading(true);
                const params = new URLSearchParams(window.location.search);
                const projectPid = encodeURIComponent(params.get('pid'));
                const dsId = params.get('datasetId'); // Optional: for the return link

                if (!projectPid || projectPid === 'null' || projectPid === 'undefined') {
                    throw new Error("Project ID is missing from the URL.");
                }

                if (dsId) {
                    setDatasetId(dsId);
                }

                const response = await fetch(`${API_BASE_URL}/projects/${projectPid}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Project not found.");
                    }
                    throw new Error("Failed to fetch project from the server.");
                }

                const data = await response.json();
                setProject(data);
                setError(null);
            } catch (err) {
                console.error("Failed to load project:", err);
                setError(err.message || "Project not found or could not be loaded.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, []);

    const datasets = useMemo(() => {
        if (!project) return [];
        let dsList = project.datasets ? [...project.datasets] : [];
        if (datasetId || project.dataset_id) {
            const idToEnsure = parseInt(datasetId || project.dataset_id, 10);
            if (!isNaN(idToEnsure) && !dsList.some(d => d.id === idToEnsure)) {
                dsList.unshift({ id: idToEnsure, title: `Dataset ${idToEnsure}` });
            }
        }
        return dsList;
    }, [project, datasetId]);

    const publications = useMemo(() => (project ? project.publications || [] : []), [project]);
    const tools = useMemo(() => (project ? project.tools || [] : []), [project]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 bg-gray-50">
                <p className="text-xl text-gray-600 font-semibold">Loading project data...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex flex-col justify-center items-center py-20 px-4 bg-gray-50">
                <p className="text-xl text-red-600 font-semibold mb-4">{error}</p>
                <a href={getPageUrl('projects')} className="text-[#00468C] hover:underline font-medium">
                    ← Back to Projects Directory
                </a>
            </div>
        );
    }

    const enrichmentAndLinkage = project.enrichmentAndLinkage || {};

    return (
        <div className="bg-gray-50 font-sans text-gray-800 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                    
                    {/* Top Navigation */}
                    <div className="mb-6">
                        <a href={getPageUrl('projects')} className="inline-flex items-center text-sm font-semibold text-[#00468C] hover:underline gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Back to Projects Directory
                        </a>
                    </div>

                    {/* Navigation / Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-[#00468C] mb-2">
                            {project.project_grant_name || project.title || "Unnamed Project"}
                        </h1>
                    </div>

                    {/* Project Details Card */}
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <span className="block text-xs font-bold text-[#00468C] uppercase tracking-wide mb-1">
                                    Lead Researcher
                                </span>
                                <p className="text-base font-semibold text-gray-800 m-0">
                                    {project.lead_researcher || "N/A"} 
                                    {project.lead_research_institute && (
                                        <span className="text-sm font-normal text-gray-600 italic ml-2">
                                            ({project.lead_research_institute})
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div>
                                <span className="block text-xs font-bold text-[#00468C] uppercase tracking-wide mb-1">
                                    Timeline
                                </span>
                                <p className="text-base text-gray-800 m-0">
                                    {project.project_grant_start_date ? project.project_grant_start_date.split('T')[0].split(' ')[0] : "Unknown"} to {project.project_grant_end_date ? project.project_grant_end_date.split('T')[0].split(' ')[0] : "Ongoing"}
                                </p>
                            </div>

                            <div>
                                <span className="block text-xs font-bold text-[#00468C] uppercase tracking-wide mb-1">
                                    Grant Number(s)
                                </span>
                                <p className="text-base font-mono text-gray-700 m-0">
                                    {project.grant_numbers || project.grant_number || "N/A"}
                                </p>
                            </div>

                            <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                                <span className="block text-xs font-bold text-[#00468C] uppercase tracking-wide mb-2">
                                    Project Scope
                                </span>
                                <p className="text-base text-gray-700 m-0 leading-relaxed whitespace-pre-wrap">
                                    {project.project_grant_scope || "No scope provided."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* LINKED DATASETS SECTION */}
                    {datasets.length > 0 && (
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                <h2 className="text-xl md:text-2xl font-bold text-[#00468C] flex items-center gap-2">
                                    <span>Linked Datasets</span>
                                    <span className="text-xs font-bold bg-blue-50 text-[#00468C] px-2.5 py-0.5 rounded-full border border-blue-200">
                                        {datasets.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {(showAllDatasets ? datasets : datasets.slice(0, 4)).map((ds) => {
                                    const title = ds.computed_title || ds.title || `Dataset ${ds.id}`;
                                    return (
                                        <div key={ds.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <a href={getDatasetUrl(ds.id)} className="text-base font-bold text-[#00468C] hover:text-[#002D5C] hover:underline truncate block">
                                                    {title}
                                                </a>
                                                {ds.datasetid && (
                                                    <span className="text-xs font-mono text-gray-500">ID: {ds.datasetid}</span>
                                                )}
                                            </div>
                                            <a
                                                href={getDatasetUrl(ds.id)}
                                                className="inline-flex items-center text-xs font-medium text-[#00468C] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md transition-colors shrink-0"
                                            >
                                                View Dataset Metadata →
                                            </a>
                                        </div>
                                    );
                                })}

                                {datasets.length > 4 && (
                                    <button
                                        onClick={() => setShowAllDatasets(!showAllDatasets)}
                                        className="mt-2 text-sm font-semibold text-[#00468C] hover:underline flex items-center gap-1 focus:outline-none"
                                    >
                                        {showAllDatasets ? `Show less ▲` : `Show all ${datasets.length} datasets ▼`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LINKED PUBLICATIONS SECTION */}
                    {publications.length > 0 && (
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                <h2 className="text-xl md:text-2xl font-bold text-[#00468C] flex items-center gap-2">
                                    <span>Linked Publications</span>
                                    <span className="text-xs font-bold bg-blue-50 text-[#00468C] px-2.5 py-0.5 rounded-full border border-blue-200">
                                        {publications.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {(showAllPublications ? publications : publications.slice(0, 4)).map((pub) => {
                                    const authorsFormatted = pub.authors && pub.authors.length > 0
                                        ? (pub.authors.length > 1 ? `${pub.authors[0]} et al.` : pub.authors[0])
                                        : null;
                                    const pubUrl = pub.url || (pub.paper_doi ? (pub.paper_doi.startsWith('http') ? pub.paper_doi : `https://doi.org/${pub.paper_doi}`) : null);

                                    return (
                                        <div key={pub.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all">
                                            <h3 className="text-base font-bold text-gray-900 mb-1 flex flex-wrap items-baseline gap-1">
                                                <span>{pub.paper_title}</span>
                                                {pubUrl && (
                                                    <a
                                                        href={pubUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-semibold text-[#00468C] hover:underline ml-1"
                                                    >
                                                        (external link to paper →)
                                                    </a>
                                                )}
                                            </h3>
                                            <div className="text-xs text-gray-600 flex flex-wrap gap-2 items-center mt-2">
                                                {authorsFormatted && <span>{authorsFormatted}</span>}
                                                {authorsFormatted && pub.journal_name && <span>•</span>}
                                                {pub.journal_name && <span className="font-medium text-gray-800">{pub.journal_name}</span>}
                                                {pub.year_of_publication && <span>({pub.year_of_publication})</span>}
                                                {pub.paper_doi && (
                                                    <span className="ml-auto text-xs bg-gray-100 font-mono text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                                        DOI: {pub.paper_doi}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {publications.length > 4 && (
                                    <button
                                        onClick={() => setShowAllPublications(!showAllPublications)}
                                        className="mt-2 text-sm font-semibold text-[#00468C] hover:underline flex items-center gap-1 focus:outline-none"
                                    >
                                        {showAllPublications ? `Show less ▲` : `Show all ${publications.length} publications ▼`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TOOLS & SOFTWARE SECTION */}
                    {tools.length > 0 && (
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                <h2 className="text-xl md:text-2xl font-bold text-[#00468C] flex items-center gap-2">
                                    <span>Tools & Software</span>
                                    <span className="text-xs font-bold bg-blue-50 text-[#00468C] px-2.5 py-0.5 rounded-full border border-blue-200">
                                        {tools.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {(showAllTools ? tools : tools.slice(0, 4)).map((t) => {
                                    const firstLineDesc = t.description ? t.description.split('\n')[0].trim() : '';
                                    const externalUrl = t.url ? (t.url.startsWith('http') ? t.url : `https://${t.url}`) : null;

                                    return (
                                        <div key={t.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <a href={getToolUrl(t.id)} className="text-base font-bold text-[#00468C] hover:text-[#002D5C] hover:underline block truncate">
                                                    {t.name}
                                                </a>
                                                {firstLineDesc && (
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">{firstLineDesc}</p>
                                                )}
                                            </div>
                                            {externalUrl && (
                                                <a
                                                    href={externalUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-xs font-medium text-[#00468C] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md transition-colors shrink-0"
                                                >
                                                    View External URL →
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}

                                {tools.length > 4 && (
                                    <button
                                        onClick={() => setShowAllTools(!showAllTools)}
                                        className="mt-2 text-sm font-semibold text-[#00468C] hover:underline flex items-center gap-1 focus:outline-none"
                                    >
                                        {showAllTools ? `Show less ▲` : `Show all ${tools.length} tools ▼`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Enrichment & Linkage Section (Legacy / Dynamic) */}
                    {Object.keys(enrichmentAndLinkage).length > 0 && (
                        <div className="mb-10">
                            <div className="flex justify-between items-end mb-4 pb-2 border-b border-gray-200">
                                <h2 className="text-xl md:text-2xl font-bold text-[#00468C]">
                                    Enrichment & Linkage
                                </h2>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(enrichmentAndLinkage).map(([key, value]) => {
                                    if (!value || (Array.isArray(value) && value.length === 0)) return null;

                                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                                    const getHref = (str) => {
                                        if (typeof str !== 'string') return null;
                                        if (str.startsWith('http')) return str;
                                        if (str.startsWith('10.')) return `https://doi.org/${str}`;
                                        return null;
                                    };

                                    return (
                                        <div key={key}>
                                            <h4 className="font-bold text-[#00468C] uppercase tracking-wide mb-2 text-xs">{formattedKey}</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 break-words">
                                                {Array.isArray(value) ? value.map((item, idx) => {
                                                    if (typeof item === 'object' && item !== null) {
                                                        const displayText = `${item.title || ''} ${item.pid ? `[${item.pid}]` : ''}`.trim() || item.url;
                                                        const href = getHref(item.url);

                                                        return (
                                                            <li key={idx}>
                                                                {href ? (
                                                                    <a href={href} target="_blank" rel="noreferrer" className="text-[#00468C] hover:underline transition-colors">
                                                                        {displayText}
                                                                    </a>
                                                                ) : (
                                                                    <span>{displayText}</span>
                                                                )}
                                                            </li>
                                                        );
                                                    }

                                                    const href = getHref(item);
                                                    return (
                                                        <li key={idx}>
                                                            {href ? (
                                                                <a href={href} target="_blank" rel="noreferrer" className="text-[#00468C] hover:underline transition-colors break-all">
                                                                    {item}
                                                                </a>
                                                            ) : (
                                                                <span>{item}</span>
                                                            )}
                                                        </li>
                                                    );
                                                }) : <li>{value}</li>}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
    );
};