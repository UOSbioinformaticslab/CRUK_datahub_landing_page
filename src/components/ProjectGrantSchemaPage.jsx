import React, { useState, useCallback } from 'react';
import { Panel, Group, Separator } from "react-resizable-panels";
import FeedbackModal from './FeedbackModal.jsx';
import questionData from '../feedback/upload_questions.json';
import schema from '../utils/schema.json';
import projectSchema from '../utils/projectSchema.json';
import semanticSchema from 'cruk-semantic-schema';
import JsonUpload from './JsonUpload.jsx';
import UploadTopBar from './UploadTopBar.jsx';
import prefixIconMapping from '../utils/prefix_icon_mapping.json';

const deepMerge = (target, source) => {
    if (typeof target !== 'object' || target === null) return source || target;
    if (typeof source !== 'object' || source === null) return target;

    const output = Array.isArray(target) ? [...target] : { ...target };
    Object.keys(source).forEach(key => {
        const targetValue = output[key];
        const sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            output[key] = sourceValue;
        } else if (typeof targetValue === 'object' && typeof sourceValue === 'object') {
            output[key] = deepMerge(targetValue, sourceValue);
        } else {
            output[key] = sourceValue;
        }
    });
    return output;
};

const RAW_SCHEMA = schema.properties ? schema : (schema.fullContent || {});
const PROJECT_SCHEMA = projectSchema.properties ? projectSchema : (projectSchema.fullContent || projectSchema);
const OVERLAY_SCHEMA = semanticSchema.properties ? semanticSchema : (semanticSchema.fullContent || semanticSchema);
const PARTIAL_SCHEMA = deepMerge(RAW_SCHEMA, OVERLAY_SCHEMA);
const DATA_SCHEMA = deepMerge(PARTIAL_SCHEMA, PROJECT_SCHEMA);

const EXTRA_VALIDATIONS = {
    "datasetFilters": (value) => {
        if (!Array.isArray(value)) return false;
        return value.every(item =>
            typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.label === 'string'
        );
    }
};

const resolveRef = (ref) => {
    if (!ref || typeof ref !== 'string' || !ref.startsWith('#/$defs/')) return null;
    const defKey = ref.split('/').pop();
    return DATA_SCHEMA.$defs ? DATA_SCHEMA.$defs[defKey] : null;
};

const getValueByPath = (obj, path) => {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj);
};

const MarkdownRenderer = ({ content }) => {
    if (!content) return null;
    const lines = content.replace(/\\n/g, '\n').split('\n');

    return (
        <div className="markdown-output space-y-3 text-sm text-gray-700">
            {lines.map((line, index) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={index} className="h-1" />;

                if (trimmed.startsWith('#')) {
                    const level = (trimmed.match(/^#+/) || ['#'])[0].length;
                    const text = trimmed.replace(/^#+\s*/, '');
                    const sizeClass = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-md';
                    return (
                        <h4 key={index} className={`${sizeClass} font-bold text-gray-900 mt-4 mb-2 border-b pb-1 border-gray-100`}>
                            {parseInline(text)}
                        </h4>
                    );
                }

                if (/^\d+\.\s/.test(trimmed)) {
                    const text = trimmed.replace(/^\d+\.\s*/, '');
                    const number = trimmed.match(/^\d+/)[0];
                    return (
                        <div key={index} className="flex items-start gap-3 ml-1">
                            <span className="font-bold text-indigo-600 min-w-[1.25rem]">{number}.</span>
                            <span className="leading-relaxed">{parseInline(text)}</span>
                        </div>
                    );
                }

                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    const text = trimmed.replace(/^[*|-]\s*/, '');
                    return (
                        <div key={index} className="flex items-start gap-3 ml-2">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            <span className="leading-relaxed">{parseInline(text)}</span>
                        </div>
                    );
                }

                return <p key={index} className="leading-relaxed">{parseInline(line)}</p>;
            })}
        </div>
    );
};

const parseInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-gray-800">{part.slice(1, -1)}</em>;
        if (part.startsWith('[') && part.includes('](')) {
            const match = part.match(/\[(.*?)\]\((.*?)\)/);
            if (match) {
                return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{match[1]}</a>;
            }
        }
        return part;
    });
};

const WelcomeSection = ({ onUpload }) => (
    <div className="p-8 pb-4 w-full">
        <h1 className="text-3xl font-extrabold mb-4 text-gray-900">Guide to Uploading and Modifying Information about your CRUK project</h1>

        <div className="text-sm text-gray-600 mb-1 leading-relaxed">
            If this is a new project, you will find here a data stub that we have derived from your accepted CRUK grant proposal. Feel free to add details - particularly to the
            section about the project scope.

        </div>

        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            To modify an existing project dataset, choose from your existing projects below to retrieve the existing information for manual adjustment, to download the information, or to upload amendments.
        </p>

        <div className="mb-6 max-w-lg">
            <select
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm text-gray-700 cursor-pointer"
                defaultValue=""
                onChange={(e) => {
                    if (e.target.value) {
                        alert(`You selected: ${e.target.options[e.target.selectedIndex].text}\n(Logic to load this dataset would go here)`);
                    }
                }}
            >
                <option value="" disabled>-- Select an existing dataset --</option>
                <option value="dataset1">Dataset for histopathology reports for prostatic carcinoma</option>
                <option value="dataset2">The Cancer Imaging Archive</option>
                <option value="dataset3">Longitudinal breast cancer data</option>
            </select>
        </div>
    </div>
);

const GuidancePanel = ({ activeGuidance }) => (
    <div className="w-full border-l border-gray-200 p-6 bg-gray-50 h-full overflow-y-auto flex-shrink-0">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            {activeGuidance ? (
                <>
                    <h3 className="text-md font-bold text-indigo-700 mb-3 border-b pb-2">
                        {activeGuidance.title}
                    </h3>
                    <MarkdownRenderer content={activeGuidance.guidance} />
                </>
            ) : (
                <div className="text-center py-10 text-gray-400">
                    <p>Select a field to view help.</p>
                </div>
            )}
        </div>
    </div>
);

const FieldRenderer = ({ propKey, prop, path, formData, onChange, isRequired, setActiveGuidance, level = 0 }) => {
    const getDefinitionAndEnum = (p) => {
        let definition = p;
        const resolve = (obj) => (obj && obj.$ref && typeof obj.$ref === 'string') ? resolveRef(obj.$ref) : obj;

        definition = resolve(definition) || definition;
        if (definition.allOf) {
            const refItem = definition.allOf.find(i => i.$ref);
            if (refItem) definition = resolve(refItem) || definition;
        }
        if (definition.anyOf) {
            const nonNullOptions = definition.anyOf.filter(i => resolve(i)?.type !== 'null');
            if (nonNullOptions.length > 0) {
                const selected = nonNullOptions.find(i => resolve(i)?.type === 'array' || resolve(i)?.type === 'object') || nonNullOptions[0];
                definition = resolve(selected) || selected;
            }
        }
        return { definition, enumValues: definition.enum || prop.enum, isArray: prop.type === 'array' || definition.type === 'array' };
    };

    const { definition: fieldDef, enumValues, isArray } = getDefinitionAndEnum(prop);
    const rawValue = getValueByPath(formData, path);
    const currentValue = (rawValue !== undefined && rawValue !== null) ? rawValue : (prop.default !== undefined ? prop.default : '');

    const handleFocus = () => {
        const guidance = prop.guidance || prop.description || 'No specific guidance provided.';
        setActiveGuidance({ title: prop.title || propKey, guidance });
    };

    if (isArray) {
        const items = Array.isArray(currentValue) && currentValue.length > 0 ? currentValue : [''];
        
        const handleInputChange = (index, newVal) => {
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
            newArr.push('');
            onChange(path, newArr);
        };

        return (
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">{prop.title || propKey}</label>
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="relative group flex items-center">
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 pr-10"
                                placeholder={prop.examples ? prop.examples.join(', ') : "Enter value..."}
                                value={item || ''}
                                onFocus={handleFocus}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                            />
                            <button 
                                type="button" 
                                onClick={() => handleRemoveItem(index)}
                                className="absolute right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-colors"
                                title="Remove item"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Add another
                    </button>
                </div>
            </div>
        );
    }

    if (fieldDef.type === 'object' && fieldDef.properties && !isArray) {
        return (
            <div className={`border-l-2 border-gray-200 pl-4 mb-6 ${level > 0 ? 'mt-4' : ''}`}>
                <h3 className="text-md font-bold text-gray-700 mb-4">{prop.title || propKey}</h3>
                {Object.keys(fieldDef.properties).map((childKey) => (
                    <FieldRenderer
                        key={childKey} propKey={childKey} prop={fieldDef.properties[childKey]}
                        path={[...path, childKey]} formData={formData} onChange={onChange}
                        isRequired={fieldDef.required?.includes(childKey)} setActiveGuidance={setActiveGuidance} level={level + 1}
                    />
                ))}
            </div>
        );
    }

    const inputType = fieldDef.type === 'boolean' ? 'checkbox' : enumValues ? 'select' : prop.maxLength > 150 ? 'textarea' : 'text';

    const handleChange = (e) => {
        let val = inputType === 'checkbox' ? e.target.checked : e.target.value;
        onChange(path, val);
    };

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4`}>
            <label className="block text-sm font-bold text-gray-700 mb-1">
                {prop.title || propKey} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">{prop.description}</p>

            {inputType === 'textarea' ? (
                <textarea className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500" rows={4} value={currentValue || ''} onFocus={handleFocus} onChange={handleChange} />
            ) : inputType === 'select' ? (
                <select className="w-full p-2 border border-gray-300 rounded" value={currentValue || ''} onFocus={handleFocus} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {enumValues.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : inputType === 'checkbox' ? (
                <input type="checkbox" className="h-4 w-4 text-indigo-600 rounded" checked={!!currentValue} onFocus={handleFocus} onChange={handleChange} />
            ) : (
                <input type={fieldDef.format === 'date' || fieldDef.format === 'date-time' ? 'date' : 'text'} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500" value={currentValue || ''} onFocus={handleFocus} onChange={handleChange} />
            )}
        </div>
    );
};

const SchemaForm = ({ formData, onFormChange, setActiveGuidance }) => {
    const projectDef = DATA_SCHEMA.$defs?.ProjectGrant || DATA_SCHEMA;
    const properties = projectDef.properties || {};

    if (Object.keys(properties).length === 0) return <p className="p-8">No project properties found in schema.</p>;

    return (
        <div className="w-full px-8 pb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Project Details</h2>
            <div className="space-y-6">
                {Object.keys(properties)
                    .filter((propKey) => propKey !== 'pid') // Exclude pid from rendering
                    .map((propKey) => (
                        <FieldRenderer
                            key={propKey}
                            propKey={propKey}
                            prop={properties[propKey]}
                            path={[propKey]}
                            formData={formData}
                            onChange={onFormChange}
                            isRequired={projectDef.required?.includes(propKey)}
                            setActiveGuidance={setActiveGuidance}
                        />
                ))}
            </div>
        </div>
    );
};

const SchemaPage = () => {
    if (!DATA_SCHEMA || !DATA_SCHEMA.$defs) return <div className="p-10 text-red-600 font-bold">Schema invalid.</div>;

    const [allFeedback, setAllFeedback] = useState({});
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [fallbackData, setFallbackData] = useState(null);
    const [formData, setFormData] = useState({});
    const [activeGuidance, setActiveGuidance] = useState(null);

    const handleDataChange = useCallback((path, value) => {
        setFormData(prev => {
            const newData = { ...prev };
            let current = newData;
            for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];
                if (current[key] === undefined) current[key] = typeof path[i + 1] === 'number' ? [] : {};
                current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
                current = current[key];
            }
            current[path[path.length - 1]] = value;
            return newData;
        });
    }, []);

    const handleJsonUpload = useCallback((uploadedData) => {
        setFormData(uploadedData);
    }, []);

    const handleSaveDraftFeedback = (section, answers) => {
        setAllFeedback(prev => ({ ...prev, [section]: answers }));
    };

    const handleFinalSubmit = (currentSection, currentAnswers) => {
        const finalData = { ...allFeedback, [currentSection]: currentAnswers };
        const feedbackEntries = Object.entries(finalData).filter(([_, answers]) => answers && Object.values(answers).some(val => val !== "" && val !== null));

        if (feedbackEntries.length === 0) {
            alert("No feedback recorded yet");
            return;
        }

        const report = feedbackEntries.map(([sectionKey, answers]) => {
            const sectionConfig = questionData[sectionKey] || questionData.default;
            const displayTitle = sectionConfig?.sectionTitle || sectionKey.toUpperCase();
            const lines = Object.entries(answers).map(([qId, val]) => {
                const label = sectionConfig?.questions?.find(q => q.id === qId)?.label || qId;
                return `${label}: ${val}`;
            }).join('%0D%0A');
            return `SECTION: ${displayTitle}%0D%0A${lines}`;
        }).join('%0D%0A%0D%0A-----------------%0D%0A%0D%0A');

        const plainTextReport = report.replace(/%0D%0A/g, '\n');

        let appWasDetected = false;
        const triggerDetection = () => { appWasDetected = true; };
        window.addEventListener('blur', triggerDetection);

        window.location.href = `mailto:skw24@sussex.ac.uk?subject=CRUK Datahub Feedback&body=${report}`;

        setTimeout(() => {
            window.removeEventListener('blur', triggerDetection);
            if (!appWasDetected) setFallbackData(plainTextReport);
        }, 1000);

        setAllFeedback({});
        setIsFeedbackOpen(false);
    };

    const downloadJSON = () => {
        const fileData = JSON.stringify({ ...formData, modified: new Date().toISOString() }, null, 2);
        const blob = new Blob([fileData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${formData.projectGrantName?.replace(/\s+/g, '_') || 'project'}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col min-h-screen font-sans bg-white">
            {fallbackData && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60 p-4 pointer-events-auto">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full border border-gray-300 relative">
                        <button onClick={() => setFallbackData(null)} className="absolute top-4 right-6 text-4xl text-gray-400 hover:text-red-600 transition-colors leading-none" aria-label="Close">&times;</button>
                        <h2 className="text-2xl font-bold text-red-700 mb-4 pr-8">Email Client Not Found</h2>
                        <p className="text-lg text-gray-700 mb-6 leading-relaxed">Unable to open your email app. Please copy to clipboard and manually email to skw24@sussex.ac.uk.</p>
                        <textarea readOnly className="w-full h-48 p-4 border border-gray-200 rounded-lg bg-gray-50 text-base mb-6 font-mono focus:ring-2 focus:ring-indigo-500" value={fallbackData} />
                        <button onClick={() => { navigator.clipboard.writeText(fallbackData); setFallbackData(null); }} className="w-full py-5 bg-indigo-700 text-white font-bold rounded-lg text-lg hover:bg-indigo-800 transition-all shadow-lg active:scale-[0.98]">Copy to Clipboard & Close</button>
                    </div>
                </div>
            )}

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                activeSection="projectGrant"
                allFeedback={allFeedback}
                onSaveDraft={handleSaveDraftFeedback}
                onFinalSubmit={handleFinalSubmit}
                questionData={questionData}
            />

            <UploadTopBar formData={formData} schema={DATA_SCHEMA} prefixIconMapping={prefixIconMapping} pageType="project" />



            <div className="flex-grow overflow-hidden h-[calc(100vh-40px)]">
                <Group orientation="horizontal">
                    <Panel defaultSize={75} minSize={50}>
                        <div className="h-full flex flex-col overflow-y-auto">
                            <WelcomeSection onUpload={handleJsonUpload} />
                            <SchemaForm formData={formData} onFormChange={handleDataChange} setActiveGuidance={setActiveGuidance} />
                            <div className="p-8 border-t border-gray-200 bg-gray-50 mt-auto">
                                <button onClick={downloadJSON} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-transform active:scale-95">
                                    Download JSON
                                </button>
                            </div>
                        </div>
                    </Panel>

                    <Separator className="w-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize" />

                    <Panel defaultSize={25} minSize={20}>
                        <GuidancePanel activeGuidance={activeGuidance} />
                    </Panel>
                </Group>
            </div>
        </div>
    );
};

export default SchemaPage;