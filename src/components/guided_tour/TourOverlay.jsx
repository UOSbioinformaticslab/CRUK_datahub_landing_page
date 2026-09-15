import React, { useState, useEffect } from 'react';

export const TourOverlay = ({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onClose
}) => {
  const [targetRect, setTargetRect] = useState(null);

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
        // Fallback to center of screen if element not immediately rendered
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

  const bubbleWidth = 340;
  const bubbleHeight = 180;

  // Determine vertical placement: below target by default, above target if space below is limited
  let placeAbove = targetRect.top + targetRect.height + bubbleHeight + 20 > window.innerHeight;
  let bubbleTop = placeAbove
    ? Math.max(16, targetRect.top - bubbleHeight - 16)
    : Math.min(window.innerHeight - bubbleHeight - 16, targetRect.top + targetRect.height + 16);

  let bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;

  // Clamp left bounds
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

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
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
        className="absolute pointer-events-auto bg-white rounded-xl shadow-2xl p-5 border-2 border-[var(--cruk-pink)] text-gray-800 transition-all duration-200 z-[10000]"
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

        {/* Header Badge & Close Button */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--cruk-pink)] bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold px-1.5 focus:outline-none"
            aria-label="Close Tour"
          >
            ✕
          </button>
        </div>

        {/* Step Title & Content */}
        <h4 className="text-base font-bold text-[var(--cruk-darkblue)] mb-1.5">
          {step.title}
        </h4>
        <p className="text-xs leading-relaxed text-gray-600 mb-4">
          {step.content}
        </p>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onPrev}
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
            onClick={onNext}
            className="text-xs font-bold text-white bg-[var(--cruk-pink)] hover:bg-pink-700 px-4 py-1.5 rounded shadow-sm transition transform active:scale-95"
          >
            {currentStepIndex === totalSteps - 1 ? 'Finish Tour' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
};
