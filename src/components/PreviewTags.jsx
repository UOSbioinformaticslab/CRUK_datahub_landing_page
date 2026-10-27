import React, { useMemo } from 'react';
import { normalizeList } from '../utils/metadataUtils';
import { flattenedFilterData } from '../utils/filter-setup.js';


const PreviewTags = ({ data, onSectionClick }) => {
    const enrichmentAndLinkage = data.enrichmentAndLinkage || {};
    const documentation = data.documentation || {};

    const keywords = useMemo(() => {
        const rawKeywords = normalizeList(data.summary?.keywords);
        return rawKeywords.filter(kw => kw && kw.trim() !== '');
    }, [data]);

    const derivedFilters = useMemo(() => {
        const filterObjects = data.datasetFilters || [];
        if (!filterObjects || filterObjects.length === 0) return {};

        const groups = {
            'cancer-type': { title: 'Cancer Type', hasPanCancer: false, categories: {} },
            'data-type': { title: 'Data Type', categories: {} },
            'access': { title: 'Access Governance', categories: {} },
            'other': { title: 'Other Filters', categories: {} }
        };

        filterObjects.forEach(filter => {
            const id = String(typeof filter === 'object' ? filter.id : filter || '');
            const canonical = id && flattenedFilterData ? flattenedFilterData[id] : null;
            const label = (typeof filter === 'object' && filter.label) ? filter.label : (canonical?.label || id);
            const description = filter?.description || canonical?.description || '';

            if (id === '0_0_5') {
                groups['cancer-type'].hasPanCancer = true;
                return;
            }

            let groupKey = 'other';
            let categoryName = 'Miscellaneous';

            if (id.startsWith('0_0_0')) {
                groupKey = 'cancer-type';
                categoryName = 'ICD-O Topography (Primary Site)';
            } else if (id.startsWith('0_0_1')) {
                groupKey = 'cancer-type';
                categoryName = 'ICD-O Histology (Morphology)';
            } else if (id.startsWith('0_0_2')) {
                groupKey = 'cancer-type';
                categoryName = 'CRUK Cancer Terms';
            } else if (id.startsWith('0_0_3')) {
                groupKey = 'cancer-type';
                categoryName = 'SNOMED-CT';
            } else if (id.startsWith('0_0_4')) {
                groupKey = 'cancer-type';
                categoryName = 'TCGA Terms';
            } else if (id.startsWith('0_2_0')) {
                groupKey = 'data-type';
                categoryName = 'Biobank';
            } else if (id.startsWith('0_2_1')) {
                groupKey = 'data-type';
                categoryName = 'In Vitro';
            } else if (id.startsWith('0_2_2')) {
                groupKey = 'data-type';
                categoryName = 'Model Organisms';
            } else if (id.startsWith('0_2_3')) {
                groupKey = 'data-type';
                categoryName = 'Patient Studies';
            } else if (id.startsWith('0_2_4')) {
                groupKey = 'data-type';
                categoryName = 'Techniques';
            } else if (id.startsWith('0_2')) {
                groupKey = 'data-type';
                categoryName = canonical?.category || 'Data Modalities';
            } else if (id.startsWith('0_1')) {
                groupKey = 'access';
                categoryName = 'Access Rights';
            } else {
                groupKey = canonical?.primaryGroup || filter?.primaryGroup || 'other';
                categoryName = canonical?.category || filter?.category || 'Miscellaneous';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = { title: groupKey, categories: {} };
            }
            if (!groups[groupKey].categories[categoryName]) {
                groups[groupKey].categories[categoryName] = [];
            }

            groups[groupKey].categories[categoryName].push({
                id,
                label,
                description
            });
        });

        // Filter out empty groups
        const activeGroups = {};
        Object.entries(groups).forEach(([key, group]) => {
            const hasCategories = Object.keys(group.categories).length > 0;
            const hasPan = Boolean(group.hasPanCancer);
            if (hasCategories || hasPan) {
                activeGroups[key] = group;
            }
        });

        return activeGroups;
    }, [data.datasetFilters]);

    return (
        <aside className="w-full h-full bg-white shadow-sm p-4 border border-gray-100 rounded-lg overflow-y-auto">

            {/* Enrichment & Linkage (Related References) */}
            {Object.keys(enrichmentAndLinkage).length > 0 && (
                <div className="mb-6">
                    <h3 
                        className={`text-sm font-bold mb-2 uppercase tracking-wide ${onSectionClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors' : 'text-gray-800'}`}
                        onClick={onSectionClick ? () => onSectionClick('enrichmentAndLinkage') : undefined}
                    >
                        Related References
                    </h3>
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
                                <h4 className="font-bold text-gray-500 uppercase tracking-wide mb-1 text-[10px]">{formattedKey}</h4>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700 break-words">
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
            {documentation.associatedMedia && (
                <div className="mb-6">
                    <h3 
                        className={`text-sm font-bold mb-2 uppercase tracking-wide ${onSectionClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors' : 'text-gray-800'}`}
                        onClick={onSectionClick ? () => onSectionClick('documentation') : undefined}
                    >
                        Associated Media
                    </h3>
                    <ul className="list-disc pl-4 space-y-1">
                        {Array.isArray(documentation.associatedMedia) ? (
                            documentation.associatedMedia.map((media, i) => (
                                <li key={i}>
                                    <a href={media} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-xs">{media}</a>
                                </li>
                            ))
                        ) : (
                            <li>
                                <a href={documentation.associatedMedia} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all text-xs">{documentation.associatedMedia}</a>
                            </li>
                        )}
                    </ul>
                </div>
            )}

            <h3 
                className={`text-sm font-bold mb-3 uppercase tracking-wide border-t border-gray-100 pt-4 ${onSectionClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors' : 'text-gray-800'}`}
                onClick={onSectionClick ? () => onSectionClick('datasetFilters') : undefined}
            >
                Filters & Tags
            </h3>

            {/* Keywords */}
            <details className="mb-4 group">
                <summary className="cursor-pointer font-bold text-blue-900 border-b border-gray-100 pb-1 flex justify-between items-center list-none outline-none text-sm">
                    Keywords
                    <span className="transform group-open:rotate-180 transition-transform duration-200 text-xs text-blue-500">▼</span>
                </summary>
                <ul className="space-y-1 mt-2 pl-1">
                    {keywords.map((kw, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                            {kw}
                        </li>
                    ))}
                </ul>
            </details>

            {/* Filters */}
            <div className="space-y-4">
                {Object.entries(derivedFilters).map(([groupKey, groupData]) => {
                    const categories = groupData.categories || {};
                    const categoryEntries = Object.entries(categories).filter(([_, items]) => items && items.length > 0);

                    const CANCER_CATEGORY_ORDER = [
                        'CRUK Cancer Terms',
                        'ICD-O Topography (Primary Site)',
                        'ICD-O Histology (Morphology)',
                        'TCGA Terms',
                        'SNOMED-CT'
                    ];

                    if (groupKey === 'cancer-type') {
                        categoryEntries.sort(([catA], [catB]) => {
                            const idxA = CANCER_CATEGORY_ORDER.indexOf(catA);
                            const idxB = CANCER_CATEGORY_ORDER.indexOf(catB);
                            const valA = idxA === -1 ? 99 : idxA;
                            const valB = idxB === -1 ? 99 : idxB;
                            return valA - valB || catA.localeCompare(catB);
                        });
                    } else {
                        categoryEntries.sort(([catA], [catB]) => catA.localeCompare(catB));
                    }

                    return (
                        <details key={groupKey} className="group mb-2" open>
                            <summary className="cursor-pointer font-bold text-blue-900 border-b border-gray-200 pb-1 mb-2 text-sm flex justify-between items-center list-none outline-none">
                                {groupData.title || groupKey}
                                <span className="transform group-open:rotate-180 transition-transform duration-200 text-xs text-blue-500">▼</span>
                            </summary>
                            <div className="mt-2 pl-1">
                                {/* Pan Cancer: Displayed cleanly as a single badge without repeated header */}
                                {groupKey === 'cancer-type' && groupData.hasPanCancer && (
                                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-pink-50 border border-[var(--cruk-pink)] text-gray-800 text-xs font-semibold flex items-center justify-between shadow-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span>🌐</span>
                                            <span className="font-bold text-[var(--cruk-pink)]">Pan Cancer</span>
                                            <span className="text-[11px] font-normal text-gray-600 hidden sm:inline">— applies to multiple cancer types</span>
                                        </div>
                                        <span className="text-[var(--cruk-pink)] font-bold text-xs">✓</span>
                                    </div>
                                )}

                                {/* Categories: Only rendered if items exist (no empty headings) */}
                                {categoryEntries.map(([categoryName, items]) => {
                                    const sortedItems = [...items].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
                                    return (
                                        <div key={categoryName} className="mb-3">
                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                {categoryName}
                                            </h5>
                                            <ul className="pl-2 border-l-2 border-gray-100 ml-1 space-y-1">
                                                {sortedItems.map((filter, idx) => (
                                                    <li key={filter.id || idx} className="text-xs group/filter">
                                                        <span className="text-gray-800 font-medium block">{filter.label}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    );
                })}

                {Object.keys(derivedFilters).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No dataset filters applied.</p>
                )}
            </div>
        </aside>
    );
};

export default PreviewTags;