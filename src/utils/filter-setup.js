import {
    getFilterData,
    getCachedFilter,
    getFlattenedFilterDataSync,
    getFilterTreeSync,
    getFilterDetailsMapSync
} from './getFilterData.js';

// Trigger initial cache fetch on module import
getFilterData().catch(err => {
    console.warn("Initial filter data load warning:", err);
});

// Proxy getters for legacy compatibility
export const filterDetailsMap = new Proxy({}, {
    get(target, prop) {
        const map = getFilterDetailsMapSync();
        if (prop === 'get') return (key) => map.get(key);
        if (prop === 'has') return (key) => map.has(key);
        if (prop === 'entries') return () => map.entries();
        if (prop === 'keys') return () => map.keys();
        if (prop === 'values') return () => map.values();
        return map[prop];
    }
});

export const filterData = new Proxy({}, {
    get(target, prop) {
        const tree = getFilterTreeSync();
        return tree[prop];
    }
});

export const flattenedFilterData = new Proxy({}, {
    get(target, prop) {
        const flat = getFlattenedFilterDataSync();
        return flat[prop];
    }
});

export {
    getFilterData,
    getCachedFilter,
    getFlattenedFilterDataSync,
    getFilterTreeSync,
    getFilterDetailsMapSync
};