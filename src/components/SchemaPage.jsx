import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Panel, Group, Separator } from "react-resizable-panels";
import CsvUploader from "./CsvUploader.jsx"
import StructuralMetadataGrid from "./StructuralMetadataGrid.jsx";
import AssistantPane from './AssistantPane.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import questionData from '../feedback/upload_questions.json';
import crukSchema from '../utils/CRUKv.1.0.0.json';
import semanticSchema from 'cruk-semantic-schema';

import { MarkdownRenderer } from './MarkdownRenderer.jsx';
import DataTagger, { FilterChipArea } from './DataTagger.jsx';
import JsonUpload from './JsonUpload.jsx';
import UploadTopBar from './UploadTopBar.jsx';
import { filterData } from '../utils/filter-setup.js';
import { flattenSchemaToGrid } from '../utils/flattenSchemaToGrid.js';
import prefixIconMapping from '../utils/prefix_icon_mapping.json';
import { getExtra } from '../utils/getExtra.js';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const METADATA_PRIORITY_SECTIONS = [
    "version"
];

const welcomeGuidance = {
    title: "Quick Start Guide",
    guidance: `Welcome to the CRUK Datahub. [cite_start]This tool helps you prepare metadata for the Health Data Gateway. [cite: 2] \\n\\n **Steps to success:** \\n 1. Review the **Checklist** in this panel. [cite_start]\\n 2. Use **Manual Entry** or **JSON Upload** to start. [cite: 27, 28] [cite_start]\\n 3. Complete all sections until you see **Green Ticks**. [cite: 21] [cite_start]\\n 4. **Download** your final JSON for submission. [cite: 47]`
};

// Utility to remove "readiness" slots
const removeEmptyArrayEntries = (data) => {
    if (Array.isArray(data)) {
        return data
            .map(removeEmptyArrayEntries) // Recursive clean
            .filter(item => {
                if (typeof item === 'string') return item.trim() !== '';
                if (typeof item === 'object' && item !== null) {
                    // Filter out objects where every value is empty/null
                    return Object.values(item).some(val => val !== null && val !== "" && val !== undefined);
                }
                return true;
            });
    } else if (typeof data === 'object' && data !== null) {
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
            cleaned[key] = removeEmptyArrayEntries(value);
        }
        return cleaned;
    }
    return data;
};

const ensureMinimumEntries = (data, schemaDef) => {
    if (!schemaDef || !schemaDef.properties) return data;

    const updated = { ...data };
    Object.keys(schemaDef.properties).forEach(key => {
        const prop = schemaDef.properties[key];
        // If it's an array and empty, give it one empty slot
        if (prop.type === 'array' || (prop.items && !updated[key])) {
            if (!updated[key] || updated[key].length === 0) {
                // Initialize with one empty string or one empty object
                updated[key] = prop.items?.type === 'object' ? [{}] : [''];
            }
        }
    });
    return updated;
};

// --- USER CONFIGURATION: Sidebar Section Order & Visibility ---

// --- Utility: Deep Merge Schemas ---
const deepMerge = (target, source) => {
    // If either is not an object, return the source (override) or target
    if (typeof target !== 'object' || target === null) return source || target;
    if (typeof source !== 'object' || source === null) return target;

    // Clone target to avoid mutation
    const output = Array.isArray(target) ? [...target] : { ...target };

    Object.keys(source).forEach(key => {
        const targetValue = output[key];
        const sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            // DECISION: For arrays, do we overwrite or concatenate?
            // For a "semantic override" (like replacing a list of enums or requirements),
            // usually overwriting is safer. If you just want to change text,
            // you generally won't be touching arrays in the semantic schema.
            output[key] = sourceValue;
        } else if (typeof targetValue === 'object' && typeof sourceValue === 'object') {
            output[key] = deepMerge(targetValue, sourceValue);
        } else {
            output[key] = sourceValue;
        }
    });

    return output;
};
// --- Safe Schema Loading and Merging ---
const cruk_SCHEMA = crukSchema.properties ? crukSchema : (crukSchema.fullContent || crukSchema);
const OVERLAY_SCHEMA = semanticSchema.properties ? semanticSchema : (semanticSchema.fullContent || semanticSchema);
const DATA_SCHEMA = deepMerge(cruk_SCHEMA, OVERLAY_SCHEMA);
const VISIBLE_SECTIONS = DATA_SCHEMA.visibleSections || [];
// --- CUSTOM VALIDATION RULES ---
const EXTRA_VALIDATIONS = {
    "datasetFilters": (value) => {
        if (!Array.isArray(value)) return false;
        // Validate that each item is an object with the required search metadata
        return value.every(item =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.label === 'string'
        );
    }
};

// --- Utility: Resolve References ---
const resolveRef = (ref) => {
    if (!ref || typeof ref !== 'string' || !ref.startsWith('#/$defs/')) {
        return null;
    }
    const defKey = ref.split('/').pop();
    return DATA_SCHEMA.$defs ? DATA_SCHEMA.$defs[defKey] : null;
};

// --- Utility: Get Safe Value ---
const getValueByPath = (obj, path) => {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj);
};

// --- Utility: Check emptiness ---
const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
};

// --- Utility: Hierarchy Helper ---
const idExistsInBranch = (targetId, branch) => {
    if (!branch) return false;
    const items = Array.isArray(branch) ? branch : Object.values(branch);

    for (const item of items) {
        if (item.id === targetId) return true;
        if (item.children && idExistsInBranch(targetId, item.children)) return true;
    }
    return false;
};

// --- Utility: Calculate Section Status ---
const calculateSectionStatus = (sectionKey, formData) => {
    // 1. Special Case: Dataset Filters
    if (sectionKey === 'datasetFilters') {
        const tags = formData['datasetFilters'] || [];
        if (tags.length === 0) return 'incomplete';

        const topographyBranch = filterData['0_0']?.children?.['0_0_0']?.children;
        const histologyBranch  = filterData['0_0']?.children?.['0_0_1']?.children;
        const dataTypeBranch   = filterData['0_2']?.children;
        const accessBranch     = filterData['0_1']?.children;

        let hasTopo = false;
        let hasHisto = false;
        let hasData = false;
        let hasAccess = false;

        tags.forEach(tag => {
            // Extract ID from the object structure
            const id = typeof tag === 'object' ? tag.id : tag;

            if (!hasTopo && idExistsInBranch(id, topographyBranch)) hasTopo = true;
            if (!hasHisto && idExistsInBranch(id, histologyBranch)) hasHisto = true;
            if (!hasData && idExistsInBranch(id, dataTypeBranch)) hasData = true;
            if (!hasAccess && idExistsInBranch(id, accessBranch)) hasAccess = true;
        });

        if (hasTopo && hasHisto && hasData && hasAccess) return 'complete';
        return 'incomplete';
    }

    // 2. Special Case: Welcome Screen
    if (sectionKey === 'welcome') return 'info';

    // 3. Schema-based Validation
    const sectionData = formData[sectionKey];

    // Check Root Level Requirement
    const isRootRequired = DATA_SCHEMA.required?.includes(sectionKey);
    if (isRootRequired) {
        console.log(`Required section identified: ${sectionKey}`);
    }

    if (isRootRequired && isEmpty(sectionData)) {
        return 'incomplete';
    }

    if (!isRootRequired && isEmpty(sectionData)) {
        return 'partial';
    }

    const sectionSchema = DATA_SCHEMA.properties[sectionKey];
    if (!sectionSchema) return 'error';

    let definition = sectionSchema;
    if (sectionSchema.$ref) definition = resolveRef(sectionSchema.$ref) || sectionSchema;
    else if (sectionSchema.allOf) {
         const refItem = sectionSchema.allOf.find(i => i.$ref);
         if (refItem) definition = resolveRef(refItem.$ref) || sectionSchema;
    } else if (sectionSchema.anyOf) {
         const validOption = sectionSchema.anyOf.find(i => i.type !== 'null');
         if (validOption) definition = (validOption.$ref ? resolveRef(validOption.$ref) : validOption) || sectionSchema;
    }

    // Array Types
    if (definition.type === 'array') {
        return 'complete';
    }

    const dataObj = sectionData || {};

    // Helper to resolve definitions recursively (MUST be defined before use)
    const getResolvedSchema = (schema) => {
        if (!schema) return null;
        if (schema.$ref) return resolveRef(schema.$ref);
        if (schema.allOf) return resolveRef(schema.allOf.find(i => i.$ref)?.$ref);
        return schema;
    };

    // Helper to check nested requirements (MUST be defined before use)
    const isObjectValid = (objData, objSchema, isTopLevel = false) => {
        const resolvedSchema = getResolvedSchema(objSchema);
        if (!resolvedSchema || !resolvedSchema.properties) return true;

        let reqProps = resolvedSchema.required || [];

        // Respect the 'included' UI filter at the top level
        if (isTopLevel) {
            const sectionIncluded = DATA_SCHEMA.included?.[sectionKey];
            if (sectionIncluded && Array.isArray(sectionIncluded)) {
                reqProps = reqProps.filter(req => sectionIncluded.includes(req));
            }
        }

        for (const req of reqProps) {
            const val = objData ? objData[req] : undefined;
            const defVal = resolvedSchema.properties[req]?.default;
            const effectiveVal = (val !== undefined && val !== null) ? val : defVal;

            if (isEmpty(effectiveVal)) return false;

            const nestedSchema = resolvedSchema.properties[req];
            const resolvedNested = getResolvedSchema(nestedSchema);

            if (resolvedNested && resolvedNested.type === 'object') {
                if (!isObjectValid(effectiveVal || {}, resolvedNested, false)) return false;
            }
        }
        return true;
    };

    // 1. Run the deep validation for 'incomplete' status
    if (!isObjectValid(dataObj, definition, true)) {
        return 'incomplete';
    }

    // 2. Check optional fields for partial status
    let allProps = Object.keys(definition.properties || {});
    let reqProps = definition.required || [];
    const sectionIncluded = DATA_SCHEMA.included?.[sectionKey];

    if (sectionIncluded && Array.isArray(sectionIncluded)) {
        allProps = allProps.filter(p => sectionIncluded.includes(p));
        reqProps = reqProps.filter(p => sectionIncluded.includes(p));
    }

    const optionalProps = allProps.filter(p => !reqProps.includes(p));
    if (optionalProps.length > 0) {
        const hasEmptyOptional = optionalProps.some(p => isEmpty(dataObj[p]));
        if (hasEmptyOptional) return 'partial';
    }

    return 'complete';
};
// --- Component: Status Icon ---
const StatusIcon = ({ status, isActive, isVisited }) => {
    if (isActive) {
        return (
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm ring-2 ring-blue-100 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
        );
    }

    if (!isVisited && status !== 'complete') {
        return (
            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-gray-300 flex-shrink-0"></div>
        );
    }

    switch (status) {
        case 'complete':
            return (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
            );
        case 'partial':
            return (
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white font-bold text-sm">!</span>
                </div>
            );
        case 'incomplete':
            return (
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
            );
        default:
            return <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>;
    }
};

// --- Utility: Render Guidance ---
const renderGuidance = (guidanceText) => {
    if (!guidanceText) return null;
    return guidanceText.split('\\n').map((line, lineIndex) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <span key={lineIndex} className="block mb-1">
                {parts.map((part, partIndex) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={partIndex}>{part}</span>;
                })}
            </span>
        );
    });
};


// --- Component: Welcome Section (RESTORED) ---
const WelcomeSection = ({
    existingDatasets,
    loadingDatasets,
    datasetError,
    handleSelectDataset,
    onUpload }) => (
    <div className="p-8 overflow-y-auto pb-20 w-full">
        <div data-tour="welcome-guide-section" className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
            <h1 className="text-3xl font-extrabold mb-4 text-gray-900">Guide to Uploading and Modifying Metadata</h1>

            {/* Change <p> to <div> here to allow the JsonUpload div descendant */}
            <div className="text-sm text-gray-600 mb-1 leading-relaxed">
                If this is a new dataset, you can either input the metadata manually following the guidance in the right hand panel, switch tab to use the AI uploader, or if you have done this before, you can directly upload a json with some or all of the required information.

                <JsonUpload
                    schema={DATA_SCHEMA}
                    onUpload={onUpload}
                    additionalValidations={EXTRA_VALIDATIONS}
                />
            </div>

            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                To modify your existing dataset, choose from your existing datasets below to retrieve the existing information for manual adjustment, to download the data, or to upload amendments.
            </p>

            <div className="mb-2 max-w-lg">
                {loadingDatasets ? (
                    <p className="text-sm text-gray-500">Loading datasets...</p>
                ) : datasetError ? (
                    <p className="text-sm text-red-500">{datasetError}</p>
                ) : (
                    <select
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm text-gray-700 cursor-pointer"
                        defaultValue=""
                        onChange={handleSelectDataset}
                    >
                        <option value="" disabled>-- Select an existing dataset --</option>
                        {existingDatasets.map(dataset => {
                            const title = dataset.computed_title || dataset.metadata_blob?.summary?.title || dataset.datasetid;
                            const statusTag = dataset.active
                                ? (dataset.has_draft ? '[Active (Draft edits)]' : '[Active]')
                                : '[Draft]';
                            return (
                                <option key={dataset.id} value={dataset.id}>
                                    {title} {statusTag}
                                </option>
                            );
                        })}
                    </select>
                )}
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Progress Legend</h2>
            <div className="space-y-1">

                {/* Complete */}
                <div className="flex items-center py-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-3 shadow-sm flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                        <span className="text-gray-900 font-semibold text-sm">All fields complete</span>
                    </div>
                </div>

                {/* Partial */}
                <div className="flex items-center py-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center mr-3 shadow-sm flex-shrink-0">
                        <span className="text-white font-bold text-xs">!</span>
                    </div>
                    <div>
                        <span className="text-gray-900 font-semibold text-sm">Requirements met (optional fields remain)</span>
                    </div>
                </div>

                {/* Incomplete */}
                <div className="flex items-center py-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mr-3 shadow-sm flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <div>
                        <span className="text-gray-900 font-semibold text-sm">Action required</span>
                    </div>
                </div>

                {/* Active */}
                <div className="flex items-center py-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-sm ring-2 ring-blue-100 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                        <span className="text-gray-900 font-semibold text-sm">Current Section</span>
                    </div>
                </div>

                {/* Not Visited */}
                <div className="flex items-center py-1 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-gray-300 mr-3 shadow-sm flex-shrink-0"></div>
                    <div>
                        <span className="text-gray-900 font-semibold text-sm">Not Started</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// --- Component: Frequency Grid (Matrix Input) ---
const FrequencyGrid = ({ value, onChange, enumOptions, label }) => {
    // value is expected to be: [{ bin: "0-6 days", count: 10 }, ...]
    const currentData = Array.isArray(value) ? value : [];

    const handleCountChange = (binLabel, newCount) => {
        let newData = [...currentData];
        const existingIndex = newData.findIndex(item => item.bin === binLabel);

        // Convert input to integer or null if empty
        const countVal = newCount === '' ? null : parseInt(newCount, 10);

        if (existingIndex > -1) {
            if (countVal === null || isNaN(countVal)) {
                // Remove item if cleared
                newData.splice(existingIndex, 1);
            } else {
                // Update existing
                newData[existingIndex].count = countVal;
            }
        } else if (countVal !== null && !isNaN(countVal)) {
            // Add new item
            newData.push({ bin: binLabel, count: countVal });
        }

        onChange(newData);
    };

    return (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{label} Breakdown</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-w-4xl">


                {/* Rows */}
                {enumOptions.map((binLabel) => {
                    const match = currentData.find(d => d.bin === binLabel);
                    const count = match ? match.count : '';

                    return (
                        <React.Fragment key={binLabel}>
                            <label htmlFor={`freq-${label}-${binLabel.replace(/\s+/g, '-')}`} className="flex items-center text-gray-700 text-sm font-medium">
                                {binLabel}
                            </label>
                            <div>
                                <input
                                    id={`freq-${label}-${binLabel.replace(/\s+/g, '-')}`}
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={count}
                                    onChange={(e) => handleCountChange(binLabel, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 mt-4">
                * Leave blank if the count is zero or unknown.
            </p>
        </div>
    );
};

// --- Component: Field Renderer (Recursive) ---
// --- Component: Field Renderer (Recursive) ---
const FieldRenderer = ({
    propKey,
    prop,
    path,
    formData,
    onChange,
    isRequired,
    setActiveGuidance,
    level = 0
}) => {
    const [isMarkdownToggled, setIsMarkdownToggled] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const textareaRef = useRef(null);

    // Helper: Robustly resolve definitions (handles anyOf with Nulls)
    const getDefinitionAndEnum = (p) => {
        let definition = p;

        // 1. Helper to resolve a Reference
        const resolve = (obj) => {
            if (obj && obj.$ref && typeof obj.$ref === 'string') {
                 return resolveRef(obj.$ref);
            }
            return obj;
        };

        // 2. Resolve initial ref
        definition = resolve(definition) || definition;

        // 3. Handle 'allOf' (Merge/Inheritance) - usually just one ref in this schema
        if (definition.allOf) {
            const refItem = definition.allOf.find(i => i.$ref);
            if (refItem) definition = resolve(refItem) || definition;
        }

        // 4. Handle 'anyOf' (Nullable fields or Choices)
        if (definition.anyOf) {
            // Filter out 'null' types to find the actual data definition
            const nonNullOptions = definition.anyOf.filter(i => {
                const r = resolve(i);
                return r && r.type !== 'null';
            });

            if (nonNullOptions.length > 0) {
                // Priority: Complex types (Array/Object) > Simple types
                const complexOption = nonNullOptions.find(i => {
                    const r = resolve(i);
                    return r.type === 'array' || r.type === 'object';
                });
                const selected = complexOption || nonNullOptions[0];
                definition = resolve(selected) || selected;
            }
        }

        let enumValues = definition.enum || prop.enum;
        if (propKey === 'observedNode' || path.includes('observedNode')) {
            enumValues = ['Persons', 'Events', 'Findings'];
        }
        // Explicitly check for array type in both resolved and original prop
        const isArray = prop.type === 'array' || definition.type === 'array';

        return { definition, enumValues, isArray };
    };

    const { definition: fieldDef, enumValues, isArray } = getDefinitionAndEnum(prop);
    const rawValue = getValueByPath(formData, path);
    // Use rawValue if it exists, otherwise use the property default or an empty string
    const currentValue = (rawValue !== undefined && rawValue !== null) ? rawValue : (prop.default !== undefined ? prop.default : '');
     useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [currentValue, isMarkdownToggled]);
    // --- SPECIAL RENDER: Age Frequency Grid ---
    if (propKey === 'age' && path.includes('demographicFrequency')) {
        const ageEnumDef = DATA_SCHEMA.$defs?.AgeEnum;
        const ageOptions = ageEnumDef?.enum || [];

        if (ageOptions.length > 0) {
            return (
                <FrequencyGrid
                    value={currentValue}
                    onChange={(newVal) => onChange(path, newVal)}
                    enumOptions={ageOptions}
                    label="Age"
                />
            );
        }
    }

    // --- SPECIAL RENDER: Ethnicity Frequency Grid ---
    if (propKey === 'ethnicity' && path.includes('demographicFrequency')) {
        const ethEnumDef = DATA_SCHEMA.$defs?.EthnicityEnum;
        const ethOptions = ethEnumDef?.enum || [];

        if (ethOptions.length > 0) {
            return (
                <FrequencyGrid
                    value={currentValue}
                    onChange={(newVal) => onChange(path, newVal)}
                    enumOptions={ethOptions}
                    label="Ethnicity"
                />
            );
        }
    }


// --- RENDER: ARRAY TYPES (e.g. Tables, Columns) ---
    if (isArray) {
        const items = Array.isArray(currentValue) && currentValue.length > 0
            ? currentValue
            : (fieldDef.items?.type === 'object' ? [{}] : ['']);

        // Handler for simple primitive arrays (strings, etc.)
        const handleSimpleInputChange = (index, newVal) => {
            const newArr = [...items];
            newArr[index] = newVal;
            onChange(path, newArr);
        };

        const handleRemoveItem = (index) => {
            const newArr = [...items];
            newArr.splice(index, 1);
            onChange(path, newArr);
        };

        const handleAddItem = () => {
            const newArr = [...items];
            newArr.push(fieldDef.items?.type === 'object' ? {} : '');
            onChange(path, newArr);
        };

        return (
            <div className="mb-10 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="w-full mb-4 flex justify-between items-center cursor-pointer select-none bg-transparent border-none p-0 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{prop.title || propKey}</h3>
                        {prop.description && <p className="text-base text-gray-600 mt-1">{prop.description}</p>}
                    </div>
                    <div className="text-gray-500">
                        {isExpanded ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="space-y-4">
                        {items.map((item, index) => {
                            const itemSchema = fieldDef.items || {};
                            const resolvedItemDef = itemSchema.$ref ? resolveRef(itemSchema.$ref) : itemSchema;

                            return (
                                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 relative group">
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveItem(index); }}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
                                        title="Remove item"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                    {resolvedItemDef.properties ? (
                                        Object.keys(resolvedItemDef.properties).map(childKey => (
                                            <FieldRenderer
                                                key={childKey}
                                                propKey={childKey}
                                                prop={resolvedItemDef.properties[childKey]}
                                                path={[...path, index, childKey]}
                                                formData={formData}
                                                onChange={onChange}
                                                isRequired={resolvedItemDef.required?.includes(childKey)}
                                                setActiveGuidance={setActiveGuidance}
                                                level={level + 1}
                                            />
                                        ))
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-lg pr-10"
                                            placeholder={prop.examples ? prop.examples.join(', ') : "Enter value..."}
                                            value={item || ''}
                                            onFocus={() => {
                                                const guidance = prop.guidance || prop.description || 'No guidance provided.';
                                                setActiveGuidance({ title: prop.title || propKey, guidance });
                                            }}
                                            onChange={(e) => handleSimpleInputChange(index, e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div className="pt-2 flex justify-start">
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-md"
                            >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Add another {prop.title || 'item'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    // --- RENDER: NESTED OBJECT TYPES ---
    if (fieldDef.type === 'object' && fieldDef.properties && !isArray) {
        return (
            <div className={`border-l-2 border-indigo-200 pl-4 mb-6 ${level > 0 ? 'mt-4' : ''}`}>
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="w-full flex justify-between items-center cursor-pointer mb-4 select-none group bg-transparent border-none p-0 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3 className="text-md font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                        {prop.title || propKey}
                    </h3>
                    <div className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                        {isExpanded ? (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        ) : (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="space-y-2">
                        {Object.keys(fieldDef.properties)
                            .filter((childKey) => {
                                const includedFields = DATA_SCHEMA.included?.[propKey];
                                if (includedFields && Array.isArray(includedFields)) {
                                    return includedFields.includes(childKey);
                                }
                                return true;
                            })
                            .map((childKey) => (
                                <FieldRenderer
                                    key={childKey}
                                    propKey={childKey}
                                    prop={fieldDef.properties[childKey]}
                                    path={[...path, childKey]}
                                    formData={formData}
                                    onChange={onChange}
                                    isRequired={fieldDef.required?.includes(childKey)}
                                    setActiveGuidance={setActiveGuidance}
                                    level={level + 1}
                                />
                            ))}
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER: STANDARD INPUTS ---
    let inputType = 'text';
    let rows = 1;
    const examples = prop.examples;
    let placeholder = examples && examples.length > 0 ? examples.join(', ') : 'Enter value...';
    const showMarkdownToggle = prop.showMarkdown === "True";

    if (prop.contentMediaType && prop.contentMediaType.startsWith('image/')) {
        inputType = 'file';
    } else if (showMarkdownToggle || (prop.title && (prop.title.includes("Description") || prop.title.includes("Scope") || prop.title.includes("Guidance") || prop.title.includes("Abstract")))) {
        inputType = 'textarea';
        rows = 4;
    } else if (fieldDef.type === 'integer' || fieldDef.type === 'number') {
        inputType = 'number';
    } else if (fieldDef.type === 'boolean') {
        inputType = 'checkbox';
    } else if (enumValues) {
        inputType = 'select-single';
    }

    const handleFocus = () => {
        const guidance = prop.guidance || prop.description || 'No specific guidance provided.';
        setActiveGuidance({ title: prop.title || propKey, guidance });
    };

    const handleChange = (e) => {
        let val = e.target.value;
        if (inputType === 'checkbox') val = e.target.checked;
        if (inputType === 'number') val = e.target.value === '' ? null : Number(e.target.value);
        if (isDoiField && typeof val === 'string') {
            val = val.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, '').trim();
        }
        onChange(path, val);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size exceeds 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(path, reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const fieldId = `field-${path.join('-')}`;
    const minLen = prop.minLength || fieldDef?.minLength;
    const maxLen = prop.maxLength || fieldDef?.maxLength;
    const isStringVal = typeof currentValue === 'string';
    const strLength = isStringVal ? currentValue.length : 0;
    const isDoiField = propKey.toLowerCase().includes('doi') || (prop.title && prop.title.toLowerCase().includes('doi')) || path.some(p => typeof p === 'string' && p.toLowerCase().includes('doi'));
    const isDoiValid = isDoiField && isStringVal && strLength > 0 ? /^10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/.test(currentValue.trim()) : true;

    const isVersionField = propKey === 'version' || path[path.length - 1] === 'version';
    const isVersionValid = isVersionField && isStringVal && strLength > 0 ? /^\d+\.\d+\.\d+$/.test(currentValue.trim()) : true;

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4 ${level > 0 ? 'ml-0' : ''}`}>
            <label htmlFor={fieldId} className="block text-sm font-bold text-gray-700 mb-1">
                {prop.title || propKey} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <p className="text-base text-gray-500 mb-4">{prop.description}</p>

            {inputType === 'file' && currentValue && (
                <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Current Image:</p>
                    <img src={currentValue} alt="Preview" className="max-w-full h-auto max-h-64 rounded shadow-sm" />
                    <button
                        onClick={() => onChange(path, null)}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                        Remove Image
                    </button>
                </div>
            )}

            {showMarkdownToggle && inputType === 'textarea' && (
                <div className="flex justify-end mb-1">
                    <button
                        onClick={() => setIsMarkdownToggled(prev => !prev)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                        {isMarkdownToggled ? 'Edit' : 'Preview Markdown'}
                    </button>
                </div>
            )}

            {inputType === 'textarea' && isMarkdownToggled ? (
                <div className="p-3 border border-indigo-200 rounded-md bg-indigo-50 min-h-[5rem]">
                    <MarkdownRenderer content={currentValue || ''} />
                </div>
            ) : inputType === 'select-single' ? (
                <select
                    id={fieldId}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                    onFocus={handleFocus}
                    value={currentValue || ''}
                    onChange={handleChange}
                >
                    <option value="">-- Select --</option>
                    {enumValues.filter(opt => opt !== null).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : inputType === 'textarea' ? (
                <textarea
                    id={fieldId}
                    ref={textareaRef}
                    className={`w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 overflow-hidden resize-none ${
                        (maxLen && strLength > maxLen) || (minLen && strLength > 0 && strLength < minLen) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={placeholder}
                    rows={rows}
                    onFocus={handleFocus}
                    value={currentValue || ''}
                    onChange={handleChange}
                />
            ) : inputType === 'checkbox' ? (
                 <div className="flex items-center">
                    <button
                        id={fieldId}
                        type="button"
                        className={`${
                            !!currentValue ? 'bg-indigo-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                        role="switch"
                        aria-checked={!!currentValue}
                        onClick={() => {
                            onChange(path, !currentValue);
                            handleFocus();
                        }}
                        onFocus={handleFocus}
                    >
                        <span
                            aria-hidden="true"
                            className={`${
                                !!currentValue ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                        {!!currentValue ? 'Yes' : 'No'}
                    </span>
                 </div>
            ) : inputType === 'file' ? (
                <input
                    id={fieldId}
                    type="file"
                    accept="image/*"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    onFocus={handleFocus}
                    onChange={handleFileChange}
                />
            ) : (
                <input
                    id={fieldId}
                    type={inputType}
                    className={`w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500 ${
                        (maxLen && strLength > maxLen) || (minLen && strLength > 0 && strLength < minLen) || (isDoiField && strLength > 0 && !isDoiValid) || (isVersionField && strLength > 0 && !isVersionValid) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={placeholder}
                    onFocus={handleFocus}
                    value={currentValue || ''}
                    onChange={handleChange}
                />
            )}

            {isStringVal && (minLen || maxLen || isDoiField || isVersionField) && (
                <div className="mt-1 flex justify-between items-center text-xs">
                    {isDoiField && strLength > 0 && (
                        <span className={isDoiValid ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {isDoiValid ? "✓ Valid DOI format (10.xxxx/yyyy)" : "⚠️ DOI must match pattern 10.xxxx/yyyy"}
                        </span>
                    )}
                    {isVersionField && strLength > 0 && (
                        <span className={isVersionValid ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {isVersionValid ? "✓ Valid Version format (3 numbers separated by period, e.g. 1.0.0)" : "⚠️ Version must be 3 numbers separated by a period (e.g. 1.0.0)"}
                        </span>
                    )}
                    {(minLen || maxLen) && (
                        <span className={`ml-auto ${
                            (maxLen && strLength > maxLen) || (minLen && strLength > 0 && strLength < minLen)
                                ? "text-red-600 font-bold"
                                : "text-gray-400"
                        }`}>
                            {strLength} {maxLen ? `/ ${maxLen}` : ''} chars
                            {maxLen && strLength > maxLen && ` (Exceeded by ${strLength - maxLen})`}
                            {minLen && strLength > 0 && strLength < minLen && ` (Minimum ${minLen} required)`}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Component: Structural Metadata Wrapper ---
// --- Component: Structural Metadata Wrapper ---
const StructuralMetadataSection = ({ formData, onFormChange, DATA_SCHEMA, onUpdateGuidance }) => {
    const [flatGridData, setFlatGridData] = useState([]);

    // We use a ref to prevent infinite loops when the grid updates the parent form data
    const isInternalUpdate = useRef(false);

    // Extract guidance from the schema.
    const tableGuidance = {
        title: "Table Guidelines",
        guidance: DATA_SCHEMA?.$defs?.DataTable?.name?.guidance
               || DATA_SCHEMA?.$defs?.DataTable?.properties?.name?.guidance
               || "Provide the table details."
    };

    const columnGuidance = {
        title: "Column Guidelines",
        guidance: DATA_SCHEMA?.$defs?.DataTable?.columns?.guidance
               || DATA_SCHEMA?.$defs?.DataTable?.properties?.columns?.guidance
               || "Provide the column details."
    };

    // --- NEW: Sync external formData into the flat grid ---
    useEffect(() => {
        // If the grid itself triggered the data change, do not rebuild the grid array.
        // This prevents cursor jumping and infinite re-renders.
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        const tables = formData?.structuralMetadata?.tables;
        if (tables && Array.isArray(tables) && tables.length > 0) {
            console.log("🔄 External data detected, flattening schema for grid...");
            setFlatGridData(flattenSchemaToGrid(tables));
        } else {
            setFlatGridData([]); // Reset if the section is truly empty
        }
    }, [formData?.structuralMetadata]);

    // Set table guidance as the default when the section loads
    useEffect(() => {
        if (onUpdateGuidance) {
            onUpdateGuidance(tableGuidance);
        }
    }, []);

    const handleDataParsed = (parsedData) => {
        setFlatGridData(parsedData);
    };

    const handleSaveToSchema = (nestedSchemaData) => {
        console.log("📡 Section receiving data from Grid:", nestedSchemaData);
        // Flag this change as internal so the useEffect above skips the sync
        isInternalUpdate.current = true;
        // Pushes changes into formData.structuralMetadata in the background
        onFormChange(['structuralMetadata'], nestedSchemaData);
    };

    // Determine which guidance to show based on the column key
    const handleCellFocus = (columnKey) => {
        if (!onUpdateGuidance) return;

        if (columnKey.startsWith('table')) {
            onUpdateGuidance(tableGuidance);
        } else if (columnKey.startsWith('column') || columnKey.startsWith('value')) {
            onUpdateGuidance(columnGuidance);
        }
    };

    return (
        <div className="w-full p-8 overflow-y-auto pb-20">
            <h1 className="text-3xl font-extrabold mb-2 text-gray-800">Structural Metadata</h1>

            <CsvUploader onDataParsed={handleDataParsed} />

            <StructuralMetadataGrid
                initialData={flatGridData}
                onSaveToSchema={handleSaveToSchema}
                onCellFocus={handleCellFocus}
            />
        </div>
    );
};

// --- Component: Main Form Logic ---
const SchemaForm = ({
    sectionKey,
    formData,
    onFormChange,
    setActiveGuidance,
    onUpload,
    existingDatasets,
    loadingDatasets,
    datasetError,
    handleSelectDataset
}) => {

    // 0. Welcome Section
    if (sectionKey === 'welcome') {
        return (
            <div className="w-full flex h-full">
                <WelcomeSection
                existingDatasets={existingDatasets}
                loadingDatasets={loadingDatasets}
                datasetError={datasetError}
                handleSelectDataset={handleSelectDataset}
                onUpload={onUpload} />
            </div>
        );
    }

    // 1. Data Tagger
    if (sectionKey === 'datasetFilters') {
        return (
            <div className="w-full p-8 overflow-y-auto pb-20">
                <h1 className="text-3xl font-extrabold mb-2 text-gray-800">Dataset Filters</h1>
                <p className="text-gray-600 mb-8 border-b pb-4">
                    Please tag your dataset with specific filters identifying the type of cancer covered, the type of data it contains and accessibility. This improves the searchability of your dataset.

                    <br/><span className="text-sm text-red-600 font-bold mt-2 block">
                        Required: At least one Topography, one Histology, one Data Type, and one Access Type.
                    </span>
                </p>
                <DataTagger
                    value={formData['datasetFilters'] || []}
                    onChange={(newTags) => onFormChange(['datasetFilters'], newTags)}
                />
            </div>
        );
    }

// 2. Structural Metadata (NEW INTERCEPT)
    if (sectionKey === 'structuralMetadata') {
        return (
            <StructuralMetadataSection
                formData={formData}
                onFormChange={onFormChange}
                DATA_SCHEMA={DATA_SCHEMA}
                onUpdateGuidance={setActiveGuidance}
            />
        );
    }

    const sectionSchema = DATA_SCHEMA.properties ? DATA_SCHEMA.properties[sectionKey] : null;

    if (!sectionSchema) return <p className="p-8">Section not found or Schema is invalid.</p>;

    const resolveDefinition = (s) => {
        if (!s) return null;
        let ref = s.$ref;
        if (!ref) ref = s.allOf?.find(i => i.$ref)?.$ref;
        if (!ref && s.anyOf) {
             const validOption = s.anyOf.find(i => i.type !== 'null');
             if (validOption) {
                 return validOption.$ref ? resolveRef(validOption.$ref) : validOption;
             }
        }
        if (ref) return resolveRef(ref);
        return s;
    };

    const definition = resolveDefinition(sectionSchema);
    const isContainer = definition && (definition.type === 'object' || definition.properties);

    // Extract keys and apply custom sorting logic
    let propertyKeys = [];
    if (isContainer) {
        propertyKeys = Object.keys(definition.properties);

        if (sectionKey === 'summary') {
            const summaryOrder = DATA_SCHEMA.summaryOrder || definition.summaryOrder || [
                "title", "leadResearcher", "leadResearchInstitute", "contactPoint", "doiName", "abstract",
                "dataCustodian", "populationSize", "keywords", "datasetAliases"
            ];

            propertyKeys.sort((a, b) => {
                const indexA = summaryOrder.indexOf(a);
                const indexB = summaryOrder.indexOf(b);

                // Both items are in the array, sort by their index position
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // Only a is in the array, it goes first
                if (indexA !== -1) return -1;
                // Only b is in the array, it goes first
                if (indexB !== -1) return 1;

                return 0;
            });
        }
    }

    return (
        <div className="w-full p-8 overflow-y-auto pb-20">
            <h1 className="text-3xl font-extrabold mb-2 text-gray-800">
                {sectionSchema.title || sectionKey}
            </h1>
            <p className="text-gray-600 mb-8 border-b pb-4">{sectionSchema.description}</p>

            {isContainer ? (
                <div className="space-y-6">

                   {propertyKeys
                    .filter((propKey) => {
                        // 1. Check top-level inclusion (e.g., summary)
                        const sectionIncluded = DATA_SCHEMA.included?.[sectionKey];
                        if (sectionIncluded && !sectionIncluded.includes(propKey)) return false;

                        // 2. Check if this specific field has its own inclusion list (e.g., datasetCustodian)
                        const fieldIncluded = DATA_SCHEMA.included?.[propKey];
                        if (fieldIncluded && Array.isArray(fieldIncluded)) {
                            return true;
                        }

                        return true;
                    })
                    .map((propKey) => {
        return (
            <React.Fragment key={propKey}>
                <FieldRenderer
                    propKey={propKey}
                    prop={definition.properties[propKey]}
                    path={[sectionKey, propKey]}
                    formData={formData}
                    onChange={onFormChange}
                    isRequired={definition.required?.includes(propKey)}
                    setActiveGuidance={setActiveGuidance}
                />


            </React.Fragment>
        );
    })}
                </div>
            ) : (
                <div className="space-y-6">
                     <FieldRenderer
                        propKey={sectionKey}
                        prop={METADATA_PRIORITY_SECTIONS.includes(sectionKey) ? sectionSchema : (definition || sectionSchema)}
                        path={[sectionKey]}
                        formData={formData}
                        onChange={onFormChange}
                        isRequired={DATA_SCHEMA.required?.includes(sectionKey)}
                        setActiveGuidance={setActiveGuidance}
                    />
                </div>
            )}
        </div>
    );
};
// --- Component: Navigation & Download ---
const SchemaNav = ({ activeSection, setActiveSection, onDownload, formData, visitedSections }) => {
    return (
        <div className="w-full border-r border-gray-200 bg-gray-50 h-full overflow-y-auto flex-shrink-0">
            <div className="p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-700">Metadata Sections</h2>
                <ul className="space-y-2">
                    {VISIBLE_SECTIONS.map((sectionKey) => {
                        let title;
                        if (sectionKey === 'datasetFilters') {
                            title = "Dataset Filters";
                        } else if (sectionKey === 'welcome') {
                            title = "Welcome & Guide";
                        } else {
                            // Title logic matching user requirement
                            const prop = DATA_SCHEMA.properties[sectionKey];
                            const definition = prop?.$ref ? resolveRef(prop.$ref) : prop;
                            title = prop?.title || definition?.title || (sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1));
                        }

                        if (sectionKey !== 'datasetFilters' && sectionKey !== 'welcome' && !DATA_SCHEMA.properties[sectionKey]) return null;

                        const status = calculateSectionStatus(sectionKey, formData);
                        const isVisited = visitedSections.has(sectionKey);

                        return (
                            <li key={sectionKey}>
                                <button
                                    onClick={() => setActiveSection(sectionKey)}
                                    className={`w-full text-left p-3 rounded-md transition-colors duration-150 text-sm font-medium flex items-center justify-between group ${
                                        activeSection === sectionKey
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            : 'text-gray-700 hover:bg-white hover:shadow-sm'
                                    }`}
                                >
                                    <span className="flex-grow">{title}</span>
                                    {sectionKey !== 'welcome' && (
                                        <StatusIcon
                                            status={status}
                                            isActive={activeSection === sectionKey}
                                            isVisited={isVisited}
                                        />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="p-6 border-t border-gray-200 bg-white">
                <button
                    onClick={onDownload}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                </button>
            </div>
        </div>
    );
};

// --- Component: Guidance Panel (Updated) ---
const GuidancePanel = ({ activeGuidance, children }) => (
    <div className="w-full border-l border-gray-200 p-6 bg-gray-50 h-full overflow-y-auto flex-shrink-0">

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            {activeGuidance ? (
                <>
                    <h3 className="text-md font-bold text-indigo-700 mb-3 border-b pb-2">
                        {activeGuidance.title}
                    </h3>
                    {/* Swapped renderGuidance for the more capable MarkdownRenderer */}
                    <MarkdownRenderer content={activeGuidance.guidance} />
                </>
            ) : (
                <div className="text-center py-10 text-gray-400">
                    <p>Select a field to view help.</p>
                </div>
            )}
        </div>

        {/* Render children (like the ERD image) here */}
        {children && (
            <div className="mt-6">
                {children}
            </div>
        )}
    </div>
);

// --- Main Application ---
const SchemaPage = () => {

    const [showDatasetModal, setShowDatasetModal] = useState(false);
    const [existingDatasets, setExistingDatasets] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(false);
    const [datasetError, setDatasetError] = useState('');
    const [datasetStatus, setDatasetStatus] = useState({ active: false, has_draft: false, status: 'DRAFT' });

    // Safety Check on Initialization
    if (!DATA_SCHEMA || !DATA_SCHEMA.properties) {
        return (
            <div className="p-10 text-red-600 font-bold">
                Error: Schema file is invalid or missing 'properties'. Check console or schema file structure.
            </div>
        );
    }
    const [allFeedback, setAllFeedback] = useState({}); // Stores { sectionKey: "comment string" }
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const fetchDatasets = useCallback(async () => {
        const token = localStorage.getItem('token');
        const currentUserId = parseInt(localStorage.getItem('userId'), 10);

        if (!token || !currentUserId) return;

        setLoadingDatasets(true);
        try {
            const activeTeamId = localStorage.getItem('activeTeamId');
            const url = activeTeamId 
                ? `${API_BASE_URL}/datasets/list/simple?team_id=${activeTeamId}`
                : `${API_BASE_URL}/datasets/list/simple`;
                
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setExistingDatasets(data);
        } catch (err) {
            console.error("❌ Fetch failed:", err.message);
            setDatasetError(err.message);
        } finally {
            setLoadingDatasets(false);
        }
    }, []);

    useEffect(() => {
        fetchDatasets();

        const handleSetSection = (e) => {
            if (e.detail) {
                setActiveSection(e.detail);
            }
        };

        window.addEventListener('authChange', fetchDatasets);
        window.addEventListener('setSchemaSection', handleSetSection);
        return () => {
            window.removeEventListener('authChange', fetchDatasets);
            window.removeEventListener('setSchemaSection', handleSetSection);
        };
    }, [fetchDatasets]);

    const handleSelectDataset = async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/datasets/${selectedId}?preview=true`);
            if (response.ok) {
                const result = await response.json();
                const dataWithId = {
                    ...(result.metadata_blob || {}),
                    datasetid: result.id
                };
                setFormData(dataWithId);
                setDatasetStatus({
                    active: result.active,
                    has_draft: result.has_draft,
                    status: result.status
                });
            }
        } catch (err) {
            console.error("Error loading selected dataset:", err);
        }
    };

    const handleRecordDeleted = () => {
        setFormData({});
        setDatasetStatus({ active: false, has_draft: false, status: 'DRAFT' });
        fetchDatasets();
    };

    const handleSaveDraftFeedback = (section, answers) => {
        setAllFeedback(prev => {
            const updated = {
                ...prev,
                [section]: answers
            };
            console.log("Feedback Drafts Updated:", updated); // Debugging line
            return updated;
        });
    };

// Inside the SchemaPage component
const [fallbackData, setFallbackData] = useState(null);

const handleFinalSubmit = (currentSection, currentAnswers) => {
    const finalData = { ...allFeedback, [currentSection]: currentAnswers };

    const feedbackEntries = Object.entries(finalData).filter(([_, answers]) => {
        if (!answers) return false;
        return Object.values(answers).some(val => val !== "" && val !== null);
    });

    if (feedbackEntries.length === 0) {
        alert("No feedback recorded yet");
        return;
    }

    const recipient = "skw24@sussex.ac.uk";
    const subject = "CRUK Datahub Feedback";

    const report = feedbackEntries
        .map(([sectionKey, answers]) => {
            const sectionConfig = questionData[sectionKey] || questionData.default;
            const displayTitle = sectionConfig?.sectionTitle || sectionKey.toUpperCase();
            const lines = Object.entries(answers)
                .map(([qId, val]) => {
                    const question = sectionConfig?.questions?.find(q => q.id === qId);
                    const label = question ? question.label : qId;
                    return `${label}: ${val}`;
                })
                .join('%0D%0A');
            return `SECTION: ${displayTitle}%0D%0A${lines}`;
        })
        .join('%0D%0A%0D%0A-----------------%0D%0A%0D%0A');

    const plainTextReport = report.replace(/%0D%0A/g, '\n');

    let appWasDetected = false;
    const triggerDetection = () => { appWasDetected = true; };
    window.addEventListener('blur', triggerDetection);

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${report}`;

    setTimeout(() => {
        window.removeEventListener('blur', triggerDetection);
        if (!appWasDetected) {
            // Trigger the fallback box instead of just a console log
            setFallbackData(plainTextReport);
        }
    }, 1000);

    setAllFeedback({});
    setIsFeedbackOpen(false);
};

    const [formData, setFormData] = useState({});
    const [welcomeGuidanceContent, setWelcomeGuidanceContent] = useState('');
        useEffect(() => {
            fetch('../guidance.md')
                .then(response => response.text())
                .then(text => {
                    setWelcomeGuidanceContent(text);
                })
                .catch(err => console.error("Failed to load guidance.md:", err));
        }, []);

    // Initialize with Welcome section
    const initialSection = VISIBLE_SECTIONS[0] || Object.keys(DATA_SCHEMA.properties)[0];
    const [activeSection, setActiveSection] = useState(initialSection);
    const [activeGuidance, setActiveGuidance] = useState(null);

    // Track visited sections (Start with the initial one)
    const [visitedSections, setVisitedSections] = useState(new Set([initialSection]));
    const currentGuidance = useMemo(() => {
    // 1. Handle the dedicated welcome page guidance
        if (activeSection === 'welcome') {
            return {
                guidance: welcomeGuidanceContent
            };
        }

    // 2. If a specific field input has focused, display field-specific guidance
    if (activeGuidance) {
        return activeGuidance;
    }

    // 3. Fallback: Extract section-level guidance if no field is focused
    const sectionSchema = DATA_SCHEMA.properties?.[activeSection];
    if (sectionSchema && sectionSchema.guidance) {
        return {
            title: sectionSchema.title || activeSection,
            guidance: sectionSchema.guidance
        };
    }

    return null;
    }, [activeSection, activeGuidance, welcomeGuidanceContent]);
    const handleNavChange = (key) => {
        setVisitedSections(prev => new Set(prev).add(key));
        setActiveSection(key);
        setActiveGuidance(null);
    };

    // --- UPDATED HANDLE DATA CHANGE (DEEP MERGE + LOGGING) ---
    const handleDataChange = useCallback((path, value) => {
        console.group("Data Change Debug");
        console.log("1. Path being updated:", path);
        console.log("2. New Value to set:", value);

        setFormData(prev => {
            console.log("3. State BEFORE update:", JSON.parse(JSON.stringify(prev)));

            const newData = { ...prev };
            let current = newData;

            for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];
                const nextKey = path[i + 1];

                // Ensure the current level exists
                if (current[key] === undefined) {
                    current[key] = typeof nextKey === 'number' ? [] : {};
                }

                // Clone the container to ensure we don't mutate state directly
                // but ONLY clone the branch we are traversing (preserving siblings)
                if (Array.isArray(current[key])) {
                    current[key] = [...current[key]];
                } else {
                    current[key] = { ...current[key] };
                }

                // Move pointer down
                current = current[key];
            }

            // Set the value at the target
            current[path[path.length - 1]] = value;

            console.log("4. State AFTER update:", JSON.parse(JSON.stringify(newData)));
            console.groupEnd();

            return newData;
        });
    }, []);

    const preprocessData = (data, schemaDefinition) => {
        if (!data || typeof data !== 'object') return data;

        const newData = Array.isArray(data) ? [...data] : { ...data };

        // 1. Fix Structural Metadata Structure (Wrap Array in Object if needed)
        if (Array.isArray(newData.structuralMetadata)) {
            newData.structuralMetadata = { tables: newData.structuralMetadata };
        }

        // 2. Merge Duplicate Tables (The Fix for your specific issue)
        if (newData.structuralMetadata && Array.isArray(newData.structuralMetadata.tables)) {
            const tableMap = new Map();

            newData.structuralMetadata.tables.forEach(table => {
                // Use Table Name as the unique key
                const tableName = table.name;

                if (tableName && tableMap.has(tableName)) {
                    // If table exists, merge the new columns into the existing table
                    const existingTable = tableMap.get(tableName);
                    const newColumns = table.columns || [];

                    // Safely combine columns
                    existingTable.columns = [...(existingTable.columns || []), ...newColumns];

                    // Optional: If the existing description is empty but the new one isn't, use the new one
                    if (!existingTable.description && table.description) {
                        existingTable.description = table.description;
                    }
                } else {
                    // First time seeing this table? Add it to our map.
                    // We deep clone it to ensure we don't mess up references.
                    tableMap.set(tableName, JSON.parse(JSON.stringify(table)));
                }
            });

            // Convert the map back into an array
            newData.structuralMetadata.tables = Array.from(tableMap.values());
        }

        // 3. Standard Recursive Cleaning
        Object.keys(newData).forEach(key => {
            if (key === 'keywords' && typeof newData[key] === 'string' && newData[key].includes(';,;')) {
                newData[key] = newData[key].split(';,;');
            }

            if (typeof newData[key] === 'object' && newData[key] !== null) {
                newData[key] = preprocessData(newData[key], schemaDefinition);
            }
        });

        return newData;
    };

    const handleJsonUpload = useCallback((uploadedData) => {
        // Preprocess the data to fix known serialization issues (like keywords)
        const cleanData = preprocessData(uploadedData, DATA_SCHEMA);

        setFormData(cleanData);

        const allSections = Object.keys(DATA_SCHEMA.properties);
        setVisitedSections(new Set([...allSections, 'datasetFilters', 'welcome']));
    }, [DATA_SCHEMA]);

    const handleTagRemove = (idToRemove) => {
        const currentTags = formData['datasetFilters'] || [];
        // Filter by the id property within the objects
        const newTags = currentTags.filter(tag => tag.id !== idToRemove);
        handleDataChange(['datasetFilters'], newTags);
    };


    const associateIcons = (formData, prefixIconMapping) => {
        // 1. Safety check: if no filters exist, return empty icons array
        if (!formData.datasetFilters || !Array.isArray(formData.datasetFilters)) {
            return { ...formData, icons: [] };
        }

        // 2. Extract unique data IDs that specifically start with "0_2"
        const dataIds = formData.datasetFilters
            .map(item => (typeof item === 'object' ? item.id : item))
            .filter(id => id && id.startsWith("0_2"));

        // 3. Use a Set to collect unique icon strings directly
        const uniqueIcons = new Set();

        dataIds.forEach(id => {
            // Check both potential truncation lengths
            const trunc5 = id.substring(0, 5);
            const trunc7 = id.substring(0, 7);

            // If a mapping exists for either truncation, add it to our Set
            if (prefixIconMapping[trunc5]) {
                uniqueIcons.add(prefixIconMapping[trunc5]);
            }
            if (prefixIconMapping[trunc7]) {
                uniqueIcons.add(prefixIconMapping[trunc7]);
            }
        });

        // 4. Return the new object with a deduplicated array of icons
        return {
            ...formData,
            icons: Array.from(uniqueIcons)
        };
    };

        const downloadJSON = async () => {
    // 1. Associate icons based on dataset filters
    let processedData = associateIcons(formData, prefixIconMapping);
    processedData = removeEmptyArrayEntries(processedData);

const filters = processedData.datasetFilters || [];
    const tops = filters.filter(f => f.id?.startsWith("0_0_0")).map(f => f.label);
    const hist = filters.filter(f => f.id?.startsWith("0_0_1")).map(f => f.label);

    console.log("DEBUG 1 - Tops extracted:", tops);
    console.log("DEBUG 2 - Hist extracted:", hist);

    if (tops.length > 0 && hist.length > 0) {
        try {
            console.log("DEBUG 3 - Entering API block. Both tops and hist exist.");
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}datasets/extra-terms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topographies: tops, histologies: hist })
            });

            console.log("DEBUG 4 - API Response Status:", response.status);

            if (response.ok) {
                const lookupMap = await response.json();
                console.log("DEBUG 5 - lookupMap from database:", lookupMap);

                const convertedTerms = getExtra(processedData, lookupMap);
                console.log("DEBUG 6 - convertedTerms calculated:", convertedTerms);

                processedData.datasetFilters = [...processedData.datasetFilters, ...convertedTerms];
                console.log("DEBUG 7 - Final merged filters:", processedData.datasetFilters);
            } else {
                console.warn("DEBUG ERROR - API returned status:", response.status);
            }
        } catch (err) {
            console.error("DEBUG ERROR - Network failure:", err);
        }
    } else {
        console.log("DEBUG - Bypassing lookup. Missing either topography or histology tags.");
    }

    // 3. Apply Semantic Defaults
    const applyDefaults = (data, sectionKey) => {
        if (!data) return data;
        const sectionSchema = DATA_SCHEMA.properties[sectionKey];
        let definition = sectionSchema;

        if (sectionSchema?.$ref) {
            definition = resolveRef(sectionSchema.$ref);
        } else if (sectionSchema?.allOf) {
            const refItem = sectionSchema.allOf.find(i => i.$ref);
            if (refItem) definition = resolveRef(refItem.$ref);
        }

        const sectionProps = definition?.properties;
        if (!sectionProps) return data;

        const updated = { ...data };
        Object.keys(sectionProps).forEach(key => {
            if (isEmpty(updated[key]) && sectionProps[key].default !== undefined) {
                updated[key] = sectionProps[key].default;
            }
        });
        return updated;
    };

    if (processedData.summary) {
        processedData.summary = applyDefaults(processedData.summary, 'summary');
    }

    // 4. Version & Revision Logic
    const currentVersion = processedData.version;
    const revisions = processedData.revisions || [];

    if (currentVersion) {
        const versionExists = revisions.some(rev => rev.version === currentVersion);
        if (!versionExists) {
            const newRevision = {
                version: currentVersion,
                url: null
            };
            processedData = {
                ...processedData,
                revisions: [...revisions, newRevision]
            };
        }
    }

    // 5. Update Timestamps
    processedData.modified = new Date().toISOString();

    // 6. Generate and trigger download
    const fileData = JSON.stringify(processedData, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const fileName = processedData.summary?.title
        ? `${processedData.summary.title.replace(/\s+/g, '_')}_metadata.json`
        : "dataset_metadata.json";

    link.download = fileName;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
};

return (
        <div className="flex flex-col min-h-screen font-sans bg-white">
            {/* Fallback Box for missing Email App */}
                {fallbackData && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60 p-4 pointer-events-auto">
                        {/* Added 'relative' to allow absolute positioning of the 'x' button */}
                        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full border border-gray-300 relative">

                            {/* The 'x' Dismiss Button */}
                            <button
                                onClick={() => setFallbackData(null)}
                                className="absolute top-4 right-6 text-4xl text-gray-400 hover:text-red-600 transition-colors leading-none"
                                aria-label="Close"
                            >
                                &times;
                            </button>

                            <h2 className="text-2xl font-bold text-red-700 mb-4 pr-8">
                                Email Client Not Found
                            </h2>

                            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                                Unable to open your email app. Please copy to clipboard and manually email to skw24@sussex.ac.uk.
                            </p>

                            <textarea
                                readOnly
                                className="w-full h-48 p-4 border border-gray-200 rounded-lg bg-gray-50 text-base mb-6 font-mono focus:ring-2 focus:ring-indigo-500"
                                value={fallbackData}
                            />

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(fallbackData);
                                    setFallbackData(null);
                                }}
                                className="w-full py-5 bg-indigo-700 text-white font-bold rounded-lg text-lg hover:bg-indigo-800 transition-all shadow-lg active:scale-[0.98]"
                            >
                                Copy to Clipboard & Close
                            </button>
                        </div>
                    </div>
                )}
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                activeSection={activeSection}
                // Check this line below - you must pass the state!
                allFeedback={allFeedback}
                onSaveDraft={handleSaveDraftFeedback}
                onFinalSubmit={handleFinalSubmit}
                questionData ={questionData}
            />

            <UploadTopBar
                formData={formData}
                schema={DATA_SCHEMA}
                prefixIconMapping={prefixIconMapping}
                pageType="datasets"
                onDeleteSuccess={handleRecordDeleted}
                datasetStatus={datasetStatus}
                onSaveSuccess={(result) => {
                    setDatasetStatus({ active: result.active, has_draft: result.has_draft, status: result.status });
                    fetchDatasets();
                }}
            />

            <div className="flex-grow overflow-hidden h-[calc(100vh-40px)]">
                <Group orientation="horizontal">

                    {/* LEFT PANEL: Navigation */}
                    <Panel defaultSize={20} minSize={15}>
                        <div data-tour="metadata-sections-left" className="h-full w-full">
                            <SchemaNav
                                activeSection={activeSection}
                                setActiveSection={handleNavChange}
                                onDownload={downloadJSON}
                                formData={formData}
                                visitedSections={visitedSections}
                            />
                        </div>
                    </Panel>

                    <Separator className="w-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize" />

                    {/* MIDDLE PANEL: Main Form */}
                    <Panel defaultSize={55} minSize={30}>
                        <div data-tour="metadata-sections-central" className="h-full flex justify-center w-full">
                            <SchemaForm
                                sectionKey={activeSection}
                                formData={formData}
                                onFormChange={handleDataChange}
                                setActiveGuidance={setActiveGuidance}
                                onUpload={handleJsonUpload}
                                existingDatasets={existingDatasets}
                                loadingDatasets={loadingDatasets}
                                datasetError={datasetError}
                                handleSelectDataset={handleSelectDataset}
                            />
                        </div>
                    </Panel>

                    <Separator className="w-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize" />

                    {/* RIGHT PANEL: Guidance or Tags */}
{/* RIGHT PANEL: Guidance, AI, or Preview */}
<Panel defaultSize={25} minSize={20}>
    <AssistantPane
        activeGuidance={currentGuidance}
        formData={formData}
        activeSection={activeSection}
        setActiveSection={handleNavChange}
        onFormChange={handleDataChange}
        >

        {/* Append Active Tags directly inside AssistantPane when viewing filters */}
        {activeSection === 'datasetFilters' && (
            <div className="mt-4 border-t pt-4 border-gray-200">
                <h2 className="text-sm font-bold mb-3 text-gray-700">Active Tags</h2>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 min-h-[150px]">
                    <FilterChipArea
                        selectedFilters={formData['datasetFilters'] || []}
                        handleFilterChange={handleTagRemove}
                    />
                </div>
            </div>
        )}

        {/* Retain existing layout functionality for Entity Relationship Diagrams */}
        {activeSection === 'erd' && (
            <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg mt-4">
                <p className="text-xs font-bold text-gray-700 mb-2">Visual Schema Linkage</p>
                <img
                    src='../assets/erd.png'
                    alt="Entity Relationship Diagram"
                    className="max-w-full h-auto border border-gray-300 shadow-sm"
                />
            </div>
        )}

    </AssistantPane>
</Panel>


                </Group>
            </div>
        </div>
    );
};

export default SchemaPage;