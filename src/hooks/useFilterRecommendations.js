import { useState, useCallback, useEffect, useRef } from 'react';
import {
    cleanFilterTag,
    deduplicateFilters,
    fetchFilterRecommendations
} from '../utils/filterRecommenderUtils';

/**
 * useFilterRecommendations
 * Encapsulates all state, API interactions, tag deduplication, evidence stripping,
 * and status messaging for automated datasetFilter recommendations.
 *
 * Keeps SchemaPage.jsx lightweight, modular, and decoupled.
 */
export const useFilterRecommendations = ({ formData, onFormChange, apiBaseUrl }) => {
    const [suggestedFilters, setSuggestedFilters] = useState([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [suggestionNotice, setSuggestionNotice] = useState(null);

    // Persistent registry of all filter IDs accepted in this editing session
    const acceptedFilterIdsRef = useRef(new Set());
    // Silent derived filters (hierarchical parents and cross-references) to create without cards
    const silentDerivedRef = useRef([]);

    // Helper: recursively resolves silent derived filters whose prerequisites are satisfied in active IDs
    const resolveSatisfiedSilent = (currentIds, availableSilent = []) => {
        const newlySatisfied = [];
        const remainingSilent = [...availableSilent];
        let progress = true;

        while (progress) {
            progress = false;
            for (let i = 0; i < remainingSilent.length; i++) {
                const silentItem = remainingSilent[i];
                const sId = String(silentItem.id);
                if (currentIds.has(sId)) {
                    remainingSilent.splice(i, 1);
                    i--;
                    continue;
                }
                const derivedFrom = silentItem.evidence?.derivedFrom || [];
                // Satisfied if all prerequisite IDs are already active/accepted
                const isSatisfied = derivedFrom.length > 0 && derivedFrom.every(depId => currentIds.has(String(depId)));
                if (isSatisfied) {
                    currentIds.add(sId);
                    newlySatisfied.push(silentItem);
                    remainingSilent.splice(i, 1);
                    i--;
                    progress = true;
                }
            }
        }
        return { newlySatisfied, remainingSilent };
    };

    // Auto-synchronize: whenever active tags change, synchronize accepted registry
    // so that currently active tags are not suggested, but any deleted tags can be re-suggested!
    useEffect(() => {
        const activeIds = new Set(
            (formData.datasetFilters || []).map(tag => String(typeof tag === 'object' ? tag.id : tag))
        );
        acceptedFilterIdsRef.current = new Set(activeIds);

        setSuggestedFilters(prev => {
            const clean = prev.filter(s => s && !activeIds.has(String(s.id)));
            return clean.length === prev.length ? prev : clean;
        });
    }, [formData.datasetFilters]);

    // Requirement: Clear the 'Found ... recommended filter tags' strapline
    // automatically whenever all recommended tags have been accepted or rejected.
    useEffect(() => {
        if (suggestedFilters.length === 0 && suggestionNotice?.type === 'success') {
            setSuggestionNotice(null);
        }
    }, [suggestedFilters.length, suggestionNotice?.type]);

    /**
     * Accepts a single proposed recommendation.
     * Strips transient evidence, registers ID in accepted registry, and appends to formData.datasetFilters.
     * Also silently appends any derived filters (hierarchical parents, cross-refs) whose prerequisites are now met.
     */
    const handleAcceptSuggestion = useCallback((idToAccept) => {
        const strId = String(idToAccept);
        acceptedFilterIdsRef.current.add(strId);

        setSuggestedFilters(prev => {
            const item = prev.find(s => String(s.id) === strId);
            if (item && onFormChange) {
                const cleanTag = cleanFilterTag(item);
                if (cleanTag) {
                    const currentTags = formData.datasetFilters || [];
                    const activeIds = new Set(currentTags.map(t => String(typeof t === 'object' ? t.id : t)));
                    activeIds.add(strId);

                    // Silently resolve satisfied derived filters
                    const { newlySatisfied, remainingSilent } = resolveSatisfiedSilent(activeIds, silentDerivedRef.current);
                    silentDerivedRef.current = remainingSilent;
                    newlySatisfied.forEach(s => acceptedFilterIdsRef.current.add(String(s.id)));

                    const tagsToAdd = [cleanTag, ...newlySatisfied.map(cleanFilterTag)].filter(Boolean);
                    const existingTagIds = new Set(currentTags.map(t => String(typeof t === 'object' ? t.id : t)));
                    const tagsToAppend = tagsToAdd.filter(t => !existingTagIds.has(String(t.id)));

                    if (tagsToAppend.length > 0) {
                        onFormChange(['datasetFilters'], [...currentTags, ...tagsToAppend]);
                    }
                }
            }

            const remaining = prev.filter(s => String(s.id) !== strId);
            if (remaining.length === 0) {
                setSuggestionNotice(null);
            }
            return remaining;
        });
    }, [formData.datasetFilters, onFormChange]);

    /**
     * Dismisses a single recommendation from the view.
     * Cascading dismissal: removes any silent derived filters that depended solely on this filter.
     */
    const handleDismissSuggestion = useCallback((idToDismiss) => {
        const strId = String(idToDismiss);
        // Purge silent derived filters that depend on the dismissed tag
        silentDerivedRef.current = (silentDerivedRef.current || []).filter(item => {
            const derivedFrom = item.evidence?.derivedFrom || [];
            return !derivedFrom.map(String).includes(strId);
        });

        setSuggestedFilters(prev => {
            const remaining = prev.filter(s => String(s.id) !== strId);
            if (remaining.length === 0) {
                setSuggestionNotice(null);
            }
            return remaining;
        });
    }, []);

    /**
     * Accepts all active recommendations in bulk.
     * Strips transient evidence, registers IDs, and adds direct recommendations.
     * Also silently appends all satisfied derived filters (parents & cross-refs).
     */
    const handleAcceptAllSuggestions = useCallback(() => {
        if (!suggestedFilters || suggestedFilters.length === 0) return;

        suggestedFilters.forEach(s => acceptedFilterIdsRef.current.add(String(s.id)));

        if (onFormChange) {
            const currentTags = formData.datasetFilters || [];
            const activeIds = new Set(currentTags.map(t => String(typeof t === 'object' ? t.id : t)));
            suggestedFilters.forEach(s => activeIds.add(String(s.id)));

            // Silently resolve all satisfied derived filters
            const { newlySatisfied, remainingSilent } = resolveSatisfiedSilent(activeIds, silentDerivedRef.current);
            silentDerivedRef.current = remainingSilent;
            newlySatisfied.forEach(s => acceptedFilterIdsRef.current.add(String(s.id)));

            const directClean = suggestedFilters.map(cleanFilterTag).filter(Boolean);
            const silentClean = newlySatisfied.map(cleanFilterTag).filter(Boolean);

            const existingTagIds = new Set(currentTags.map(t => String(typeof t === 'object' ? t.id : t)));
            const allNew = [...directClean, ...silentClean].filter(t => !existingTagIds.has(String(t.id)));

            if (allNew.length > 0) {
                onFormChange(['datasetFilters'], [...currentTags, ...allNew]);
            }
        }

        setSuggestedFilters([]);
        setSuggestionNotice(null);
    }, [suggestedFilters, formData.datasetFilters, onFormChange]);

    /**
     * Dismisses all proposed recommendations in bulk.
     */
    const handleDismissAllSuggestions = useCallback(() => {
        silentDerivedRef.current = [];
        setSuggestedFilters([]);
        setSuggestionNotice(null);
    }, []);

    /**
     * Adds externally generated suggestions (e.g. from UploadTopBar draft scan),
     * strictly deduplicating against active tags and previously accepted IDs.
     */
    const addSuggestedFilters = useCallback((newSuggestions = []) => {
        const activeAndAcceptedIds = new Set([
            ...(formData.datasetFilters || []).map(t => String(typeof t === 'object' ? t.id : t)),
            ...Array.from(acceptedFilterIdsRef.current)
        ]);

        setSuggestedFilters(prev => {
            const existingSuggIds = new Set(prev.map(p => String(p.id)));
            const novel = (newSuggestions || []).filter(f => 
                f && 
                !activeAndAcceptedIds.has(String(f.id)) && 
                !existingSuggIds.has(String(f.id))
            );
            return [...prev, ...novel];
        });
    }, [formData.datasetFilters]);

    /**
     * Calls the recommendation API endpoint to scan metadata and extract suggestions.
     * Guaranteed never to re-offer tags that are active or were already accepted.
     */
    const handleGenerateSuggestions = useCallback(async () => {
        setIsGeneratingSuggestions(true);
        setSuggestionNotice(null);

        try {
            const token = localStorage.getItem('token');
            const datasetId = formData.datasetid || formData.id;
            const incoming = await fetchFilterRecommendations({
                formData,
                datasetId,
                apiBaseUrl,
                token
            });

            const directList = incoming.suggestions || (Array.isArray(incoming) ? incoming : []);
            const silentList = incoming.silentDerived || [];
            silentDerivedRef.current = silentList;

            // Deduplicate direct suggestions against already active tags AND accepted tags
            const filteredNew = deduplicateFilters(
                formData.datasetFilters,
                directList,
                Array.from(acceptedFilterIdsRef.current)
            );

            if (filteredNew.length === 0) {
                const hasText = Boolean(
                    formData?.summary?.title ||
                    formData?.summary?.abstract ||
                    formData?.documentation?.description
                );
                setSuggestionNotice({
                    type: 'info',
                    message: hasText
                        ? 'No additional new filter suggestions found based on current metadata.'
                        : 'No study text found yet. Please enter a title, abstract, or documentation before auto-generating suggestions.'
                });
            } else {
                setSuggestedFilters(prev => {
                    const existingSuggIds = new Set(prev.map(p => String(p.id)));
                    const novel = filteredNew.filter(f => 
                        !existingSuggIds.has(String(f.id)) && 
                        !acceptedFilterIdsRef.current.has(String(f.id))
                    );
                    return [...prev, ...novel];
                });
                setSuggestionNotice({
                    type: 'success',
                    message: `Found ${filteredNew.length} recommended filter tags.`
                });
            }
        } catch (err) {
            console.error("Filter recommendation error:", err);
            setSuggestionNotice({
                type: 'error',
                message: `Recommendation notice: ${err.message}`
            });
        } finally {
            setIsGeneratingSuggestions(false);
        }
    }, [formData, apiBaseUrl]);

    /**
     * Resets recommendation state (e.g. when switching datasets).
     */
    const clearSuggestedFilters = useCallback(() => {
        acceptedFilterIdsRef.current.clear();
        silentDerivedRef.current = [];
        setSuggestedFilters([]);
        setSuggestionNotice(null);
    }, []);

    return {
        suggestedFilters,
        isGeneratingSuggestions,
        suggestionNotice,
        setSuggestionNotice,
        handleGenerateSuggestions,
        handleAcceptSuggestion,
        handleDismissSuggestion,
        handleAcceptAllSuggestions,
        handleDismissAllSuggestions,
        addSuggestedFilters,
        clearSuggestedFilters
    };
};

export default useFilterRecommendations;
