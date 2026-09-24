import React, { useMemo } from 'react';
import { normalizeList } from '../utils/metadataUtils';
import { flattenedFilterData } from '../utils/flattened_filter_data.js';


const PreviewTags = ({ data, onSectionClick }) => {
    const enrichmentAndLinkage = data.enrichmentAndLinkage || {};
    const documentation = data.documentation || {};

    const keywords = useMemo(() => {
        const rawKeywords = normalizeList(data.summary?.keywords);
        return rawKeywords.filter(kw => kw && kw.trim() !== '');
    }, [data]);

    const derivedFilters = useMemo(() => {
        const filters = {};
        const filterObjects = data.datasetFilters || [];

        filterObjects.forEach(filter => {
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
        });
        return filters;
    }, [data]);

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
                {Object.entries(derivedFilters).map(([groupName, categories]) => (
                    <details key={groupName} className="group mb-2">
                        <summary className="cursor-pointer font-bold text-blue-900 border-b border-gray-200 pb-1 mb-2 text-sm flex justify-between items-center list-none outline-none">
                            {groupName}
                            <span className="transform group-open:rotate-180 transition-transform duration-200 text-xs text-blue-500">▼</span>
                        </summary>
                        <div className="mt-2 pl-1">
                            {Object.entries(categories).map(([categoryName, items]) => (
                                <div key={categoryName} className="mb-3">
                                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{categoryName}</h5>
                                    <ul className="pl-2 border-l-2 border-gray-100 ml-1">
                                        {items.map((filter, idx) => (
                                            <li key={idx} className="mb-1 text-xs group/filter">
                                                <span className="text-gray-800 font-medium block">{filter.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </details>
                ))}

                {Object.keys(derivedFilters).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No dataset filters applied.</p>
                )}
            </div>
        </aside>
    );
};

export default PreviewTags;