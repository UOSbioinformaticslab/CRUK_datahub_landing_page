import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Panel, Group, Separator } from "react-resizable-panels";
// 1. IMPORT DATA FROM UTILS
import { filterData } from '../utils/filter-setup.js';
import { flattenedFilterData } from '../utils/flattened_filter_data.js';
import {
    ICON_MAPPING,
    ETHNICITY_CATEGORIES,
    flattenFilterTree,
    getFilterConfig,
    getFirstTwoSentences,
    normalizeList
} from '../utils/metadataUtils';

import {
    StatCard,
    SectionHeading,
    AccessItem
} from '../components/PreviewSharedUI';

// 3. IMPORT ERD IMAGE
import erdImage from '../assets/erd.png';

// 4. IMPORT HELPER Functions
import { MarkdownRenderer } from './MarkdownRenderer.jsx'
import { ContactCustodianModal } from './ContactCustodianModal.jsx'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
// Add this wrapper component to handle fetching and loading states
export const MetadataPage = () => {
  const [data, setData] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [teamName, setTeamName] = useState(null);
  const [dbTools, setDbTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDataset = async () => {
        try {
            setIsLoading(true);

            const params = new URLSearchParams(window.location.search);
            const pathIdMatch = window.location.pathname.match(/\/meta(?:\.html)?\/(\d+)/);
            const datasetId = params.get('id') || (pathIdMatch ? pathIdMatch[1] : '3');
            const isPreview = params.get('preview') === 'true';
            
            const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}${isPreview ? '?preview=true' : ''}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error("Dataset not found.");
                throw new Error("The server could not retrieve the dataset.");
            }

            const dbResult = await response.json();

            // Set state using the metadata_blob from the database result
            setData(dbResult.metadata_blob || dbResult);
            setTeamId(dbResult.team_id || (dbResult.metadata_blob ? dbResult.metadata_blob.team_id : null));
            setTeamName(dbResult.team_name || null);
            setDbTools(dbResult.tools || []);
            setError(null);
            setError(null);

        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchDataset();
}, []);

  // Early returns are safe here because there are no hooks below them
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-xl text-gray-600 font-semibold">Loading dataset...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-xl text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  // Render the main content component, passing the guaranteed data
  return <MetadataPageContent data={data} teamId={teamId} teamName={teamName} dbTools={dbTools} />;
};

// This is the old MetadataPage but now takes the prop data so the main one wraps it
const MetadataPageContent = ({ data, teamId, teamName, dbTools, onSectionClick }) => {


  const isNotEmpty = (obj) => {
      if (!obj) return false;
      // Check if at least one value in the object is not empty
      return Object.values(obj).some(val => val !== null && val !== "" && val !== undefined);
  };
  const [expandedOtherData, setExpandedOtherData] = useState({});
  const toggleOtherData = (index) => {
    setExpandedOtherData(prev => ({ ...prev, [index]: !prev[index] }));
  };
  const [expandedTables, setExpandedTables] = useState({});
  const [emailCopied, setEmailCopied] = useState(false);
  const [currentGrantIndex, setCurrentGrantIndex] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const otherDataTypes = (data.otherDataTypes || []).filter(isNotEmpty);
  const demographicFrequency = data.demographicFrequency || {};
  const mappedEthnicities = useMemo(() => {
    const ethnicityData = demographicFrequency.ethnicity;
    if (!ethnicityData || !Array.isArray(ethnicityData) || ethnicityData.length === 0) {
        return null;
    }

    // Create a lookup dictionary from the provided JSON data
    const lookupMap = ethnicityData.reduce((acc, curr) => {
        acc[curr.bin] = curr.count;
        return acc;
    }, {});

    // Map against the strict list, defaulting to 0
    const mapped = ETHNICITY_CATEGORIES.map(category => ({
        label: category,
        count: lookupMap[category] || 0
    }));

    const maxCount = Math.max(...mapped.map(e => e.count));

    return { data: mapped, maxCount };
  }, [demographicFrequency.ethnicity]);
  const omics = data.omics || null;
  const provenance = data.provenance || {};
  const enrichmentAndLinkage = data.enrichmentAndLinkage || {};

  // --- Data Mapping & Processing (New Schema Handling) ---
  const projectGrants = (data.projectGrants || []).filter(isNotEmpty);
  const observations = (data.observations || []).filter(isNotEmpty);
  // 1. Description is now in documentation.description
  const descriptionText = data.documentation?.description || data.summary?.description || "";
  const documentationPreview = useMemo(() => getFirstTwoSentences(descriptionText), [descriptionText]);

  // 2. Keywords is now an array in summary.keywords
    // Use .filter() to remove empty strings before they reach the UI
    const keywords = useMemo(() => {
        const rawKeywords = normalizeList(data.summary?.keywords);
        return rawKeywords.filter(kw => kw && kw.trim() !== '');
    }, [data]);

  // 4. Structural Metadata is now inside an object with a 'tables' key
  const groupedMetadata = useMemo(() => {
    // Handle new schema (.tables) vs old schema (direct array)
    const tables = data.structuralMetadata?.tables || data.structuralMetadata || [];

    return tables.reduce((acc, item) => {
      const entity = item.name;
      const desc = item.description || "";

      // If we encounter the same table name twice (e.g. split across files), merge them
      if (!acc[entity]) {
        // Add 'size' to the stored object
        acc[entity] = { description: desc, columns: [], size: item.size };
      }

      if (item.columns) {
        acc[entity].columns.push(...item.columns);
      }
      return acc;
    }, {});
  }, [data]);

  // 6. Accessors for Stat Cards (Now with Optional Chaining)
const population = data.summary?.populationSize;

// Safely check if coverage exists before looking for age range
const ageRange = data.coverage?.typicalAgeRangeMin && data.coverage?.typicalAgeRangeMax
  ? `${data.coverage.typicalAgeRangeMin} - ${data.coverage.typicalAgeRangeMax}`
  : (data.coverage?.typicalAgeRange || null);

const leadTime = data.accessibility?.access?.deliveryLeadTime;
const followUp = data.coverage?.followUp;

// Safe check for format array
const fileTypes = data.accessibility?.formatAndStandards?.format
  ? data.accessibility.formatAndStandards.format.map(f => f.split('/')[1] || f).join(', ')
  : "Information not provided";

  // A. Create lookup map from the reference file (Memoized)
  const filterLookupMap = useMemo(() => flattenFilterTree(filterData), []);

  // B. Process datasetFilters from studyData
// Replace the existing derivedFilters / activeIcons useMemo block
const { derivedFilters, activeIcons } = useMemo(() => {
    const filters = {};
    const icons = new Set();
    const targetIconKeys = Object.keys(ICON_MAPPING);

    const filterObjects = data.datasetFilters || [];

    filterObjects.forEach(filter => {
        // Dynamic lookup from flattenedFilterData if filter.id exists
        const canonical = (filter && filter.id) ? flattenedFilterData[filter.id] : null;

        const groupName = canonical?.primaryGroup || filter?.primaryGroup || "Other Filters";
        const categoryName = canonical?.category || filter?.category || "Miscellaneous";
        const labelName = canonical?.label || filter?.label || filter?.id;

        if (!filters[groupName]) filters[groupName] = {};
        if (!filters[groupName][categoryName]) filters[groupName][categoryName] = [];

        filters[groupName][categoryName].push({
            label: labelName,
            description: filter?.description || canonical?.description
        });

        // Icon Detection (using canonical or fallback label / category)
        if (targetIconKeys.includes(labelName)) {
            icons.add(labelName);
        } else if (targetIconKeys.includes(categoryName)) {
            icons.add(categoryName);
        }
    });

    // Sort items alphabetically within each category
    Object.keys(filters).forEach(group => {
        Object.keys(filters[group]).forEach(cat => {
            filters[group][cat].sort((a, b) => a.label.localeCompare(b.label));
        });
    });

    const mappedIcons = Array.from(icons).map(key => ICON_MAPPING[key]);

    return { derivedFilters: filters, activeIcons: mappedIcons };
}, [data]);



  // --- Other Handlers ---
  const downloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "metadata.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleTable = (entityName) => {
    setExpandedTables(prev => ({ ...prev, [entityName]: !prev[entityName] }));
  };

  const toggleAllTables = (shouldExpand) => {
    const newState = {};
    Object.keys(groupedMetadata).forEach(key => { newState[key] = shouldExpand; });
    setExpandedTables(newState);
  };

  const handleCopyEmail = () => {
    const contact = data.summary?.contactPoint;
    const email = Array.isArray(contact) ? contact[0] : contact;

    if (email) {
        navigator.clipboard.writeText(email);
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
    }
};

  // Aliases for cleaner JSX below
  const summary = data.summary || {};
  const accessibility = data.accessibility || {};


  const access = accessibility.access || {};
  const usage = accessibility.usage || {};

  // Handle new resourceCreator being an array
  const resourceCreators = Array.isArray(usage.resourceCreator)
    ? usage.resourceCreator.join(', ')
    : (usage.resourceCreator?.name || usage.resourceCreator || "Information not provided");

  // Handle data use arrays (new schema) vs string (old schema)
  const dataUseLimit = Array.isArray(usage.dataUseLimitation) ? usage.dataUseLimitation.join(', ') : (usage.dataUseLimitation || "Information not provided");
  const dataUseReq = Array.isArray(usage.dataUseRequirements) ? usage.dataUseRequirements.join(', ') : (usage.dataUseRequirements || "Information not provided");

  return (
    <div className="flex-grow overflow-hidden h-[calc(100vh-40px)]">
     <Group orientation="horizontal">

      {/* --- LEFT PANEL: Navigation --- */}
      <Panel defaultSize={20} minSize={15}>
        <nav className="w-full h-full bg-white shadow-md p-6 overflow-y-auto flex flex-col">
        <div className="mb-6">
            <a href="./datasets.html" className="text-blue-600 hover:underline font-medium text-sm">← Back to all datasets</a>
        </div>
        <h3 className="text-xl font-bold text-blue-900 mb-6 border-b pb-2">Overview</h3>
        <ul className="space-y-3 mb-8">
          {[
            { id: 'project', label: 'Project', hasData: projectGrants && projectGrants.length > 0 },
            { id: 'summary', label: 'Summary', hasData: !!summary.title },
            { id: 'documentation', label: 'Documentation', hasData: !!descriptionText },
            { id: 'structural-metadata', label: 'Structural Metadata', hasData: Object.keys(groupedMetadata).length > 0 },
             { id: 'other-data-types', label: 'Other Data Types', hasData: otherDataTypes.length > 0 },
            { id: 'entity-relationship-diagrams', label: 'Entity Relationship Diagrams', hasData: !!data.erd },
            { id: 'observations', label: 'Observations', hasData: observations.length > 0 },
            { id: 'demographic-frequency', label: 'Demographics', hasData: Object.keys(demographicFrequency).length > 0 },
            { id: 'omics', label: 'Omics', hasData: !!omics },
            { id: 'provenance', label: 'Provenance', hasData: Object.keys(provenance).length > 0 },
            { id: 'access-usage', label: 'Usage & Formatting', hasData: Object.keys(usage).length > 0 || Object.keys(accessibility.formatAndStandards || {}).length > 0 },
          ].filter(item => item.hasData).map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {/* --- Data Access Box --- */}
        <div className="mt-8 bg-blue-50 rounded-lg border border-blue-100 p-4">

            {(summary.dataCustodian?.name || summary.publisher?.name || access.accessRights || summary.contactPoint || data.accessibility?.access || data.documentation?.inPipeline) && (
                <>
                    <div className="mb-4 border-b border-blue-200 pb-3 relative flex flex-col gap-2">
                    <h4 className="font-bold text-blue-900">Data Access</h4>
                    
                    {/* Contact Data Custodian Button */}
                    <div className="mt-2">
                        <button 
                            onClick={() => setIsContactModalOpen(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Contact Data Custodian
                        </button>
                    </div>

                    </div>

                {/* Pipeline Status */}
                {data.documentation?.inPipeline && (
                    <div className="mb-4 flex items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-2">Pipeline Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${data.documentation.inPipeline === 'Available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {data.documentation.inPipeline}
                        </span>
                    </div>
                )}

                {/* Simplified Data Fields */}
                <AccessItem
                    label="Data Custodian"
                    value={teamName || summary.dataCustodian?.name || summary.publisher?.name}
                />
                <AccessItem
                    label="Access Rights"
                    value={access.accessRights}
                />
                </>
            )}
                
        </div>
      </nav>
      </Panel>
      <Separator className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize active:bg-blue-600" />
      {/* --- Main Content --- */}

      <Panel defaultSize={55} minSize={30}>
        <main className="w-full h-full p-8 overflow-y-auto relative bg-white">
            <DatasetDetailsContent data={data} isPreview={false} onSectionClick={onSectionClick} dbTools={dbTools} />
        </main>
      </Panel>
        <Separator className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize active:bg-blue-600" />

      {/* --- RIGHT PANEL: Filters & Tags --- */}
      <Panel defaultSize={20} minSize={15} >
      {/* --- Right Panel --- */}
      <aside className="w-full h-full bg-white shadow-lg p-6 border-l border-gray-100 overflow-y-auto">

        {/* Enrichment & Linkage (Related References) */}
        {Object.keys(enrichmentAndLinkage).length > 0 && (
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide">Related References</h3>
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
                        <div key={key} className="mb-3">
                            <h4 className="font-bold text-gray-500 uppercase tracking-wide mb-1 text-xs">{formattedKey}</h4>
                            <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700 break-words">
                                {Array.isArray(value) ? value.map((item, idx) => {
                                    if (typeof item === 'object' && item !== null) {
                                        const displayText = `${item.title || ''} ${item.pid ? `[${item.pid}]` : ''}`.trim() || item.url;
                                        const href = getHref(item.url);
                                        return (
                                            <li key={idx}>
                                                {href ? (
                                                    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
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
                                                <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors break-all">
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
        )}

        {/* Associated Media */}
        {data.documentation?.associatedMedia && (
            <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wide">Associated Media</h3>
                <ul className="list-disc pl-4 space-y-1">
                    {Array.isArray(data.documentation.associatedMedia) ? (
                        data.documentation.associatedMedia.map((media, i) => (
                            <li key={i}>
                                <a href={media} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-sm">{media}</a>
                            </li>
                        ))
                    ) : (
                        <li>
                            <a href={data.documentation.associatedMedia} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-sm">{data.documentation.associatedMedia}</a>
                        </li>
                    )}
                </ul>
            </div>
        )}

        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-t border-gray-100 pt-6">Filters & Tags</h3>

        {/* Keywords */}
        <details className="mb-4 group">
            <summary className="cursor-pointer font-bold text-blue-900 border-b border-gray-100 pb-1 flex justify-between items-center list-none outline-none">
                Keywords
                <span className="transform group-open:rotate-180 transition-transform duration-200 text-xs text-blue-500">▼</span>
            </summary>
            <ul className="space-y-1 mt-3 pl-1">
                {keywords.map((kw, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                        {kw}
                    </li>
                ))}
            </ul>
        </details>

        {/* Filters */}
        <div className="space-y-4">


             {/* Dynamic Nested Filters - Expandable */}
             {Object.entries(derivedFilters).map(([groupName, categories]) => (
                 <details key={groupName} className="group mb-2">
                     {/* Main Group Header */}
                     <summary className="cursor-pointer font-bold text-blue-900 border-b border-gray-200 pb-1 mb-2 text-base flex justify-between items-center list-none outline-none">
                         {groupName}
                         <span className="transform group-open:rotate-180 transition-transform duration-200 text-xs text-blue-500">▼</span>
                     </summary>

                     {/* Loop through Sub-Categories */}
                     <div className="mt-3 pl-1">
                         {Object.entries(categories).map(([categoryName, items]) => (
                            <div key={categoryName} className="mb-4">
                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{categoryName}</h5>
                                <ul className="pl-2 border-l-2 border-gray-100 ml-1">
                                    {items.map((filter, idx) => (
                                        <li key={idx} className="mb-2 text-sm group/filter">
                                            <span className="text-gray-800 font-medium block">{filter.label}</span>
                                            {filter.description && (
                                                <span className="text-xs text-gray-500 block break-words mt-0.5 italic">
                                                    {filter.description}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         ))}
                     </div>
                 </details>
             ))}

             {Object.keys(derivedFilters).length === 0 && (
                <p className="text-sm text-gray-400 italic">No dataset filters applied.</p>
             )}
        </div>
      </aside>
      </Panel>
      </Group>

      {/* Render the Modal at the root of the page content */}
      <ContactCustodianModal 
          isOpen={isContactModalOpen} 
          onClose={() => setIsContactModalOpen(false)} 
          teamId={teamId} 
          teamName={teamName || summary.dataCustodian?.name || summary.publisher?.name || 'Data Custodian'}
          datasetName={summary.title} 
      />
    </div>
  );
};

export const DatasetDetailsContent = ({ data, isPreview = false, onSectionClick, dbTools = [] }) => {
  const isNotEmpty = (obj) => {
      if (!obj) return false;
      if (Array.isArray(obj)) return obj.length > 0;
      return Object.values(obj).some(val => {
          if (val === null || val === undefined || val === "") return false;
          if (Array.isArray(val) && val.length === 0) return false;
          return true;
      });
  };
  const [expandedOtherData, setExpandedOtherData] = useState({});
  const toggleOtherData = (index) => {
    setExpandedOtherData(prev => ({ ...prev, [index]: !prev[index] }));
  };
  const [expandedTables, setExpandedTables] = useState({});
  const [currentGrantIndex, setCurrentGrantIndex] = useState(0);

  const otherDataTypes = (data.otherDataTypes || []).filter(isNotEmpty);
  const demographicFrequency = data.demographicFrequency || {};
  const mappedEthnicities = useMemo(() => {
    const ethnicityData = demographicFrequency.ethnicity;
    if (!ethnicityData || !Array.isArray(ethnicityData) || ethnicityData.length === 0) {
        return null;
    }
    const lookupMap = ethnicityData.reduce((acc, curr) => {
        acc[curr.bin] = curr.count;
        return acc;
    }, {});
    const mapped = ETHNICITY_CATEGORIES.map(category => ({
        label: category,
        count: lookupMap[category] || 0
    }));
    const maxCount = Math.max(...mapped.map(e => e.count));
    return { data: mapped, maxCount };
  }, [demographicFrequency.ethnicity]);
  const omics = data.omics || null;
  const provenance = data.provenance || {};
  const enrichmentAndLinkage = data.enrichmentAndLinkage || {};

  const projectGrants = (data.projectGrants || []).filter(isNotEmpty);
  const observations = (data.observations || []).filter(isNotEmpty);
  const descriptionText = data.documentation?.description || data.summary?.description || "";
  const documentationPreview = useMemo(() => getFirstTwoSentences(descriptionText), [descriptionText]);

  const groupedMetadata = useMemo(() => {
    const tables = data.structuralMetadata?.tables || data.structuralMetadata || [];
    return tables.reduce((acc, item) => {
      const entity = item.name;
      const desc = item.description || "";
      if (!acc[entity]) {
        acc[entity] = { description: desc, columns: [], size: item.size };
      }
      if (item.columns) {
        acc[entity].columns.push(...item.columns);
      }
      return acc;
    }, {});
  }, [data]);

  const coverage = data.coverage || {};
  const population = data.summary?.populationSize;
  const ageRange = coverage.typicalAgeRangeMin && coverage.typicalAgeRangeMax
    ? `${coverage.typicalAgeRangeMin} - ${coverage.typicalAgeRangeMax}`
    : (coverage.typicalAgeRange || null);
  const leadTime = data.accessibility?.access?.deliveryLeadTime;
  const followUp = coverage.followUp;
  const pathway = coverage.pathway;
  const spatial = coverage.spatial;
  const datasetCompleteness = coverage.datasetCompleteness;
  const documentation = data.documentation || {};

  const { activeIcons } = useMemo(() => {
    const icons = new Set();
    const targetIconKeys = Object.keys(ICON_MAPPING);
    const filterObjects = data.datasetFilters || [];
    filterObjects.forEach(filter => {
        const canonical = (filter && filter.id) ? flattenedFilterData[filter.id] : null;
        const labelName = canonical?.label || filter?.label;
        const categoryName = canonical?.category || filter?.category;

        if (targetIconKeys.includes(labelName)) {
            icons.add(labelName);
        } else if (targetIconKeys.includes(categoryName)) {
            icons.add(categoryName);
        }
    });
    const mappedIcons = Array.from(icons).map(key => ICON_MAPPING[key]);
    return { activeIcons: mappedIcons };
  }, [data]);

  const downloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "metadata.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleTable = (entityName) => {
    setExpandedTables(prev => ({ ...prev, [entityName]: !prev[entityName] }));
  };

  const toggleAllTables = (shouldExpand) => {
    const newState = {};
    Object.keys(groupedMetadata).forEach(key => { newState[key] = shouldExpand; });
    setExpandedTables(newState);
  };

  const summary = data.summary || {};

  return (
    <>
        {/* Header Area */}
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-extrabold text-blue-900 mb-1`}>
                    {summary.title || "Untitled Dataset"}
                </h1>
                {summary.datasetAliases && (
                    <p className="text-sm text-gray-500 italic mb-3">
                        Also known as: {Array.isArray(summary.datasetAliases) ? summary.datasetAliases.join(', ') : summary.datasetAliases}
                    </p>
                )}
                {summary.doiName && (
                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-2 sm:gap-6 mb-2">
                        <div className="flex items-center">
                            <span className="font-semibold mr-2">DOI:</span>
                            <a href={`https://doi.org/${summary.doiName}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{summary.doiName}</a>
                        </div>
                    </div>
                )}
                {(summary.leadResearcher || summary.leadResearchInstitute) && (
                    <div className="text-sm text-gray-600">
                        <span className="font-semibold mr-2">Lead Researcher:</span>
                        {summary.leadResearcher || "Unknown"}
                        {summary.leadResearchInstitute && <span className="italic"> — {summary.leadResearchInstitute}</span>}
                    </div>
                )}

            </div>

            {/* Download Button (Only outside preview) */}
            {!isPreview && (
                <button
                    onClick={downloadJson}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow transition flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download JSON
                </button>
            )}
        </div>

        {/* --- ICON GALLERY --- */}
        <div className="flex flex-wrap gap-6 mb-10 justify-center md:justify-start">
            {activeIcons.length > 0 ? (
                activeIcons.map((icon, idx) => (
                    <div key={idx} className="group relative w-20 h-20 bg-white rounded-xl shadow-md flex items-center justify-center border border-gray-100 hover:border-blue-300 transition-all cursor-help">
                        <img src={icon.src} alt={icon.label} className="w-12 h-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                            {icon.label}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-gray-400 italic text-sm">No specific data type icons found.</div>
            )}
        </div>

    {/* --- Stat Cards (Conditional Rendering) --- */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
      {population !== undefined && population !== null && (
        <StatCard
          label="Population"
          value={population?.toLocaleString()}
          colorClass="bg-blue-50"
          onClick={onSectionClick ? () => onSectionClick('summary') : undefined}
        />
      )}
      {ageRange && (
        <StatCard
          label="Age Range"
          value={ageRange}
          colorClass="bg-green-50"
          onClick={onSectionClick ? () => onSectionClick('coverage') : undefined}
        />
      )}
      {leadTime && (
        <StatCard
          label="Access"
          value={leadTime}
          colorClass="bg-purple-50"
          onClick={onSectionClick ? () => onSectionClick('accessibility') : undefined}
        />
      )}
      {followUp && (
        <StatCard
          label="Follow Up"
          value={followUp}
          colorClass="bg-yellow-50"
          onClick={onSectionClick ? () => onSectionClick('coverage') : undefined}
        />
      )}
      {pathway && (
        <StatCard
          label="Pathway"
          value={pathway}
          colorClass="bg-red-50"
          onClick={onSectionClick ? () => onSectionClick('coverage') : undefined}
        />
      )}
      {spatial && (
        <StatCard
          label="Spatial Coverage"
          value={Array.isArray(spatial) ? spatial.join(', ') : spatial}
          colorClass="bg-indigo-50"
          onClick={onSectionClick ? () => onSectionClick('coverage') : undefined}
        />
      )}
    </div>

    {datasetCompleteness && (
        <div className="mb-10 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 
              className={`text-lg font-bold mb-2 ${onSectionClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors' : 'text-gray-800'}`}
              onClick={onSectionClick ? () => onSectionClick('coverage') : undefined}
            >
              Dataset Completeness
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">{datasetCompleteness}</p>
        </div>
    )}

{/* Project Grants */}
        {(isPreview || projectGrants.length > 0) && (
          <>
            <SectionHeading id="project" title="CRUK Project" onClick={onSectionClick ? () => onSectionClick('projectGrants') : undefined}>
                {projectGrants.length > 1 && (
                    <button
                        onClick={() => setCurrentGrantIndex((prev) => (prev + 1) % projectGrants.length)}
                        className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium py-1 px-3 rounded border border-blue-200 transition-colors"
                    >
                        Show Next Project ({currentGrantIndex + 1} of {projectGrants.length})
                    </button>
                )}
            </SectionHeading>
            <div className="prose max-w-none text-gray-700 mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              {projectGrants.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Project Name</span>
                      <p className="text-lg font-semibold text-blue-900 m-0">{projectGrants[currentGrantIndex].projectGrantName}</p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Lead Researcher</span>
                      <p className="text-base text-gray-800 m-0">
                        {projectGrants[currentGrantIndex].leadResearcher} — <span className="italic">{projectGrants[currentGrantIndex].leadResearchInstitute}</span>
                      </p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Timeline</span>
                      <p className="text-sm text-gray-700 m-0">
                        {projectGrants[currentGrantIndex].projectGrantStartDate} to {projectGrants[currentGrantIndex].projectGrantEndDate || "Ongoing"}
                      </p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Grant Number(s)</span>
                      <p className="text-sm font-mono text-gray-700 m-0">{projectGrants[currentGrantIndex].grantNumber}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-gray-100 pt-4">
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Project Scope</span>
                      <p className="text-sm text-gray-700 m-0 leading-relaxed">
                        {projectGrants[currentGrantIndex].projectGrantScope}
                      </p>
                    </div>
                  </div>
              ) : (
                  <p className="text-gray-400 italic m-0">Information not provided</p>
              )}
            </div>
          </>
        )}

        {/* Summary */}
        {(isPreview || summary.abstract || data.enrichmentAndLinkage?.syntheticDataWebLink) && (
            <>
                <SectionHeading id="summary" title="Summary" onClick={onSectionClick ? () => onSectionClick('summary') : undefined} />
                <div className="prose max-w-none text-gray-700 mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                {summary.abstract ? (
                    <p>{summary.abstract}</p>
                ) : (
                    <p className="text-gray-400 italic">Information not provided</p>
                )}
                {data.enrichmentAndLinkage?.syntheticDataWebLink && (
                    <div className="mt-4">
                    <span className="font-semibold">Associated Website: </span>
                    {/* Handle Array or Single String for web link */}
                    {Array.isArray(data.enrichmentAndLinkage.syntheticDataWebLink) ? (
                        data.enrichmentAndLinkage.syntheticDataWebLink.map((link, i) => (
                            <a key={i} href={link} className="text-blue-600 underline block">{link}</a>
                        ))
                    ) : (
                        <a href={data.enrichmentAndLinkage.syntheticDataWebLink} className="text-blue-600 underline">
                            {data.enrichmentAndLinkage.syntheticDataWebLink}
                        </a>
                    )}
                    </div>
                )}
                </div>
            </>
        )}

        {/* Documentation */}
        {(isPreview || descriptionText) && (
            <>
                <SectionHeading id="documentation" title="Documentation" onClick={onSectionClick ? () => onSectionClick('documentation') : undefined} />



                {descriptionText ? (
                    <details className="group bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
                    <summary className="cursor-pointer p-6 bg-blue-50 hover:bg-blue-100 transition flex justify-between items-center list-none">
                        <div>
                        <h3 className="font-bold text-lg text-blue-900 mb-2">Detailed Description</h3>
                        <div className="text-gray-700 italic">
                            <MarkdownRenderer content={documentationPreview} />
                            <span className="text-blue-600 ml-2 font-semibold not-italic text-sm">(Click to expand)</span>
                        </div>
                        </div>
                        <span className="transform group-open:rotate-180 transition-transform duration-200 text-blue-500">▼</span>
                    </summary>
                    <div className="p-6 text-gray-700 leading-relaxed border-t border-gray-200 whitespace-pre-wrap">
                        <MarkdownRenderer content={descriptionText} />
                    </div>
                    </details>
                ) : isPreview ? (
                    <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-sm">
                        <p className="text-gray-400 italic m-0">Detailed description not provided</p>
                    </div>
                ) : null}


            </>
        )}



        {/* Structural Metadata */}
        {(isPreview || Object.keys(groupedMetadata).length > 0) && (
            <>
                <SectionHeading id="structural-metadata" title="Structural Metadata" onClick={onSectionClick ? () => onSectionClick('structuralMetadata') : undefined}>
                    <div className="space-x-2">
                        <button onClick={() => toggleAllTables(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium underline">Expand All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleAllTables(false)} className="text-xs text-blue-600 hover:text-blue-800 font-medium underline">Collapse All</button>
                    </div>
                </SectionHeading>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
                {Object.keys(groupedMetadata).length === 0 ? (
                    isPreview ? <p className="p-4 text-gray-500">Information not provided</p> : null
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                        <tr>
                            <th className="p-3 border-b">Entity / Description</th>
                            <th className="p-3 border-b">Column Name</th>
                            <th className="p-3 border-b">Type</th>
                            <th className="p-3 border-b">Description</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm">
                        {Object.entries(groupedMetadata).map(([entityName, data]) => {
                            const isExpanded = expandedTables[entityName];
                            return (
                                <React.Fragment key={entityName}>
                                    <tr className="bg-blue-50 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => toggleTable(entityName)}>
                                        <td colSpan="4" className="p-3">
                                            <div className="flex items-center">
                                                <span className={`transform transition-transform mr-2 text-blue-500 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                <span className="font-bold text-blue-900 text-lg">{entityName}</span>
                                                {/* Handle description being short or long */}
                                                <span className="ml-4 text-gray-600 text-sm italic truncate max-w-md">{data.description}</span>
                                                <span className="ml-auto text-xs text-blue-900 font-medium">
                                                    {data.size !== undefined && data.size !== null
                                                        ? `${data.size?.toLocaleString()} complete entries`
                                                        : `${data.columns.length} columns`}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && data.columns.map((col, idx) => (
                                        <tr key={`${entityName}-${col.name}-${idx}`} className="hover:bg-gray-50 border-b last:border-0 bg-white">
                                            <td className="p-3 w-1/5 border-r border-gray-50"></td>
                                            <td className="p-3 font-mono text-gray-700 w-1/4 font-semibold">{col.name}</td>
                                            <td className="p-3 text-gray-500 w-1/6">{col.dataType}</td>
                                            <td className="p-3 text-gray-600">{col.description}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
            </>
        )}

{/* Other Data Types */}
        {(isPreview || otherDataTypes.length > 0) && (
            <>
                <SectionHeading id="other-data-types" title="Other Data Types" onClick={onSectionClick ? () => onSectionClick('otherDataTypes') : undefined} />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-10">
                    {otherDataTypes.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <tbody className="text-sm">
                                {otherDataTypes.map((item, idx) => {
                                    const isExpanded = expandedOtherData[idx];
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr
                                                className="bg-white border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                                                onClick={() => toggleOtherData(idx)}
                                            >
                                                <td className="p-3 w-10 text-center select-none">
                                                    <span className={`transform transition-transform inline-block text-blue-500 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                </td>
                                                <td className="p-3 font-bold text-blue-900 w-1/2 select-none">
                                                    {item.title}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {item.format && item.format.trim().toLowerCase() !== 'not given' && item.format.trim().toLowerCase() !== 'n/a' && (
                                                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded font-mono">
                                                            {item.format}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <td className="p-3 border-r border-gray-100"></td>
                                                    <td colSpan="2" className="p-4 text-gray-700 leading-relaxed">
                                                        {item.description}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : isPreview ? (
                        <p className="p-4 text-gray-500">Information not provided</p>
                    ) : null}
                </div>
            </>
        )}
                {/* 1. Only render if data.erd exists */}
        {(isPreview || data.erd) && (
            <>
                {/* Section Heading */}
                <div className="flex items-center justify-between mt-10 mb-4 border-b pb-2">
                    <h2 id="entity-relationship-diagrams" className="text-2xl font-bold text-gray-800">
                        Entity Relationship Diagrams
                    </h2>
                </div>

                {/* Image Container with URL validation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 p-4 overflow-x-auto">
                    {data.erd ? (
                        <>
                            {/* Display the source URL securely */}
                            <div className="mb-4">
                                <span className="font-semibold text-gray-700">Source URL: </span>
                                <a href={data.erd} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                                    {data.erd}
                                </a>
                            </div>

                            {/* Check if the URL string matches a standard image extension */}
                            {typeof data.erd === 'string' && /\.(jpeg|jpg|gif|png|svg|webp)(\?.*)?$/i.test(data.erd) ? (
                            <img
                                src={data.erd}
                                alt="Entity Relationship Diagram"
                                className="min-w-full md:w-full h-auto object-contain"
                            />
                            ) : (
                                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                                    Warning: The provided URL does not appear to be a standard image format and may not display correctly.
                                </div>
                            )}
                        </>
                    ) : isPreview ? (
                        <p className="text-gray-400 italic m-0">Information not provided</p>
                    ) : null}
                </div>
            </>
        )}

        {/* Observations */}
        {(isPreview || observations.length > 0) && (
            <>
                <SectionHeading id="observations" title="Observations" onClick={onSectionClick ? () => onSectionClick('observations') : undefined} />
                {observations.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        {observations.map((obs, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
                                <div className="text-2xl font-bold text-gray-800 mb-1">{obs.measuredValue?.toLocaleString()}</div>
                                <div className="text-sm font-semibold text-gray-600">{obs.observedNode}</div>
                                {obs.measuredProperty && obs.measuredProperty.trim().toLowerCase() !== 'not given' && obs.measuredProperty.trim().toLowerCase() !== 'n/a' && (
                                    <div className="text-xs text-gray-400 mt-2">{obs.measuredProperty}</div>
                                )}
                                {obs.observationDate && !obs.observationDate.startsWith('1000-01-01') && (
                                    <div className="text-xs text-gray-400 mt-1 italic">Date: {obs.observationDate}</div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : isPreview ? (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-10">
                        <p className="text-gray-400 italic m-0">Information not provided</p>
                    </div>
                ) : null}
            </>
        )}

        {/* Demographics - Ethnicity Bar Chart */}
        {(isPreview || mappedEthnicities) && (
            <>
                <SectionHeading id="demographic-frequency" title="Demographics" onClick={onSectionClick ? () => onSectionClick('demographicFrequency') : undefined} />
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10">
                    {mappedEthnicities ? (
                        <div className="space-y-3">
                            {mappedEthnicities.data.map((item, idx) => {
                                const barWidth = mappedEthnicities.maxCount > 0
                                    ? `${(item.count / mappedEthnicities.maxCount) * 100}%`
                                    : '0%';
                                const barColor = idx % 2 === 0 ? 'bg-blue-600' : 'bg-pink-400';
                                return (
                                    <div key={idx} className="flex items-center text-sm group min-h-[1.5rem]">
                                        <div className="w-3/5 text-right pr-4 text-gray-700 leading-snug" title={item.label}>
                                            {item.label}
                                        </div>
                                        <div className="w-2/5 flex items-center">
                                            <div className="flex-1 h-5 flex items-center">
                                                <div
                                                    className={`h-full ${barColor} rounded-r transition-all duration-500 opacity-90 group-hover:opacity-100`}
                                                    style={{ width: barWidth }}
                                                ></div>
                                            </div>
                                            <div className="ml-3 font-semibold text-gray-600 w-12 text-left">
                                                {item.count}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : isPreview ? (
                        <p className="text-gray-400 italic m-0">Information not provided</p>
                    ) : null}
                </div>
            </>
        )}

        {/* Omics */}
        {(isPreview || omics) && (
            <>
                <SectionHeading id="omics" title="Omics" onClick={onSectionClick ? () => onSectionClick('omics') : undefined} />
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10 flex flex-col sm:flex-row gap-8">
                    {omics ? (
                        <>
                            <div>
                                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Assay</span>
                                <p className="text-base text-gray-800 m-0">{omics.assay || "Information not provided"}</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Platform</span>
                                <p className="text-base text-gray-800 m-0">{omics.platform || "Information not provided"}</p>
                            </div>
                        </>
                    ) : isPreview ? (
                        <p className="text-gray-400 italic m-0">Information not provided</p>
                    ) : null}
                </div>
            </>
        )}

        {/* Provenance */}
        {(isPreview || isNotEmpty(provenance)) && (
            <>
                <SectionHeading id="provenance" title="Provenance" onClick={onSectionClick ? () => onSectionClick('provenance') : undefined} />
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10">
                    {(isPreview || isNotEmpty(provenance.temporal)) ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <AccessItem label="Start Date" value={provenance.temporal?.startDate} isPreview={isPreview} />
                            <AccessItem label="End Date" value={provenance.temporal?.endDate} isPreview={isPreview} />
                            <AccessItem label="Time Lag" value={provenance.temporal?.timeLag} isPreview={isPreview} />
                        </div>
                    ) : (
                        <p className="text-gray-400 italic m-0">Information not provided</p>
                    )}
                </div>
            </>
        )}


        {/* Tools */}
        {(isPreview || (dbTools && dbTools.length > 0)) && (
            <>
                <SectionHeading id="tools" title="Tools & Software" onClick={onSectionClick ? () => onSectionClick('tools') : undefined} />
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10">
                    {dbTools && dbTools.length > 0 ? (
                        <ul className="space-y-3">
                            {dbTools.map(t => (
                                <li key={t.id}>
                                    <a href={`/src/tool?id=${t.id}`} className="text-lg font-medium text-blue-600 hover:underline break-all">
                                        {t.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : isPreview ? (
                        <p className="text-gray-400 italic m-0">No associated tools</p>
                    ) : null}
                </div>
            </>
        )}

        {/* Access, Usage & Formatting (Moved to bottom) */}

    </>
  );
};