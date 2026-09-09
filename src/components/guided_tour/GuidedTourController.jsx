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
  const [tourState, setTourState] = useState({ isActive: false, currentStepIndex: 0, tourId: null });

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
      const steps = tourId === 'simple_filters'
        ? getSimpleFilterSteps({ setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic })
        : getAdvancedFilterSteps({ setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic });

      if (steps[0] && steps[0].onEnter) {
        steps[0].onEnter();
      }
      setTourState({ isActive: true, currentStepIndex: 0, tourId });
    };

    window.addEventListener('startGuidedTour', handleStartTour);
    return () => window.removeEventListener('startGuidedTour', handleStartTour);
  }, [setActivePanel, setSelectedClassification, setSearchTerm, setSelectedFilters, setExpandedKeys, setShowAdvancedLogic]);

  if (!tourState.isActive || !activeTourSteps[tourState.currentStepIndex]) {
    return null;
  }

  const currentStep = activeTourSteps[tourState.currentStepIndex];

  const handleNext = () => {
    const nextIndex = tourState.currentStepIndex + 1;
    if (nextIndex < activeTourSteps.length) {
      const nextStep = activeTourSteps[nextIndex];
      if (nextStep.onEnter) nextStep.onEnter();
      setTourState(prev => ({ ...prev, isActive: true, currentStepIndex: nextIndex }));
    } else {
      setTourState({ isActive: false, currentStepIndex: 0, tourId: null });
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
    setTourState({ isActive: false, currentStepIndex: 0, tourId: null });
  };

  return (
    <TourOverlay
      step={currentStep}
      currentStepIndex={tourState.currentStepIndex}
      totalSteps={activeTourSteps.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={handleClose}
    />
  );
};
