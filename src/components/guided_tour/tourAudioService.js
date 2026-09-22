/**
 * API Service for interacting with middle service (VITE_MIDDLELAYER_URL)
 * for Tour Voiceover Storage & Management.
 */

const getMiddlelayerUrl = () => {
  let url = import.meta.env.VITE_MIDDLELAYER_URL || 'http://localhost:8001';
  return url.replace(/\/+$/, '');
};

const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
};

/**
 * Fetch map of voiceovers for a tour from middle service.
 * Prepends VITE_MIDDLELAYER_URL to relative audio paths so URLs resolve cleanly
 * both locally and on Railway.
 */
export const fetchTourVoiceovers = async (tourId) => {
  try {
    const baseUrl = getMiddlelayerUrl();
    const res = await fetch(`${baseUrl}/api/v1/tours/${tourId}/voiceovers`);
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    if (data && data.voiceovers) {
      Object.keys(data.voiceovers).forEach((stepIdx) => {
        const relativeOrFull = data.voiceovers[stepIdx];
        if (relativeOrFull.startsWith('http://') || relativeOrFull.startsWith('https://')) {
          map[stepIdx] = relativeOrFull;
        } else {
          map[stepIdx] = `${baseUrl}${relativeOrFull}`;
        }
      });
    }
    return map;
  } catch (err) {
    console.warn('Failed to fetch tour voiceovers from middle service:', err);
    return {};
  }
};

/**
 * Upload step voiceover audio file to middle service (Admin Only).
 */
export const uploadStepVoiceoverAPI = async (tourId, stepIndex, audioBlob) => {
  try {
    const baseUrl = getMiddlelayerUrl();
    const token = getAuthToken();

    const formData = new FormData();
    formData.append('file', audioBlob, `${tourId}_step_${stepIndex}.webm`);

    const res = await fetch(`${baseUrl}/api/v1/tours/${tourId}/steps/${stepIndex}/voiceover`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Upload failed');
    }

    const data = await res.json();
    const relativeOrFull = data.audio_url;
    const fullUrl = relativeOrFull.startsWith('http') ? relativeOrFull : `${baseUrl}${relativeOrFull}`;
    return { success: true, audioUrl: fullUrl };
  } catch (err) {
    console.error('Failed to upload step voiceover:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Delete step voiceover audio file from middle service (Admin Only).
 */
export const deleteStepVoiceoverAPI = async (tourId, stepIndex) => {
  try {
    const baseUrl = getMiddlelayerUrl();
    const token = getAuthToken();

    const res = await fetch(`${baseUrl}/api/v1/tours/${tourId}/steps/${stepIndex}/voiceover`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Delete failed');
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to delete step voiceover:', err);
    return { success: false, error: err.message };
  }
};
