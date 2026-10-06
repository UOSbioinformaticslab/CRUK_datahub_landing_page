import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const EditPublicationModal = ({ publication, isOpen, onClose, onSaved }) => {
    const [journalName, setJournalName] = useState('');
    const [yearOfPublication, setYearOfPublication] = useState('');
    const [paperTitle, setPaperTitle] = useState('');
    const [abstractText, setAbstractText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (publication) {
            setJournalName(publication.journal_name || '');
            setYearOfPublication(publication.year_of_publication || '');
            setPaperTitle(publication.paper_title || '');
            setAbstractText(publication.abstract || '');
            setErrorMsg(null);
        }
    }, [publication, isOpen]);

    if (!isOpen || !publication) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMsg(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setErrorMsg("Authentication token not found. Please log in first.");
            setIsSaving(false);
            return;
        }

        try {
            const payload = {
                journal_name: journalName,
                year_of_publication: yearOfPublication,
                paper_title: paperTitle,
                abstract: abstractText,
            };

            const response = await fetch(`${API_BASE_URL}/publications/${publication.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Failed to update publication' }));
                throw new Error(errData.detail || 'Failed to update publication');
            }

            const updatedPub = await response.json();
            if (onSaved) {
                onSaved(updatedPub);
            }
            onClose();
        } catch (err) {
            console.error("Publication edit failed:", err);
            setErrorMsg(err.message || "Failed to save publication updates.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl p-6 relative my-8">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6">
                    <h2 className="text-xl font-bold text-[#00468C]">Amend Publication Metadata</h2>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                    >
                        ✕
                    </button>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                            Paper Title
                        </label>
                        <input
                            type="text"
                            value={paperTitle}
                            onChange={(e) => setPaperTitle(e.target.value)}
                            required
                            disabled={isSaving}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C] text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                                Journal Name / Repository
                            </label>
                            <input
                                type="text"
                                value={journalName}
                                onChange={(e) => setJournalName(e.target.value)}
                                placeholder="e.g. bioRxiv, Nature Medicine, Cancer Research"
                                required
                                disabled={isSaving}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C] text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                                Year of Publication
                            </label>
                            <input
                                type="text"
                                value={yearOfPublication}
                                onChange={(e) => setYearOfPublication(e.target.value)}
                                placeholder="e.g. 2024"
                                required
                                disabled={isSaving}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C] text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                            Abstract
                        </label>
                        <textarea
                            rows={6}
                            value={abstractText}
                            onChange={(e) => setAbstractText(e.target.value)}
                            disabled={isSaving}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00468C] focus:border-[#00468C] text-sm font-sans"
                            placeholder="Enter or amend publication abstract text..."
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 text-sm font-medium text-white bg-[#00468C] hover:bg-[#002D5C] rounded-md transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
