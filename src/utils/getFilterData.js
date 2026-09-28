const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, '');

let filterDataMemoryCache = null;       // Flat dictionary { [id]: filterObj }
let filterTreeMemoryCache = null;       // Hierarchical tree { [id]: { ..., children: {} } }
let filterDetailsMapMemoryCache = null; // Map(id -> filterObj)

/**
 * Builds a hierarchical filter tree from a flat filter dictionary.
 * @param {Object} flatDict 
 * @returns {Object} Root level items with nested 'children'
 */
export function buildFilterTree(flatDict) {
    if (!flatDict || typeof flatDict !== 'object') return {};

    const cloned = {};
    for (const [id, item] of Object.entries(flatDict)) {
        cloned[id] = {
            ...item,
            children: {}
        };
    }

    const tree = {};
    for (const [id, item] of Object.entries(cloned)) {
        const parentId = item.parentId;
        if (!parentId || !cloned[parentId]) {
            tree[id] = item;
        } else {
            cloned[parentId].children[id] = item;
        }
    }
    return tree;
}

/**
 * Populates memory and sessionStorage caches.
 */
function setCaches(flatData) {
    filterDataMemoryCache = flatData || {};
    filterTreeMemoryCache = buildFilterTree(filterDataMemoryCache);
    filterDetailsMapMemoryCache = new Map(Object.entries(filterDataMemoryCache));
}

/**
 * Asynchronously retrieves the taxonomy filters dictionary from the database (via GET /datasets/filters)
 * and caches flat, tree, and map data for instant 0ms access across components.
 *
 * @returns {Promise<{ flattenedData: Object, treeData: Object, filterDetailsMap: Map }>}
 */
export async function getFilterData() {
    if (filterDataMemoryCache && filterTreeMemoryCache && filterDetailsMapMemoryCache) {
        return {
            flattenedData: filterDataMemoryCache,
            treeData: filterTreeMemoryCache,
            filterDetailsMap: filterDetailsMapMemoryCache
        };
    }

    // Try reading from sessionStorage
    try {
        const stored = sessionStorage.getItem('cruk_filter_data_cache');
        if (stored) {
            const parsed = JSON.parse(stored);
            setCaches(parsed);
            return {
                flattenedData: filterDataMemoryCache,
                treeData: filterTreeMemoryCache,
                filterDetailsMap: filterDetailsMapMemoryCache
            };
        }
    } catch (e) {
        console.warn("sessionStorage read error:", e);
    }

    // Network fetch from backend database
    try {
        const response = await fetch(`${API_BASE_URL}/datasets/filters`);
        if (response.ok) {
            const data = await response.json();
            setCaches(data);
            try {
                sessionStorage.setItem('cruk_filter_data_cache', JSON.stringify(data));
            } catch (e) {
                console.warn("sessionStorage write error:", e);
            }
            return {
                flattenedData: filterDataMemoryCache,
                treeData: filterTreeMemoryCache,
                filterDetailsMap: filterDetailsMapMemoryCache
            };
        }
    } catch (err) {
        console.error("Failed to fetch filters from backend database:", err);
    }

    return {
        flattenedData: {},
        treeData: {},
        filterDetailsMap: new Map()
    };
}

/**
 * Synchronously retrieves a filter item by ID if memory cache is populated.
 * @param {string} filterId 
 * @returns {Object|null}
 */
export function getCachedFilter(filterId) {
    if (filterDataMemoryCache && filterId) {
        return filterDataMemoryCache[filterId] || null;
    }
    return null;
}

/**
 * Synchronously retrieves the flat filter dictionary.
 */
export function getFlattenedFilterDataSync() {
    return filterDataMemoryCache || {};
}

/**
 * Synchronously retrieves the filter tree.
 */
export function getFilterTreeSync() {
    return filterTreeMemoryCache || {};
}

/**
 * Synchronously retrieves the filterDetailsMap.
 */
export function getFilterDetailsMapSync() {
    return filterDetailsMapMemoryCache || new Map();
}
