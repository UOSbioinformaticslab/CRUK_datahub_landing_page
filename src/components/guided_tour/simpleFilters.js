/**
 * Simple Filters Demonstration
 *
 * Goal: Demonstrate basic filtering by selecting a patient-friendly CRUK Cancer Term
 * ("Bowel cancer") and combining it with an Accessibility restriction ("Ethics approval required").
 */

export const getSimpleFilterSteps = ({
  setActivePanel,
  setSelectedClassification,
  setSearchTerm,
  setSelectedFilters,
  setExpandedKeys,
  setShowAdvancedLogic
}) => [
  {
    target: '[data-tour="cancer-tab"]',
    title: 'Simple Filters Demonstration (1/5)',
    content: 'Goal: In this simple demonstration, you will select "Bowel cancer" from CRUK Cancer Terms and combine it with the "Ethics approval required" accessibility filter. Click "Which Cancers are you interested in?" to start.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification(null);
      setSearchTerm('');
    }
  },
  {
    target: '#classification-card-cruk',
    title: 'Step 2: CRUK Cancer Terms',
    content: 'Click on the "CRUK Cancer Terms" card to view patient-friendly cancer categories.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification(null);
      setSearchTerm('');
    }
  },
  {
    target: '#cruk-terms-list input[id="0_0_2_12"]',
    title: 'Step 3: Pick Bowel Cancer Filter',
    content: 'Click the checkbox next to "Bowel cancer" to filter datasets related to bowel cancer.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification('cruk');
      setSearchTerm('');
      setSelectedFilters(new Set(["0_0_2_12"]));
    }
  },
  {
    target: '[data-tour="access-tab"]',
    title: 'Step 4: Select Accessibility Panel',
    content: 'Click "Which access restrictions apply?" to set data access requirements.',
    onEnter: () => {
      setActivePanel('access');
      setSearchTerm('');
    }
  },
  {
    target: '#accessibility-panel input[id="0_1_3"]',
    title: 'Step 5: Pick Ethics Approval Required Filter',
    content: 'Click the checkbox next to "ethics approval required" to complete your search filter query.',
    onEnter: () => {
      setActivePanel('access');
      setSearchTerm('');
      setSelectedFilters(prev => {
        const next = new Set(prev);
        next.add("0_0_2_12");
        next.add("0_1_3");
        return next;
      });
    }
  }
];
