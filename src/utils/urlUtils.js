/**
 * Navigation helper for CRUK Datahub.
 * Generates unified clean /src/page_name?query URLs matching working dataset & project routes.
 */
export function getPageUrl(pageName, params = {}) {
    if (!pageName) return '#';
    
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
            searchParams.set(key, val);
        }
    });

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    // Strip any leading slashes, /src/ prefix, or .html extension if passed
    const cleanPage = String(pageName)
        .replace(/^\/src\//, '')
        .replace(/^\/+/, '')
        .replace(/\.html$/, '');

    return `/src/${cleanPage}${queryString}`;
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
