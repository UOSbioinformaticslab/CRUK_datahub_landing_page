/**
 * Ultra-robust environment-aware navigation helper for CRUK Datahub.
 * Seamlessly handles:
 *  - Local Vite Dev (/src/*.html)
 *  - Local Static (.html)
 *  - Railway Production Deployment (Clean URLs like /tool?id=3, /tools, /project_meta?pid=1)
 */
export function getPageUrl(pageName, params = {}) {
    if (!pageName) return '#';
    
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
            searchParams.set(key, val);
        }
    });

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    // Strip leading slashes, /src/ prefix, or .html extension if passed
    const cleanPage = String(pageName)
        .replace(/^\/src\//, '')
        .replace(/^\/+/, '')
        .replace(/\.html$/, '');

    if (pathname.includes('/src/')) {
        return `/src/${cleanPage}.html${queryString}`;
    } else if (pathname.endsWith('.html')) {
        return `./${cleanPage}.html${queryString}`;
    } else {
        return `/${cleanPage}${queryString}`;
    }
}

export function getToolUrl(toolId) {
    return getPageUrl('tool', { id: toolId });
}

export function getToolsUrl() {
    return getPageUrl('tools');
}

export function getProjectUrl(pid) {
    return getPageUrl('project_meta', { pid });
}

export function getProjectsUrl() {
    return getPageUrl('projects');
}

export function getDatasetUrl(id) {
    return getPageUrl('meta', { id });
}

export function getDatasetsUrl() {
    return getPageUrl('datasets');
}

export function getPublicationsUrl() {
    return getPageUrl('publications');
}
