/**
 * filterRecommenderUtils.js
 * Helper utilities for automated dataset filter recommendations and evidence curation.
 */

/**
 * Sanitizes a filter recommendation item, stripping any transient evidence
 * so that only standard schema attributes enter formData.datasetFilters.
 * This guarantees 100% database schema purity.
 */
export const cleanFilterTag = (item) => {
    if (!item) return null;
    return {
        id: item.id,
        label: item.label,
        category: item.category || '',
        primaryGroup: item.primaryGroup || 'data-type',
        description: item.description || ''
    };
};

/**
 * Deduplicates an incoming array of recommendations against currently active tags
 * and previously accepted tags.
 */
export const deduplicateFilters = (activeFilters = [], incomingSuggestions = [], acceptedIds = []) => {
    const activeIds = new Set(
        (activeFilters || []).map(tag => String(typeof tag === 'object' ? tag.id : tag))
    );
    (acceptedIds || []).forEach(id => activeIds.add(String(id)));
    return (incomingSuggestions || []).filter(item => item && !activeIds.has(String(item.id)));
};

/**
 * Executes the backend recommendation scan against /datasets/recommend-filters.
 */
export const fetchFilterRecommendations = async ({ formData = {}, datasetId = null, apiBaseUrl = '', token = null }) => {
    const cleanBaseUrl = (apiBaseUrl || '').replace(/\/+$/, '');
    const resolvedDatasetId = datasetId || formData.datasetid || formData.id;

    const response = await fetch(`${cleanBaseUrl}/datasets/recommend-filters`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            metadata: formData,
            dataset_id: resolvedDatasetId
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.detail || `Server returned ${response.status}`);
    }

    const data = await response.json();
    return {
        suggestions: data.suggestions || [],
        silentDerived: data.silentDerived || []
    };
};

/**
 * Returns Tailwind CSS classes for category badges based on category/group name.
 */
export const getCategoryBadgeClass = (category = '', primaryGroup = '') => {
    const cat = (category || primaryGroup || '').toLowerCase();
    if (cat.includes('cancer') || cat.includes('topography') || cat.includes('histology')) {
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (cat.includes('data')) {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (cat.includes('access')) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-violet-50 text-violet-700 border-violet-200';
};
