import React, { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder.js';
import { saveStepAudio, getStepAudio, deleteStepAudio, getAllStepAudios } from './tourAudioStore.js';
import {
  fetchTourVoiceovers,
  uploadStepVoiceoverAPI,
  deleteStepVoiceoverAPI,
  syncAllLocalVoiceoversToServer,
  TARGET_ENVS,
  getSyncTargetEnv,
  setSyncTargetEnv,
  getSyncTargetUrl
} from './tourAudioService.js';

export const TourOverlay = ({
  step,
  currentStepIndex,
  displayStepNumber,
  totalSteps,
  tourId = 'tour',
  onNext,
  onPrev,
  onClose
}) => {
  const [targetRect, setTargetRect] = useState(null);

  // Voiceover & Auth States
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isRecordMode, setIsRecordMode] = useState(false);
  const [stepAudioUrl, setStepAudioUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTargetEnvState, setSyncTargetEnvState] = useState(getSyncTargetEnv());

  const audioRef = useRef(null);
  const {
    isStarting,
    isRecording,
    recordingTime,
    volumeLevel,
    audioBlob,
    audioUrl,
    error: recError,
    startRecording,
    stopRecording,
    resetRecorder
  } = useAudioRecorder();

  const stepKey = `${tourId}_step_${currentStepIndex}`;

  // Verify Admin Status from User Credentials / Token
  useEffect(() => {
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    const storedEmail = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';
    const adminEmails = ['test@test.com', 'skw24@sussex.ac.uk', 'b.hall@ucl.ac.uk'];
    const isAdminUser = storedIsAdmin || adminEmails.includes(storedEmail);
    setIsUserAdmin(isAdminUser);
  }, []);

  // Load existing audio from VITE_MIDDLELAYER_URL and IndexedDB
  useEffect(() => {
    let isMounted = true;
    setSaveStatus(null);
    setIsPlayingAudio(false);

    // Clean up previous blob URL
    setStepAudioUrl((prevUrl) => {
      if (prevUrl && prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });

    // 1. Fetch server voiceover map from middle service (VITE_MIDDLELAYER_URL)
    fetchTourVoiceovers(tourId).then((serverVoiceovers) => {
      const serverUrl = serverVoiceovers[String(currentStepIndex)];
      if (isMounted && serverUrl) {
        setStepAudioUrl(serverUrl);
      } else {
        // 2. Fall back to local browser IndexedDB
        getStepAudio(stepKey).then((blob) => {
          if (isMounted && blob) {
            if (blob.size > 500) {
              const url = URL.createObjectURL(blob);
              setStepAudioUrl(url);
            } else {
              deleteStepAudio(stepKey);
            }
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [stepKey, tourId, currentStepIndex]);

  // Handle newly recorded audio blob (Admin Only)
  useEffect(() => {
    if (audioBlob && audioBlob.size > 500 && isUserAdmin) {
      saveStepAudio(stepKey, audioBlob);

      uploadStepVoiceoverAPI(tourId, currentStepIndex, audioBlob).then((res) => {
        if (res.success) {
          setSaveStatus('Voiceover saved to server!');
          setStepAudioUrl(res.audioUrl);
        } else {
          setSaveStatus('Voiceover saved locally (Offline)');
          setStepAudioUrl(audioUrl);
        }
        setTimeout(() => setSaveStatus(null), 3500);
      });
    }
  }, [audioBlob, audioUrl, stepKey, tourId, currentStepIndex, isUserAdmin]);

  // Auto-play voiceover snippet when advancing steps (if available and not in recording mode)
  useEffect(() => {
    if (stepAudioUrl && !isRecordMode && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(() => {
        setIsPlayingAudio(false);
      });
    }
  }, [stepAudioUrl, isRecordMode]);

  useEffect(() => {
    if (!step || !step.target) return;

    const updateTargetRect = () => {
      let el = document.querySelector(step.target);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        setTargetRect({
          top: window.innerHeight / 3,
          left: window.innerWidth / 2 - 160,
          width: 320,
          height: 90
        });
      }
    };

    updateTargetRect();
    const timer1 = setTimeout(updateTargetRect, 100);
    const timer2 = setTimeout(updateTargetRect, 350);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [step, currentStepIndex]);

  if (!step || !targetRect) return null;

  const bubbleWidth = 380;
  const bubbleHeight = isRecordMode ? 360 : 250;

  let placeAbove = targetRect.top + targetRect.height + bubbleHeight + 20 > window.innerHeight;
  let bubbleTop = placeAbove
    ? Math.max(16, targetRect.top - bubbleHeight - 16)
    : Math.max(16, Math.min(window.innerHeight - bubbleHeight - 16, targetRect.top + targetRect.height + 16));

  let bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;

  if (bubbleLeft < 16) bubbleLeft = 16;
  if (bubbleLeft + bubbleWidth > window.innerWidth - 16) {
    bubbleLeft = window.innerWidth - bubbleWidth - 16;
  }

  const handleBackdropClick = (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;
    const isInsideTarget =
      clickX >= targetRect.left - 6 &&
      clickX <= targetRect.left + targetRect.width + 6 &&
      clickY >= targetRect.top - 6 &&
      clickY <= targetRect.top + targetRect.height + 6;

    if (isInsideTarget) {
      let el = document.querySelector(step.target);
      if (el) el.click();
      onNext();
    }
  };

  const handleStepNext = (e) => {
    if (e) e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
    setStepAudioUrl(null);
    resetRecorder();
    onNext();
  };

  const handleStepPrev = (e) => {
    if (e) e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
    setStepAudioUrl(null);
    resetRecorder();
    onPrev();
  };

  const handlePlayVoiceover = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleDeleteAudio = async () => {
    await deleteStepAudio(stepKey);
    if (isUserAdmin) {
      await deleteStepVoiceoverAPI(tourId, currentStepIndex);
    }
    setStepAudioUrl(null);
    resetRecorder();
    setSaveStatus('Voiceover deleted');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Hidden HTML5 Audio element for playback */}
      {stepAudioUrl && (
        <audio
          ref={audioRef}
          src={stepAudioUrl}
          preload="metadata"
          onEnded={() => setIsPlayingAudio(false)}
          onPause={() => setIsPlayingAudio(false)}
          onPlay={() => setIsPlayingAudio(true)}
          onError={() => {
            setIsPlayingAudio(false);
            setStepAudioUrl(null);
          }}
        />
      )}

      {/* Darkened SVG Mask Backdrop */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={handleBackdropClick}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - 6}
              y={targetRect.top - 6}
              width={targetRect.width + 12}
              height={targetRect.height + 12}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Glowing Spotlight Ring around Target */}
        <rect
          x={targetRect.left - 6}
          y={targetRect.top - 6}
          width={targetRect.width + 12}
          height={targetRect.height + 12}
          rx="8"
          fill="none"
          stroke="#D10A6F"
          strokeWidth="3"
          className="animate-pulse"
        />
      </svg>

      {/* CRUK Branded Thought Bubble Popover */}
      <div
        className="absolute pointer-events-auto bg-white rounded-xl shadow-2xl p-5 border-2 border-[var(--cruk-pink)] text-gray-800 transition-all duration-200 z-[10000] max-h-[calc(100vh-32px)] overflow-y-auto flex flex-col justify-between"
        style={{
          top: `${bubbleTop}px`,
          left: `${bubbleLeft}px`,
          width: `${bubbleWidth}px`
        }}
      >
        {/* Bubble Pointer Arrow */}
        {placeAbove ? (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-[var(--cruk-pink)]" />
        ) : (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-[var(--cruk-pink)]" />
        )}

        {/* Header Badge & Tools */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--cruk-pink)] bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
            Step {displayStepNumber ?? (currentStepIndex + 1)} of {totalSteps}
          </span>

          <div className="flex items-center space-x-2">
            {/* Studio Mode Toggle (Admin Only) */}
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => setIsRecordMode(!isRecordMode)}
                className={`text-xs px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
                  isRecordMode
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Toggle Voiceover Recording Studio (Admin Only)"
              >
                🎙️ {isRecordMode ? 'Studio ON' : 'Voiceover Studio'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold px-1.5 focus:outline-none"
              aria-label="Close Tour"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Step Title & Content */}
        <h4 className="text-base font-bold text-[var(--cruk-darkblue)] mb-1.5">
          {step.title}
        </h4>
        <p className="text-xs leading-relaxed text-gray-600 mb-3">
          {step.content}
        </p>

        {/* Voiceover Recording & Playback Studio Panel */}
        <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-inner">
          {isRecordMode ? (
            <div className="flex flex-col space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  🎙️ Voiceover Studio
                </span>

                {isStarting ? (
                  <span className="text-xs font-bold text-amber-600 animate-pulse bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ⏳ Requesting Mic Permission...
                  </span>
                ) : isRecording ? (
                  <span className="text-xs font-extrabold text-red-600 animate-pulse bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
                    RECORDING {formatTime(recordingTime)}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Ready to record</span>
                )}
              </div>

              {/* Target Environment Switcher (Dev vs Staging Railway) */}
              {!isRecording && (
                <div className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                    🎯 Sync Target:
                  </span>
                  <select
                    value={syncTargetEnvState}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSyncTargetEnvState(val);
                      setSyncTargetEnv(val);
                    }}
                    className="text-[11px] bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="dev">🌐 Dev Railway (dev.up.railway.app)</option>
                    <option value="staging">🌐 Staging Railway (staging.up.railway.app)</option>
                  </select>
                </div>
              )}

              {recError && (
                <div className="p-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded font-medium">
                  ⚠️ {recError}
                </div>
              )}

              {/* Live Microphone Sound Visualizer & Volume Bar */}
              {isRecording && (
                <div className="flex flex-col space-y-1.5 bg-slate-900 p-2.5 rounded-md text-white">
                  <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                    <span>MIC INPUT LEVEL:</span>
                    <span>{volumeLevel}%</span>
                  </div>

                  {/* Volume Level Bar */}
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-75 rounded-full"
                      style={{
                        width: `${volumeLevel}%`,
                        backgroundColor: volumeLevel > 60 ? '#ef4444' : volumeLevel > 20 ? '#10b981' : '#3b82f6'
                      }}
                    />
                  </div>

                  {/* Animated Wave Spectrum */}
                  <div className="flex items-center justify-center space-x-1 pt-1 h-5">
                    {[40, 70, 30, 90, 60, 100, 50, 80, 40].map((h, idx) => (
                      <div
                        key={idx}
                        className="w-1 bg-pink-500 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(15, (volumeLevel / 100) * h)}%`,
                          opacity: volumeLevel > 5 ? 1 : 0.3
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recording Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                {!isRecording && !isStarting ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRecording();
                    }}
                    className="w-full text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-md shadow flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white inline-block shadow-inner" />
                    START RECORDING
                  </button>
                ) : isStarting ? (
                  <button
                    type="button"
                    disabled
                    className="w-full text-xs font-bold bg-amber-500 text-white py-2 px-3 rounded-md shadow flex items-center justify-center gap-2 cursor-wait opacity-90"
                  >
                    ⏳ Requesting Mic Permission...
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRecording();
                    }}
                    className="w-full text-xs font-extrabold bg-slate-900 hover:bg-black text-white py-2 px-3 rounded-md shadow flex items-center justify-center gap-2 transition active:scale-95 border-2 border-red-500 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 bg-red-500 inline-block rounded-sm" />
                    STOP & SAVE RECORDING
                  </button>
                )}
              </div>

              {/* Saved Audio Preview Options */}
              {stepAudioUrl && !isRecording && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handlePlayVoiceover}
                    className="text-xs bg-pink-100 text-pink-700 hover:bg-pink-200 px-3 py-1 rounded font-bold flex items-center gap-1"
                  >
                    {isPlayingAudio ? '⏸ Pause' : '▶ Play Preview'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAudio}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1"
                  >
                    🗑️ Re-record / Delete
                  </button>
                </div>
              )}

              {/* Export & Sync Local Voiceovers Buttons */}
              {!isRecording && (
                <div className="pt-2 border-t border-slate-200 flex flex-col items-center space-y-1.5">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsSyncing(true);
                      const targetName = TARGET_ENVS[syncTargetEnvState]?.label || 'Server';
                      setSaveStatus(`Syncing local voiceovers to ${targetName}...`);
                      const res = await syncAllLocalVoiceoversToServer(syncTargetEnvState);
                      setIsSyncing(false);
                      setSaveStatus(res.message);
                      if (res.success && res.count > 0) {
                        // Refresh current step voiceover from server target
                        const targetUrl = getSyncTargetUrl(syncTargetEnvState);
                        const serverVoiceovers = await fetchTourVoiceovers(tourId, targetUrl);
                        if (serverVoiceovers[String(currentStepIndex)]) {
                          setStepAudioUrl(serverVoiceovers[String(currentStepIndex)]);
                        }
                      }
                      setTimeout(() => setSaveStatus(null), 4000);
                    }}
                    className="text-[11px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded shadow-sm flex items-center gap-1 cursor-pointer transition active:scale-95"
                    title={`Upload all voiceovers saved in your browser's local IndexedDB to ${TARGET_ENVS[syncTargetEnvState]?.label || 'Railway'}`}
                  >
                    {isSyncing
                      ? '⏳ Syncing to Server...'
                      : `☁️ Sync All Local Voiceovers to ${TARGET_ENVS[syncTargetEnvState]?.label || 'Server'}`}
                  </button>


                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const audios = await getAllStepAudios();
                      const keys = Object.keys(audios);
                      if (keys.length === 0) {
                        alert('No recorded voiceovers found in local storage.');
                        return;
                      }
                      keys.forEach((key) => {
                        const blob = audios[key];
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${key}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      });
                    }}
                    className="text-[11px] font-bold text-slate-700 hover:text-pink-600 underline cursor-pointer"
                    title="Download all recorded voiceovers as .webm files"
                  >
                    💾 Download Backup of All Voiceovers (.webm)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-600 font-semibold">Voice Narration:</span>
                {stepAudioUrl ? (
                  <button
                    type="button"
                    onClick={handlePlayVoiceover}
                    className="text-xs font-bold text-[var(--cruk-pink)] bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm transition"
                  >
                    {isPlayingAudio ? '🔊 Playing...' : '▶ Listen Voiceover'}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">No recording for this step yet</span>
                )}
              </div>
            </div>
          )}

          {saveStatus && (
            <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
              ✓ {saveStatus}
            </p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleStepPrev}
            disabled={currentStepIndex === 0}
            className={`text-xs font-semibold px-3 py-1.5 rounded transition ${
              currentStepIndex === 0
                ? 'opacity-30 cursor-not-allowed text-gray-400'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ← Previous
          </button>

          <button
            type="button"
            onClick={handleStepNext}
            className="text-xs font-bold text-white bg-[var(--cruk-pink)] hover:bg-pink-700 px-4 py-1.5 rounded shadow-sm transition transform active:scale-95"
          >
            {currentStepIndex === totalSteps - 1 ? 'Finish Tour' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
};

