import { useState, useRef, useCallback } from 'react';

/**
 * Custom React hook for capturing microphone audio via Web MediaRecorder API
 * with live AudioContext volume level metering.
 */
export const useAudioRecorder = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 100
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }
    setIsRecording(false);
    setIsStarting(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setVolumeLevel(0);
    setIsStarting(true);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone recording is not supported in this browser environment or requires HTTPS/localhost.');
      setIsStarting(false);
      return;
    }

    try {
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone stream acquired');

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      // Set up AudioContext volume analyzer for live visual feedback
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volumePct = Math.min(100, Math.round((average / 80) * 100));
            setVolumeLevel(volumePct);
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (e) {
        console.warn('AudioContext visualization setup failed:', e);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        setVolumeLevel(0);

        const type = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });

        if (blob.size > 500) {
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsStarting(false);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setIsStarting(false);
      setIsRecording(false);
      setError(`Microphone error: ${err.message || 'Access denied. Please check browser permissions.'}`);
    }
  }, []);

  const resetRecorder = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setVolumeLevel(0);
    setIsStarting(false);
    setError(null);
  }, [stopRecording]);

  return {
    isStarting,
    isRecording,
    recordingTime,
    volumeLevel,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecorder
  };
};
