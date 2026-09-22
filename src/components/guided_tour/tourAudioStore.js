/**
 * IndexedDB storage utility for storing and retrieving voiceover audio blobs per tour step.
 */

const DB_NAME = 'IGTVoiceoverDB';
const DB_VERSION = 1;
const STORE_NAME = 'tour_audio_clips';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveStepAudio = async (stepKey, audioBlob) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(audioBlob, stepKey);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save audio blob to IndexedDB:', err);
    return false;
  }
};

export const getStepAudio = async (stepKey) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(stepKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get audio blob from IndexedDB:', err);
    return null;
  }
};

export const deleteStepAudio = async (stepKey) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(stepKey);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete audio blob from IndexedDB:', err);
    return false;
  }
};

export const getAllStepAudios = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        const keys = req.result;
        const result = {};
        for (const key of keys) {
          const blob = await getStepAudio(key);
          if (blob) {
            result[key] = blob;
          }
        }
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get all audio blobs from IndexedDB:', err);
    return {};
  }
};
