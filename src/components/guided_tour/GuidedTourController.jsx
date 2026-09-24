import React, { useState, useEffect, useMemo } from 'react';
import { TourOverlay } from './TourOverlay.jsx';
import { getAdvancedFilterSteps } from './advancedFilters.js';
import { getSimpleFilterSteps } from './simpleFilters.js';
import { getFirstDatasetTourSteps } from './firstDatasetTour.js';

export const GuidedTourController = ({
  setActivePanel: propsSetActivePanel,
  setSelectedClassification: propsSetSelectedClassification,
  setSearchTerm: propsSetSearchTerm,
  setSelectedFilters: propsSetSelectedFilters,
  setExpandedKeys: propsSetExpandedKeys,
  setShowAdvancedLogic: propsSetShowAdvancedLogic
}) => {
  const [tourState, setTourState] = useState({ isActive: false, currentStepIndex: 1, tourId: null });
  const [filterSetters, setFilterSetters] = useState({});

  useEffect(() => {
    const handleRegister = (e) => {
      if (e.detail) {
        setFilterSetters(e.detail);
      }
    };
    window.addEventListener('registerFilterSetters', handleRegister);
    window.dispatchEvent(new CustomEvent('requestFilterSetters'));
    return () => window.removeEventListener('registerFilterSetters', handleRegister);
  }, []);

  const getEffectiveParams = () => ({
    setActivePanel: filterSetters.setActivePanel || propsSetActivePanel,
    setSelectedClassification: filterSetters.setSelectedClassification || propsSetSelectedClassification,
    setSearchTerm: filterSetters.setSearchTerm || propsSetSearchTerm,
    setSelectedFilters: filterSetters.setSelectedFilters || propsSetSelectedFilters,
    setExpandedKeys: filterSetters.setExpandedKeys || propsSetExpandedKeys,
    setShowAdvancedLogic: filterSetters.setShowAdvancedLogic || propsSetShowAdvancedLogic
  });

  const getStepsForTour = (tourId, params) => {
    if (tourId === 'simple_filters') return getSimpleFilterSteps(params);
    if (tourId === 'first_dataset_upload') return getFirstDatasetTourSteps(params);
    return getAdvancedFilterSteps(params);
  };

  const activeTourSteps = useMemo(() => {
    const params = getEffectiveParams();
    return getStepsForTour(tourState.tourId, params);
  }, [
    tourState.tourId,
    filterSetters,
    propsSetActivePanel,
    propsSetSelectedClassification,
    propsSetSearchTerm,
    propsSetSelectedFilters,
    propsSetExpandedKeys,
    propsSetShowAdvancedLogic
  ]);

  useEffect(() => {
    const handleStartTour = (e) => {
      const tourId = e.detail?.tourId || 'advanced_filters';
      let startIndex = typeof e.detail?.stepIndex === 'number' ? e.detail.stepIndex : 1;

      const steps = getStepsForTour(tourId, getEffectiveParams());

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
  }, [filterSetters, propsSetActivePanel, propsSetSelectedClassification, propsSetSearchTerm, propsSetSelectedFilters, propsSetExpandedKeys, propsSetShowAdvancedLogic]);

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
    // If on Step 1 (index 0) of first_dataset_upload and not on upload.html, navigate to upload.html at stepIndex 1 (Step 2)
    if (tourState.tourId === 'first_dataset_upload' && tourState.currentStepIndex === 0 && !window.location.pathname.endsWith('upload.html')) {
      sessionStorage.setItem('pendingGuidedTour', JSON.stringify({ tourId: 'first_dataset_upload', stepIndex: 1 }));
      window.location.href = './upload.html';
      return;
    }

    // If on Step 0 of simple/advanced filters (Dashboard navigation step), clicking Next navigates to datasets.html
    if (tourState.tourId !== 'first_dataset_upload' && tourState.currentStepIndex === 0) {
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

  // Adjust display step number for overlay badge
  const isDashboardStep = tourState.tourId !== 'first_dataset_upload' && tourState.currentStepIndex === 0;
  const displayStepNumber = isDashboardStep ? 1 : (tourState.tourId === 'first_dataset_upload' ? tourState.currentStepIndex + 1 : tourState.currentStepIndex);
  const totalDisplaySteps = isDashboardStep ? 1 : (tourState.tourId === 'first_dataset_upload' ? activeTourSteps.length : activeTourSteps.length - 1);

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
