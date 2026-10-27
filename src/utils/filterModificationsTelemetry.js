/**
 * filterModificationsTelemetry.js
 * Tracks filter recommendations, rejections, manual additions, and upload session telemetry.
 * Communicates with the middlelayer microservice at /filter-modifications/session.
 */

const MIDDLELAYER_URL = (import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002").replace(/\/+$/, '');

// In-memory buffer for active editing session
class FilterTelemetryTracker {
    constructor() {
        this.sessionId = this._generateUUID();
        this.initialSuggestions = new Map(); // id -> suggestion item with evidence
        this.rejectedFilters = new Map();    // id -> rejection object
        this.visitedSections = new Set();
        this.recommenderAction = 'SKIPPED';
    }

    _generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    reset() {
        this.sessionId = this._generateUUID();
        this.initialSuggestions.clear();
        this.rejectedFilters.clear();
        this.visitedSections.clear();
        this.recommenderAction = 'SKIPPED';
    }

    recordVisitedSection(sectionKey) {
        if (sectionKey) {
            this.visitedSections.add(String(sectionKey));
        }
    }

    recordSuggestions(suggestions = []) {
        if (!Array.isArray(suggestions)) return;
        suggestions.forEach(item => {
            if (item && item.id) {
                const sId = String(item.id);
                if (!this.initialSuggestions.has(sId)) {
                    this.initialSuggestions.set(sId, item);
                }
            }
        });
        if (this.initialSuggestions.size > 0 && this.recommenderAction === 'SKIPPED') {
            this.recommenderAction = 'INDIVIDUAL_REVIEW';
        }
    }

    recordRejection(item, rejectionType = 'INDIVIDUAL_DISMISS') {
        if (!item || !item.id) return;
        const ev = item.evidence || {};

        // Exclude filter rejections that were suggested as a result of child filters
        if (item.is_derived || ev.sourceField === 'hierarchical_parent' || (ev.snippet && String(ev.snippet).includes('Triggered automatically by child filter'))) {
            return;
        }

        const sId = String(item.id);

        // Bound context snippet strictly to +-100 chars
        const fullSnippet = ev.snippet || item.description || '';
        const keyword = ev.matchedTerm || item.label || '';
        const boundedSnippet = this._boundSnippet(fullSnippet, keyword, 100);

        this.rejectedFilters.set(sId, {
            filter_id: sId,
            filter_label: item.label || sId,
            triggering_phrase: ev.matchedTerm || item.label || '',
            metadata_field: ev.sourceField || 'summary.abstract',
            snippet_context: boundedSnippet,
            rejection_type: rejectionType
        });
    }

    recordDismissAll(items = []) {
        this.recommenderAction = 'DISMISS_ALL';
        items.forEach(item => {
            this.recordRejection(item, 'DISMISS_ALL');
        });
    }

    recordAcceptAll() {
        this.recommenderAction = 'ACCEPT_ALL';
    }

    _boundSnippet(snippet, keyword, windowSize = 100) {
        if (!snippet) return '';
        const str = String(snippet).trim();
        if (!keyword || !str.toLowerCase().includes(keyword.toLowerCase())) {
            return str.length > windowSize * 2 ? str.slice(0, windowSize * 2) + '...' : str;
        }

        const idx = str.toLowerCase().indexOf(keyword.toLowerCase());
        const start = Math.max(0, idx - windowSize);
        const end = Math.min(str.length, idx + keyword.length + windowSize);

        const prefix = start > 0 ? '...' : '';
        const suffix = end < str.length ? '...' : '';
        return `${prefix}${str.slice(start, end).trim()}${suffix}`;
    }

    sendSessionTelemetry({ datasetId = null, datasetName = '', currentFilters = [] }) {
        const middleUrl = MIDDLELAYER_URL;
        const activeIds = new Set(
            (currentFilters || []).map(t => String(typeof t === 'object' ? t.id : t))
        );

        // Calculate manual filters added: in active filters, but NEVER suggested
        const seenManual = new Set();
        const manualFilters = [];
        (currentFilters || []).forEach(f => {
            const fid = String(typeof f === 'object' ? f.id : f);
            if (fid && !this.initialSuggestions.has(fid) && !seenManual.has(fid)) {
                seenManual.add(fid);
                manualFilters.push({
                    id: fid,
                    label: typeof f === 'object' ? f.label : fid,
                    category: typeof f === 'object' ? f.category : ''
                });
            }
        });

        // Calculate accepted count
        let acceptedCount = 0;
        this.initialSuggestions.forEach((item, id) => {
            if (activeIds.has(id)) {
                acceptedCount++;
            }
        });

        const payload = {
            session_id: this.sessionId,
            dataset_id: datasetId,
            dataset_name: datasetName,
            recommender_used: this.initialSuggestions.size > 0,
            recommender_action: this.recommenderAction,
            total_recommended: this.initialSuggestions.size,
            total_accepted: acceptedCount,
            total_rejected: this.rejectedFilters.size,
            sections_visited: Array.from(this.visitedSections),
            manual_filters_added: manualFilters,
            rejected_filters: Array.from(this.rejectedFilters.values())
        };

        const jsonBody = JSON.stringify(payload);
        const endpoint = `${middleUrl}/filter-modifications/session`;

        try {
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                const blob = new Blob([jsonBody], { type: 'application/json' });
                const success = navigator.sendBeacon(endpoint, blob);
                if (!success) {
                    fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonBody,
                        keepalive: true
                    }).catch(() => {});
                }
            } else {
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('Telemetry beacon failed silently:', e);
        }

        // Reset tracker for next lifecycle
        this.reset();
    }
}

export const filterTelemetry = new FilterTelemetryTracker();
export default filterTelemetry;
