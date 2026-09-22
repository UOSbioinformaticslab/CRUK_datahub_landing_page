import React, { useState, useEffect, useMemo } from 'react';
import { TourOverlay } from './TourOverlay.jsx';
import { getAdvancedFilterSteps } from './advancedFilters.js';
import { getSimpleFilterSteps } from './simpleFilters.js';

export const GuidedTourController = ({
  setActivePanel,
  setSelectedClassification,
  setSearchTerm,
  setSelectedFilters,
  setExpandedKeys,
  setShowAdvancedLogic
}) => {
  const [tourState, setTourState] = useState({ isActive: false, currentStepIndex: 1, tourId: null });

  const activeTourSteps = useMemo(() => {
    const params = {
      setActivePanel,
      setSelectedClassification,
      setSearchTerm,
      setSelectedFilters,
      setExpandedKeys,
      setShowAdvancedLogic
    };

    if (tourState.tourId === 'simple_filters') {
      return getSimpleFilterSteps(params);
    }
    return getAdvancedFilterSteps(params);
  }, [
    tourState.tourId,
    setActivePanel,
    setSelectedClassification,
    setSearchTerm,
    setSelectedFilters,
    setExpandedKeys,
    setShowAdvancedLogic
  ]);

  useEffect(() => {
    const handleStartTour = (e) => {
      const tourId = e.detail?.tourId || 'advanced_filters';
      let startIndex = typeof e.detail?.stepIndex === 'number' ? e.detail.stepIndex : 1;

      const steps = tourId === 'simple_filters'
        ? getSimpleFilterSteps({ setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic })
        : getAdvancedFilterSteps({ setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic });

      if (steps[startIndex] && steps[startIndex].onEnter) {
        steps[startIndex].onEnter();
      }
      setTourState({ isActive: true, currentStepIndex: startIndex, tourId });
    };

    window.addEventListener('startGuidedTour', handleStartTour);

    // Check for pending tour queued from another page
    const pendingRaw = sessionStorage.getItem('pendingGuidedTour');
    if (pendingRaw) {
      try {
        const { tourId, stepIndex } = JSON.parse(pendingRaw);
        sessionStorage.removeItem('pendingGuidedTour');
        setTimeout(() => {
          handleStartTour({ detail: { tourId, stepIndex: typeof stepIndex === 'number' ? stepIndex : 0 } });
        }, 350);
      } catch (err) {
        sessionStorage.removeItem('pendingGuidedTour');
      }
    }

    return () => window.removeEventListener('startGuidedTour', handleStartTour);
  }, [setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic]);

  // Intercept click on [data-tour="browse-datasets"] if on Step 0
  useEffect(() => {
    if (!tourState.isActive || tourState.currentStepIndex !== 0) return;

    const handleBrowseClick = () => {
      sessionStorage.setItem('pendingGuidedTour', JSON.stringify({ tourId: tourState.tourId, stepIndex: 1 }));
    };

    const browseBtn = document.querySelector('[data-tour="browse-datasets"]');
    if (browseBtn) {
      browseBtn.addEventListener('click', handleBrowseClick);
      return () => browseBtn.removeEventListener('click', handleBrowseClick);
    }
  }, [tourState.isActive, tourState.currentStepIndex, tourState.tourId]);

  if (!tourState.isActive || !activeTourSteps[tourState.currentStepIndex]) {
    return null;
  }

  const currentStep = activeTourSteps[tourState.currentStepIndex];

  const handleNext = () => {
    // If on Step 0 (Dashboard navigation step), clicking Next navigates to datasets.html
    if (tourState.currentStepIndex === 0) {
      sessionStorage.setItem('pendingGuidedTour', JSON.stringify({ tourId: tourState.tourId, stepIndex: 1 }));
      window.location.href = './datasets.html';
      return;
    }

    const nextIndex = tourState.currentStepIndex + 1;
    if (nextIndex < activeTourSteps.length) {
      const nextStep = activeTourSteps[nextIndex];
      if (nextStep.onEnter) nextStep.onEnter();
      setTourState(prev => ({ ...prev, isActive: true, currentStepIndex: nextIndex }));
    } else {
      setTourState({ isActive: false, currentStepIndex: 1, tourId: null });
    }
  };

  const handlePrev = () => {
    const prevIndex = tourState.currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = activeTourSteps[prevIndex];
      if (prevStep.onEnter) prevStep.onEnter();
      setTourState(prev => ({ ...prev, isActive: true, currentStepIndex: prevIndex }));
    }
  };

  const handleClose = () => {
    setTourState({ isActive: false, currentStepIndex: 1, tourId: null });
  };

  // Adjust display step number for overlay badge
  const isDashboardStep = tourState.currentStepIndex === 0;
  const displayStepNumber = isDashboardStep ? 1 : tourState.currentStepIndex;
  const totalDisplaySteps = isDashboardStep ? 1 : activeTourSteps.length - 1;

  return (
    <TourOverlay
      step={currentStep}
      currentStepIndex={tourState.currentStepIndex}
      displayStepNumber={displayStepNumber}
      totalSteps={totalDisplaySteps}
      tourId={tourState.tourId || 'tour'}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={handleClose}
    />
  );
};
