import React, { useMemo, useState } from 'react';

import { getExtra } from '../utils/getExtra.js';
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
console.log("🔍 Diagnostic: VITE_BACKEND_URL =", import.meta.env.VITE_BACKEND_URL, "| Active API_BASE_URL =", API_BASE_URL);

// --- Icons ---
const TrashIcon = () => (
    <svg className="w-3.5 h-3.5 mr-1.5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

const DownloadIcon = () => (
    <svg className="w-3.5 h-3.5 mr-1.5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
);

const ActiveIcon = () => (
    <svg className="w-3.5 h-3.5 mr-1.5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
);

const SaveIcon = () => (
    <svg className="w-3.5 h-3.5 mr-1.5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
);

const ChartIcon = () => (
    <svg className="w-4 h-4 mr-2 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
);

const InfoIcon = () => (
    <svg className="w-3.5 h-3.5 ml-1 opacity-70 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

// --- Component ---
const UploadTopBar = ({ formData, schema, prefixIconMapping, pageType, onDeleteSuccess, datasetStatus, onSaveSuccess }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // --- 1. Helper Logic ---

    const resolveRef = (ref) => {
        if (!ref || typeof ref !== 'string' || !ref.startsWith('#/$defs/')) return null;
        const defKey = ref.split('/').pop();
        return schema.$defs ? schema.$defs[defKey] : null;
    };

    const getDefinition = (prop) => {
        let definition = prop;
        let ref = prop.$ref || prop.allOf?.find(i => i.$ref)?.$ref || prop.anyOf?.find(i => i.$ref)?.$ref;
        if (ref) definition = resolveRef(ref);
        return definition || prop;
    };

    const isEmpty = (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        if (Array.isArray(value) && value.length === 0) return true;
        if (typeof value === 'object' && Object.keys(value).length === 0) return true;
        return false;
    };

    const associateIcons = (data, mapping) => {
        if (!data.datasetFilters || !Array.isArray(data.datasetFilters) || !mapping) {
            return { ...data, icons: [] };
        }
        const dataIds = data.datasetFilters
            .map(item => (typeof item === 'object' ? item.id : item))
            .filter(id => id && id.startsWith("0_2"));

        const uniqueIcons = new Set();
        dataIds.forEach(id => {
            const trunc5 = id.substring(0, 5);
            const trunc7 = id.substring(0, 7);
            if (mapping[trunc5]) uniqueIcons.add(mapping[trunc5]);
            if (mapping[trunc7]) uniqueIcons.add(mapping[trunc7]);
        });

        return { ...data, icons: Array.from(uniqueIcons) };
    };

    const completionStats = useMemo(() => {
        let reqTotal = 0;
        let reqFilled = 0;
        let optTotal = 0;
        let optFilled = 0;

        if (!schema || !schema.properties) return { req: 0, opt: 0 };

        Object.keys(schema.properties).forEach(sectionKey => {
            const sectionSchema = schema.properties[sectionKey];
            const definition = getDefinition(sectionSchema);
            const sectionData = formData[sectionKey] || {};

            if (definition && definition.properties) {
                const requiredProps = definition.required || [];
                const allProps = Object.keys(definition.properties);

                allProps.forEach(propKey => {
                    const isReq = requiredProps.includes(propKey);
                    const value = sectionData[propKey];
                    const filled = !isEmpty(value);

                    if (isReq) {
                        reqTotal++;
                        if (filled) reqFilled++;
                    } else {
                        optTotal++;
                        if (filled) optFilled++;
                    }
                });
            }
        });

        const filters = formData['datasetFilters'];
        reqTotal++;
        if (filters && filters.length > 0) reqFilled++;

        const reqPercent = reqTotal === 0 ? 100 : Math.round((reqFilled / reqTotal) * 100);
        const optPercent = optTotal === 0 ? 100 : Math.round((optFilled / optTotal) * 100);

        return { req: reqPercent, opt: optPercent };
    }, [formData, schema]);

    const isProject = pageType === 'project';
    const existingId = isProject ? (formData.pid || formData.id) : (formData.datasetid || formData.id);
    const isUpdate = !!existingId;
    const recordTitle = formData.projectGrantName || formData.summary?.title || (existingId ? `${isProject ? 'Project' : 'Dataset'} #${existingId}` : null) || (isProject ? "New Project Record" : "New Dataset Record");

    // --- 2. Action Handlers ---

    const handleDownloadProgress = () => {
        try {
            let processedData = associateIcons(formData, prefixIconMapping);

            if (processedData.summary) {
                const summarySchema = schema.properties?.summary;
                let summaryDef = summarySchema;
                if (summarySchema?.$ref) summaryDef = resolveRef(summarySchema.$ref);

                if (summaryDef?.properties) {
                    Object.keys(summaryDef.properties).forEach(key => {
                        if (isEmpty(processedData.summary[key]) && summaryDef.properties[key].default !== undefined) {
                            processedData.summary[key] = summaryDef.properties[key].default;
                        }
                    });
                }
            }

            if (processedData.version) {
                const revisions = processedData.revisions || [];
                if (!revisions.some(rev => rev.version === processedData.version)) {
                    processedData.revisions = [...revisions, { version: processedData.version, url: null }];
                }
            }
            processedData.modified = new Date().toISOString();

            const fileData = JSON.stringify(processedData, null, 2);
            const blob = new Blob([fileData], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const defaultName = isProject ? "project_metadata.json" : "dataset_metadata.json";

            const fileName = formData.projectGrantName || formData.summary?.title
                ? `${(formData.projectGrantName || formData.summary.title).replace(/\s+/g, '_')}_metadata.json`
                : defaultName;

            link.download = fileName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error exporting progress:", e);
        }
    };

    const getLoggedInUserId = () => {
        const rawId = localStorage.getItem('userId') || localStorage.getItem('user_id');
        if (rawId && rawId !== 'undefined' && rawId !== 'null') {
            const parsed = parseInt(rawId, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }

        try {
            const token = localStorage.getItem('token');
            if (token) {
                const base64Url = token.split('.')[1];
                if (base64Url) {
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const decoded = JSON.parse(jsonPayload);
                    const jwtUserId = decoded.user_id || decoded.userId || decoded.sub || decoded.id;
                    if (jwtUserId && !isNaN(parseInt(jwtUserId, 10))) {
                        const parsedJwtId = parseInt(jwtUserId, 10);
                        localStorage.setItem('userId', parsedJwtId.toString());
                        return parsedJwtId;
                    }
                }
            }
        } catch (e) {
            console.error("Error decoding JWT token for user_id:", e);
        }

        return null;
    };

    const getLoggedInTeamId = () => {
        const rawTeamId = localStorage.getItem('activeTeamId') || localStorage.getItem('teamId');
        if (rawTeamId && rawTeamId !== 'undefined' && rawTeamId !== 'null') {
            const parsed = parseInt(rawTeamId, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return null;
    };

    const transformForPHP = (data, markActive) => {
        const teamId = getLoggedInTeamId();
        const userId = getLoggedInUserId();

        const pg = data.projectGrant || {};

        const cleanVal = (val) => {
            if (val === undefined || val === null || val === "" || val === "null" || val === "undefined") {
                return null;
            }
            return typeof val === 'string' ? val.trim() : val;
        };

        const name = cleanVal(data.projectGrantName || pg.projectGrantName || data.summary?.title);
        const researcher = cleanVal(data.leadResearcher || pg.leadResearcher);
        const institute = cleanVal(data.leadResearchInstitute || pg.leadResearchInstitute);
        const grants = cleanVal(data.grantNumbers || data.grantNumber || pg.grantNumber || pg.grantNumbers);
        const startDate = cleanVal(data.projectGrantStartDate || pg.projectGrantStartDate);
        const endDate = cleanVal(data.projectGrantEndDate || pg.projectGrantEndDate);
        const scope = cleanVal(data.projectGrantScope || pg.projectGrantScope);

        // Standard keys mapped directly to top-level database columns
        const standardKeys = new Set([
            'pid', 'version', 'projectGrant', 'projectGrantName', 'leadResearcher', 
            'leadResearchInstitute', 'grantNumber', 'grantNumbers', 'projectGrantStartDate', 
            'projectGrantEndDate', 'projectGrantScope', 'project_grant_name', 'lead_researcher', 
            'lead_research_institute', 'grant_numbers', 'project_grant_start_date', 
            'project_grant_end_date', 'project_grant_scope', 'team_id', 'user_id', 'status', 'icons'
        ]);

        const flatData = { ...data, ...pg };
        const extraData = {};

        Object.keys(flatData).forEach(key => {
            if (!standardKeys.has(key)) {
                const val = flatData[key];
                const isValEmpty = val === null || val === undefined || val === "" ||
                    (Array.isArray(val) && val.length === 0) ||
                    (typeof val === 'object' && Object.keys(val).length === 0);

                if (!isValEmpty) {
                    extraData[key] = val;
                }
            }
        });

        return {
            team_id: teamId,
            user_id: userId,
            pid: cleanVal(data.pid || pg.pid) || undefined,
            version: cleanVal(data.version || pg.version) || "1.0.0",

            // snake_case keys (mapped to database columns)
            project_grant_name: name,
            lead_researcher: researcher,
            lead_research_institute: institute,
            grant_numbers: grants,
            project_grant_start_date: startDate,
            project_grant_end_date: endDate,
            project_grant_scope: scope,

            // camelCase keys (for backwards compatibility)
            projectGrantName: name,
            leadResearcher: researcher,
            leadResearchInstitute: institute,
            grantNumbers: grants,
            projectGrantStartDate: startDate,
            projectGrantEndDate: endDate,
            projectGrantScope: scope,

            // Only populate metadata_blob if extra unmapped fields exist
            metadata_blob: Object.keys(extraData).length > 0 ? extraData : {},
            status: markActive ? "ACTIVE" : "DRAFT"
        };
    };

    const confirmDeleteRecord = async () => {
        try {
            const token = localStorage.getItem('token');
            const baseEndpoint = isProject
                ? `${API_BASE_URL}/projects/`
                : `${API_BASE_URL}/datasets/`;

            const endpoint = `${baseEndpoint}${existingId}`;

            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete record');
            }

            alert(`Successfully deleted ${isProject ? 'Project' : 'Dataset'}.`);

            if (onDeleteSuccess) {
                onDeleteSuccess();
            }

        } catch (error) {
            console.error("Delete error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleSaveToDatabase = async ({ markActive = false, unpublish = false } = {}) => {
        try {
            const token = localStorage.getItem('token');
            const activeTeamId = localStorage.getItem('activeTeamId');

            const baseEndpoint = isProject
                ? `${API_BASE_URL}/projects/`
                : `${API_BASE_URL}/datasets/`;

            const endpoint = isUpdate ? `${baseEndpoint}${existingId}` : baseEndpoint;

            let processedData = associateIcons(formData, prefixIconMapping);
            const filters = processedData.datasetFilters || [];

            const tops = filters.filter(f => f.id?.startsWith("0_0_0")).map(f => f.label);
            const hist = filters.filter(f => f.id?.startsWith("0_0_1")).map(f => f.label);

            if (tops.length > 0 && hist.length > 0) {
                try {
                    const lookupResponse = await fetch(`${API_BASE_URL}/datasets/extra-terms`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ topographies: tops, histologies: hist })
                    });

                    if (lookupResponse.ok) {
                        const lookupMap = await lookupResponse.json();
                        const convertedTerms = getExtra(processedData, lookupMap);

                        const existingIds = new Set(
                            processedData.datasetFilters.map(f => typeof f === 'object' ? f.id : f)
                        );
                        const uniqueNewTerms = convertedTerms.filter(term => !existingIds.has(term.id));

                        processedData.datasetFilters = [...processedData.datasetFilters, ...uniqueNewTerms];
                    }
                } catch (err) {
                    console.error("Network failure during term resolution:", err);
                }
            }

            let payload;

            if (isProject) {
                payload = transformForPHP(processedData, markActive);
            } else {
                const teamId = getLoggedInTeamId();
                const userId = getLoggedInUserId();
                payload = {
                    metadata_blob: processedData,
                    team_id: teamId,
                    user_id: userId,
                    active: markActive,
                    status: markActive ? "ACTIVE" : "DRAFT",
                    unpublish: unpublish
                };
            }

            const response = await fetch(endpoint, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save to database');
            }

            const result = await response.json();
            const displayId = isProject ? (result.pid || result.id) : result.datasetid;

            if (markActive) {
                alert(`Successfully published ${isProject ? 'Project' : 'Dataset'}! ID: ${displayId}\nIt is now live on datasets.html and meta.html.`);
            } else if (unpublish) {
                alert(`Successfully unpublished ${isProject ? 'Project' : 'Dataset'}. ID: ${displayId}\nIt is now hidden from public view.`);
            } else {
                alert(`Successfully saved draft for ${isProject ? 'Project' : 'Dataset'}. ID: ${displayId}`);
            }

            if (onSaveSuccess) {
                onSaveSuccess(result);
            }

        } catch (error) {
            console.error("Save error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const isActive = datasetStatus?.active || false;
    const hasDraft = datasetStatus?.has_draft || false;

    // Determine status badge config
    let badgeConfig = {
        label: 'DRAFT',
        bg: 'bg-slate-800 text-slate-200 border-slate-700',
        dot: 'bg-slate-400',
        tooltip: 'DRAFT: Private working draft. Not visible on public browsing pages (datasets.html or public meta.html).'
    };

    if (isActive && hasDraft) {
        badgeConfig = {
            label: 'ACTIVE (DRAFT EDITS)',
            bg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
            dot: 'bg-amber-400 animate-pulse',
            tooltip: 'ACTIVE (DRAFT EDITS): The published version is live on datasets.html. You are currently working on unpublished draft edits.'
        };
    } else if (isActive) {
        badgeConfig = {
            label: 'ACTIVE',
            bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
            dot: 'bg-emerald-400',
            tooltip: 'ACTIVE: Published and live. Visible to public visitors on datasets.html and meta.html.'
        };
    }

    // --- 3. Render ---
    return (
        <>
            <div className="w-full h-12 bg-slate-900 border-b border-slate-800 text-white flex items-center px-6 shadow-lg z-20 relative text-xs font-medium backdrop-blur-md">

                {/* Left: Status Badge & Hover Tooltip */}
                <div className="flex-1 flex items-center space-x-3">
                    <div className="group relative flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeConfig.bg} shadow-inner transition-all`}>
                            <span className={`w-2 h-2 rounded-full ${badgeConfig.dot} mr-1.5`}></span>
                            {badgeConfig.label}
                            <InfoIcon />
                        </span>

                        {/* Hover Tooltip Box */}
                        <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-slate-800 text-slate-100 text-xs rounded-xl shadow-2xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 leading-relaxed">
                            <div className="font-bold text-indigo-300 mb-1">Status Explanation</div>
                            {badgeConfig.tooltip}
                        </div>
                    </div>

                    <button
                        onClick={handleDownloadProgress}
                        className="flex items-center text-slate-300 hover:text-white hover:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-all focus:outline-none"
                        title="Export your current progress as a JSON file"
                    >
                        <DownloadIcon />
                        Export Progress JSON
                    </button>
                </div>

                {/* Centre: Main Actions */}
                <div className="flex items-center justify-center space-x-3">
                    <button
                        onClick={() => handleSaveToDatabase({ markActive: true })}
                        className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm font-semibold transition-all focus:outline-none active:scale-95"
                        title="Publish and make visible on datasets.html and meta.html"
                    >
                        <ActiveIcon />
                        Make active
                    </button>

                    <button
                        onClick={() => handleSaveToDatabase({ markActive: false })}
                        className="flex items-center bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm font-semibold transition-all focus:outline-none active:scale-95"
                        title="Save working progress as a draft"
                    >
                        <SaveIcon />
                        Save as draft
                    </button>

                    {isActive && (
                        <button
                            onClick={() => handleSaveToDatabase({ unpublish: true })}
                            className="flex items-center border border-amber-500/50 text-amber-300 hover:bg-amber-950/40 px-3 py-1.5 rounded-lg font-medium transition-all focus:outline-none"
                            title="Unpublish dataset from public view"
                        >
                            Unpublish
                        </button>
                    )}

                    {isUpdate && (
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center border border-red-500/40 text-red-300 hover:bg-red-950/60 px-3 py-1.5 rounded-lg font-medium transition-all focus:outline-none"
                            title="Permanently delete this record"
                        >
                            <TrashIcon />
                            Delete
                        </button>
                    )}
                </div>

                {/* Right: Completion Stats */}
                <div className="flex-1 flex justify-end items-center text-slate-300">
                    <ChartIcon />
                    <span>
                        Completion: <span className="font-bold text-emerald-400">{completionStats.req}%</span> (required) &nbsp;|&nbsp; <span className="font-bold text-indigo-300">{completionStats.opt}%</span> (optional)
                    </span>
                </div>
            </div>

            {/* Deletion Safety Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteRecord}
                title={recordTitle}
                itemType={isProject ? "Project" : "Dataset"}
            />
        </>
    );
};

export default UploadTopBar;