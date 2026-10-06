import React, { useState, useRef, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import ReactMarkdown from 'react-markdown';
import { getProjectUrl, getDatasetUrl } from '../utils/urlUtils';

const getPageContext = () => {
    const url = new URL(window.location.href);
    const path = url.pathname;
    const searchParams = new URLSearchParams(url.search);
    
    let pageType = 'unknown';
    let entityId = null;
    
    if (path.includes('meta') && !path.includes('project')) {
        pageType = 'dataset_detail';
        entityId = searchParams.get('id');
    } else if (path.includes('project_meta')) {
        pageType = 'project_detail';
        entityId = searchParams.get('pid');
    } else if (path.includes('datasets')) {
        pageType = 'datasets_list';
    } else if (path.includes('projects')) {
        pageType = 'projects_list';
    } else if (path.includes('publications')) {
        pageType = 'publications_list';
    } else if (path.includes('tools') || path.includes('page-4')) {
        pageType = 'tools_list';
    }

    return { page: pageType, entity_id: entityId };
};

const getInitialGreeting = (pageType) => {
    switch(pageType) {
        case 'datasets_list':
            return "Hi! I'm here to help you find out reports about the datasets in the CRUK metadata catalogue. You can ask me things like 'Find datasets with information about ethnicity'.";
        case 'projects_list':
            return "Hi! I'm here to help you find out reports about the projects in the CRUK metadata catalogue. You can ask me things like 'Find projects with information about lung cancer'.";
        case 'publications_list':
            return "Hi! I'm here to help you find out reports about the publications in the CRUK metadata catalogue. You can ask me things like 'Find publications from 2023'.";
        case 'tools_list':
            return "Hi! I'm here to help you find out reports about the tools in the CRUK metadata catalogue. You can ask me things like 'Find tools for genomic analysis'.";
        case 'dataset_detail':
            return "Hi! I'm here to help you find out reports about the datasets in the CRUK metadata catalogue. You can ask me things like 'Find datasets with information about ethnicity'.\n\n*(Note: Your search will be confined to this specific dataset).*";
        case 'project_detail':
            return "Hi! I'm here to help you find out reports about the projects in the CRUK metadata catalogue. You can ask me things like 'Find projects with information about lung cancer'.\n\n*(Note: Your search will be confined to this specific project).*";
        default:
            return "Hi! I'm here to help you find out about the datasets, projects, publications and tools in the metadata catalogue.";
    }
};

const ChatWidget = () => {
    const pageContext = useRef(getPageContext());
    const [isOpen, setIsOpen] = useState(false);
    
    // Initialize messages from sessionStorage, or fallback to default greeting
    const [messages, setMessages] = useState(() => {
        const saved = sessionStorage.getItem('crukChatMessages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse chat messages", e);
            }
        }
        return [{ role: 'assistant', text: getInitialGreeting(pageContext.current.page) }];
    });

    // Save messages to sessionStorage whenever they change
    useEffect(() => {
        sessionStorage.setItem('crukChatMessages', JSON.stringify(messages));
    }, [messages]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [turnstileKey, setTurnstileKey] = useState(0);
    
    // Dragging state
    const [position, setPosition] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ offsetX: 0, offsetY: 0 });
    const widgetRef = useRef(null);
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleClear = (e) => {
        e.stopPropagation();
        setMessages([{ role: 'assistant', text: getInitialGreeting(pageContext.current.page) }]);
        sessionStorage.removeItem('crukChatMessages');
    };

    // Dragging logic
    const handleMouseDown = (e) => {
        if (!widgetRef.current) return;
        const rect = widgetRef.current.getBoundingClientRect();
        setIsDragging(true);
        dragStartPos.current = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStartPos.current.offsetX,
                    y: e.clientY - dragStartPos.current.offsetY
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleSend = async (text, isSearchConfirmation = false) => {
        const query = text || input;
        if (!query.trim()) return;

        if (!isSearchConfirmation) {
            setMessages(prev => [...prev, { role: 'user', text: query }]);
        } else {
            setMessages(prev => [...prev, { role: 'user', text: "Yes, search the internet." }]);
        }
        
        if (!text) setInput('');
        setIsLoading(true);

        try {
            const aiUrl = import.meta.env.VITE_MICROSERVICE_URL || "http://localhost:8001";
            const activeTeamId = localStorage.getItem('activeTeamId');
            const userId = localStorage.getItem('userId');
            
            const payload = { 
                question: query, 
                context: 'public',
                is_search_confirmation: isSearchConfirmation,
                team_id: activeTeamId,
                user_id: userId,
                page_context: pageContext.current,
                turnstile_token: turnstileToken
            };

            const response = await fetch(`${aiUrl}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            
            if (data.matching_ids) {
                window.dispatchEvent(new CustomEvent('apply-dataset-filters', { detail: data.matching_ids }));
            }
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: data.answer || "I couldn't process that query.",
                requires_search_confirmation: data.requires_search_confirmation,
                citations: data.citations,
                actions: data.actions
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: "Sorry, I'm having trouble connecting to the analytics server right now." 
            }]);
        } finally {
            setIsLoading(false);
            setTurnstileKey(prev => prev + 1); // Force new token generation for the next question
        }
    };

    const starterPrompts = [
        "Which datasets have information on Breast Cancer?",
        "Find datasets with genomic sequences",
        "How many datasets include ethnicity data?"
    ];

    if (!isOpen) {
        return (
            <div className="fixed bottom-6 right-6 z-50 group">
                {/* Custom Tooltip */}
                <div className="absolute bottom-full right-0 mb-3 w-max px-3 py-2 bg-white text-gray-800 border border-gray-200 text-xs font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    AI chatbot - powered by Gemini 3.5
                    {/* Tooltip triangle tail */}
                    <div className="absolute top-full right-5 -mt-px border-4 border-transparent border-t-white"></div>
                </div>
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-[#E40085] hover:bg-[#c90075] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                </button>
            </div>
        );
    }

    return (
        <div 
            ref={widgetRef}
            style={position ? { left: position.x, top: position.y, bottom: 'auto', right: 'auto' } : {}}
            className={`fixed ${!position ? 'bottom-6 right-6' : ''} w-96 h-[500px] min-w-[300px] min-h-[400px] resize overflow-hidden bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col z-50`}
        >
            {/* Header */}
            <div 
                onMouseDown={handleMouseDown}
                className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-200 cursor-move select-none"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#E40085] rounded-full animate-pulse"></div>
                    <h3 className="text-gray-800 font-semibold">Datahub Analytics AI</h3>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={handleClear}
                        title="Clear Chat"
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        title="Minimize"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user' 
                            ? 'bg-[#E40085] text-white rounded-br-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}>
                            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 break-words">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                            
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 font-semibold mb-1">Sources:</p>
                                    <ul className="list-disc pl-4">
                                        {msg.citations.map((c, i) => (
                                            <li key={i}><a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#E40085] hover:underline text-xs">{c.title}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {msg.actions && msg.actions.length > 0 && (
                                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-200">
                                    {msg.actions.map((act, i) => (
                                        <a key={i} href={act.type === 'view_project' ? getProjectUrl(act.id) : getDatasetUrl(act.id)} className="block text-center bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                                            {act.label}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {msg.requires_search_confirmation && idx === messages.length - 1 && (
                                <div className="flex gap-2 mt-3 border-t border-gray-200 pt-3">
                                    <button 
                                        onClick={() => handleSend(messages[idx-1]?.text, true)} 
                                        className="bg-[#E40085] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#c90075] transition-colors"
                                    >
                                        Yes, search
                                    </button>
                                    <button 
                                        onClick={() => setMessages(prev => [...prev, { role: 'user', text: 'No' }, { role: 'assistant', text: 'Okay, no problem.' }])} 
                                        className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        No
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {messages.length === 1 && (
                    <div className="flex flex-col gap-2 mt-4">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Suggestions</p>
                        {starterPrompts.map((prompt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleSend(prompt)}
                                className="text-left text-sm bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg border border-gray-200 shadow-sm transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-[#E40085] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-[#E40085] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-[#E40085] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Hidden Bot Protection */}
            <div className="hidden">
                <Turnstile 
                    key={turnstileKey}
                    siteKey="1x00000000000000000000AA" 
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: 'light', size: 'invisible' }}
                />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your datasets..."
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E40085] focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-[#E40085] hover:bg-[#c90075] disabled:opacity-50 disabled:hover:bg-[#E40085] text-white p-2 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                </form>
            </div>
            
            {/* CSS Resize Handle Note: Tailwind's `resize` adds a small handle in the bottom right corner automatically */}
        </div>
    );
};

export default ChatWidget;
