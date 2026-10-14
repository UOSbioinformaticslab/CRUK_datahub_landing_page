import { injectGlobalToast } from '../components/ToastContainer.jsx';
import { handleAuthExpired } from './authUtils.js';

// Ensure the toast container is in the DOM
injectGlobalToast();

const MIDDLELAYER_URL = import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002";
const originalFetch = window.fetch;

const logToMiddlelayer = async (correlationId, message) => {
    try {
        await originalFetch(`${MIDDLELAYER_URL}/logs/error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_name: 'frontend',
                correlation_id: correlationId,
                message: message,
                stack_trace: `URL: ${window.location.href}\nUser Agent: ${navigator.userAgent}`
            })
        });
    } catch (e) {
        console.error("Failed to reach middlelayer for error logging:", e);
    }
};

window.fetch = async (...args) => {
    const targetUrl = args[0] instanceof Request ? args[0].url : args[0];
    
    // Don't intercept calls TO the middlelayer's error endpoint, otherwise we might loop!
    if (typeof targetUrl === 'string' && targetUrl.includes('/logs/error')) {
        return originalFetch(...args);
    }

    try {
        const response = await originalFetch(...args);
        
        // Intercept 401 Unauthorized errors on authenticated calls (excluding login /token)
        if (response.status === 401) {
            const isLoginRequest = typeof targetUrl === 'string' && (targetUrl.endsWith('/token') || targetUrl.includes('/token?'));
            if (!isLoginRequest) {
                handleAuthExpired();
            }
        }
        
        // Intercept 5xx errors from our backends or API gateways
        if (response.status >= 500) {
            try {
                // Try to parse the correlation_id if it's a JSON response from our backend
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();
                
                if (data && data.correlation_id) {
                    // Backend already logged this, just show the toast
                    window.dispatchEvent(new CustomEvent('show-global-toast', { 
                        detail: { correlation_id: data.correlation_id } 
                    }));
                } else {
                    // Fallback for non-JSON 5xx (e.g., Railway 502 Bad Gateway HTML pages)
                    const corrId = `gateway-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10)}`;
                    window.dispatchEvent(new CustomEvent('show-global-toast', { 
                        detail: { correlation_id: corrId } 
                    }));
                    logToMiddlelayer(corrId, `HTTP ${response.status} Error on fetch to ${targetUrl}`);
                }
            } catch (e) {
                // If it wasn't JSON (e.g. 502 Bad Gateway HTML)
                const corrId = `gateway-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10)}`;
                window.dispatchEvent(new CustomEvent('show-global-toast', { 
                    detail: { correlation_id: corrId } 
                }));
                logToMiddlelayer(corrId, `Non-JSON HTTP ${response.status} Error on fetch to ${targetUrl}`);
            }
        }
        
        return response;
    } catch (error) {
        // Catch actual network failures (e.g. CORS, totally down backend, offline)
        const corrId = `network-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10)}`;
        window.dispatchEvent(new CustomEvent('show-global-toast', { 
            detail: { correlation_id: corrId } 
        }));
        logToMiddlelayer(corrId, `Network Failure / Connection Refused when fetching ${targetUrl}`);
        throw error;
    }
};
