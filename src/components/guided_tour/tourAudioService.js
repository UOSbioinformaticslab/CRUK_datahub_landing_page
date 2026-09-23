/**
 * API Service for interacting with middle service (VITE_MIDDLELAYER_URL)
 * for Tour Voiceover Storage & Management.
 */

export const TARGET_ENVS = {
  dev: {
    key: 'dev',
    label: 'Dev Railway',
    url: import.meta.env.VITE_MIDDLELAYER_DEV_URL || 'https://cruk-datahub-middlelayer-dev.up.railway.app'
  },
  staging: {
    key: 'staging',
    label: 'Staging Railway',
    url: import.meta.env.VITE_MIDDLELAYER_STAGING_URL || 'https://cruk-datahub-middlelayer-staging.up.railway.app'
  }
};

export const getSyncTargetEnv = () => {
  const env = localStorage.getItem('syncTargetEnv');
  return env === 'staging' ? 'staging' : 'dev';
};

export const setSyncTargetEnv = (envKey) => {
  if (TARGET_ENVS[envKey]) {
    localStorage.setItem('syncTargetEnv', envKey);
  }
};

export const getSyncTargetUrl = (overrideEnvKey) => {
  const envKey = overrideEnvKey || getSyncTargetEnv();
  const target = TARGET_ENVS[envKey] || TARGET_ENVS.dev;
  return target.url.replace(/\/+$/, '');
};

const getMiddlelayerUrl = () => {
  let url = import.meta.env.VITE_MIDDLELAYER_URL || getSyncTargetUrl();
  return url.replace(/\/+$/, '');
};

const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
};

/**
 * Fetch map of voiceovers for a tour from middle service.
 * Prepends active middlelayer URL to relative audio paths so URLs resolve cleanly
 * both locally and on Railway.
 */
export const fetchTourVoiceovers = async (tourId, overrideUrl) => {
  try {
    const baseUrl = overrideUrl ? overrideUrl.replace(/\/+$/, '') : getMiddlelayerUrl();
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
export const uploadStepVoiceoverAPI = async (tourId, stepIndex, audioBlob, overrideUrl) => {
  try {
    const baseUrl = overrideUrl ? overrideUrl.replace(/\/+$/, '') : getMiddlelayerUrl();
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
export const deleteStepVoiceoverAPI = async (tourId, stepIndex, overrideUrl) => {
  try {
    const baseUrl = overrideUrl ? overrideUrl.replace(/\/+$/, '') : getMiddlelayerUrl();
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

import { getAllStepAudios } from './tourAudioStore.js';

/**
 * Sync all voiceovers stored in IndexedDB to the specified Railway middle service target (Dev or Staging).
 */
export const syncAllLocalVoiceoversToServer = async (overrideEnvKey) => {
  try {
    const envKey = overrideEnvKey || getSyncTargetEnv();
    const targetUrl = getSyncTargetUrl(envKey);
    const targetInfo = TARGET_ENVS[envKey] || TARGET_ENVS.dev;

    const audios = await getAllStepAudios();
    const keys = Object.keys(audios);
    if (keys.length === 0) {
      return { success: false, message: 'No local IndexedDB voiceovers found.' };
    }

    let successCount = 0;
    let failCount = 0;

    for (const key of keys) {
      const match = key.match(/^(.+)_step_(\d+)$/);
      if (match) {
        const tourId = match[1];
        const stepIndex = parseInt(match[2], 10);
        const blob = audios[key];
        const res = await uploadStepVoiceoverAPI(tourId, stepIndex, blob, targetUrl);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    return {
      success: true,
      count: successCount,
      failed: failCount,
      message: `Synced ${successCount} voiceover(s) to ${targetInfo.label}${failCount > 0 ? ` (${failCount} failed)` : ''}.`
    };
  } catch (err) {
    console.error('Failed to sync local voiceovers:', err);
    return { success: false, message: 'Sync failed: ' + err.message };
  }
};

