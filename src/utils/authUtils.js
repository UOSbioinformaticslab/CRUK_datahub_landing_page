/**
 * Authentication and Token Management Utilities for CRUK Datahub.
 */

export function decodeJwt(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode JWT:", e);
        return null;
    }
}

export function isTokenExpired(token) {
    if (!token) return true;
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return false;
    // payload.exp is in seconds, compare with Date.now() in ms
    return Date.now() >= payload.exp * 1000;
}

export function clearAuthStorage() {
    const authKeys = [
        'token',
        'userName',
        'userId',
        'user_id',
        'teamId',
        'activeTeamId',
        'userTeams',
        'isAdmin'
    ];
    authKeys.forEach(key => localStorage.removeItem(key));
}

let isHandlingAuthExpiry = false;

export function handleAuthExpired(customMessage = "Your authorisation has expired. Please log in again.") {
    if (isHandlingAuthExpiry) return;
    isHandlingAuthExpiry = true;

    // 1. Explicitly log the user out by wiping all stored authentication credentials
    clearAuthStorage();

    // 2. Notify Header and all components across the app to update their state
    window.dispatchEvent(new Event('authChange'));

    // 3. Explicitly inform the user with the required notification message
    alert(customMessage);

    // 4. Prompt the user to log back in by opening the SignIn modal
    window.dispatchEvent(new CustomEvent('openSignInModal', {
        detail: { message: customMessage }
    }));

    // Release lock after a brief window
    setTimeout(() => {
        isHandlingAuthExpiry = false;
    }, 2000);
}

export function setExpiredTokenForTesting() {
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcl9pZCI6MSwiZXhwIjoxNzAwMDAwMDAwfQ.fake_expired_signature";
    localStorage.setItem('token', expiredToken);
    localStorage.setItem('userId', '1');
    localStorage.setItem('user_id', '1');
    localStorage.setItem('userName', 'Test Researcher');
    localStorage.setItem('userEmail', 'test@example.com');
    localStorage.setItem('teamId', '1');
    localStorage.setItem('activeTeamId', '1');
    localStorage.setItem('userTeams', JSON.stringify([{ id: 1, name: 'Test Research Team' }]));
    return expiredToken;
}

if (typeof window !== 'undefined') {
    window.setExpiredTokenForTesting = setExpiredTokenForTesting;

    // Allow setting via URL parameter: e.g. /upload.html?test_expired=true
    if (window.location && window.location.search && 
       (window.location.search.includes('test_expired=true') || window.location.search.includes('expire_token=true'))) {
        setExpiredTokenForTesting();
        try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('test_expired');
            cleanUrl.searchParams.delete('expire_token');
            window.history.replaceState({}, document.title, cleanUrl.toString());
        } catch (e) {
            // Ignore if URL parsing is unsupported
        }
    }
}

