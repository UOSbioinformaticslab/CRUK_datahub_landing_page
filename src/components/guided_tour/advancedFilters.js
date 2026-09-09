/**
 * Advanced Filters & Logic Demonstration
 *
 * Goal: Demonstrate advanced multi-category filtering for Breast Cancer (ICD-O C50),
 * expanding nested Techniques (Multi-omic Data > Biological molecules > Epigenomics & Proteomics),
 * opening the Advanced Logic Builder, and toggling the data operator from AND to OR.
 */

export const getAdvancedFilterSteps = ({
  setActivePanel,
  setSelectedClassification,
  setSearchTerm,
  setSelectedFilters,
  setExpandedKeys,
  setShowAdvancedLogic
}) => [
  {
    target: '[data-tour="cancer-tab"]',
    title: 'Advanced Filters & Logic Demonstration (1/10)',
    content: 'Goal: In this demonstration, you will select Breast Cancer (ICD-O C50), add Epigenomics and Proteomics data types, open the Advanced Logic Builder, and change the data combination operator from AND to OR. Click "Which Cancers are you interested in?" to begin.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification(null);
      setSearchTerm('');
    }
  },
  {
    target: '#classification-card-icdo',
    title: 'Step 2: Choose ICD-O Classification',
    content: 'Click on the "ICD-O Classification" card to view official pathology terms split into Topography and Histology.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification(null);
      setSearchTerm('');
    }
  },
  {
    target: '#icdo-topography-list input[id="0_0_0_9"]',
    title: 'Step 3: Pick C50 Breast Filter',
    content: 'Click the checkbox next to "C50 Breast" under Topography to filter datasets for breast cancer.',
    onEnter: () => {
      setActivePanel('cancer');
      setSelectedClassification('icdo');
      setSearchTerm('');
      setSelectedFilters(prev => new Set(prev).add("0_0_0_9"));
    }
  },
  {
    target: '[data-tour="data-tab"]',
    title: 'Step 4: Select Data Type Panel',
    content: 'Click "What kind of data do you need?" to open the Data Type selection panel.',
    onEnter: () => {
      setActivePanel('data');
      setSearchTerm('');
      setExpandedKeys(new Set());
    }
  },
  {
    target: '#expand-0_2_4_4',
    title: 'Step 5: Expand Multi-omic Data',
    content: 'Click the chevron arrow next to "Multi-omic Data" under Techniques to view its sub-categories.',
    onEnter: () => {
      setActivePanel('data');
      setSearchTerm('');
      setExpandedKeys(new Set());
    }
  },
  {
    target: '#expand-0_2_4_4_0',
    title: 'Step 6: Expand Biological Molecules',
    content: 'Click the chevron arrow next to "Biological molecules (eg DNA)" to reveal Epigenomics and Proteomics.',
    onEnter: () => {
      setActivePanel('data');
      setSearchTerm('');
      setExpandedKeys(new Set(['0_2_4_4']));
    }
  },
  {
    target: '#techniques-studies-list input[id="0_2_4_4_0_0"]',
    title: 'Step 7: Pick Epigenomics Filter',
    content: 'Click the checkbox next to "Epigenomics" to include Epigenomics data in your search.',
    onEnter: () => {
      setActivePanel('data');
      setSearchTerm('');
      setExpandedKeys(new Set(['0_2_4_4', '0_2_4_4_0']));
      setSelectedFilters(prev => {
        const next = new Set(prev);
        next.add("0_0_0_9");
        next.add("0_2_4_4_0_0");
        return next;
      });
    }
  },
  {
    target: '#techniques-studies-list input[id="0_2_4_4_0_4"]',
    title: 'Step 8: Pick Proteomics Filter',
    content: 'Click the checkbox next to "Proteomics" to include Proteomics data as well.',
    onEnter: () => {
      setActivePanel('data');
      setSearchTerm('');
      setExpandedKeys(new Set(['0_2_4_4', '0_2_4_4_0']));
      setSelectedFilters(prev => {
        const next = new Set(prev);
        next.add("0_0_0_9");
        next.add("0_2_4_4_0_0");
        next.add("0_2_4_4_0_4");
        return next;
      });
    }
  },
  {
    target: '[data-tour="toggle-logic-builder"]',
    title: 'Step 9: Open Advanced Logic Builder',
    content: 'Click "Show Advanced Logic Builder" to view and customize how your selected filters combine.',
    onEnter: () => {
      setSearchTerm('');
      setShowAdvancedLogic(true);
      setExpandedKeys(new Set(['0_2_4_4', '0_2_4_4_0']));
      setSelectedFilters(prev => {
        const next = new Set(prev);
        next.add("0_0_0_9");
        next.add("0_2_4_4_0_0");
        next.add("0_2_4_4_0_4");
        return next;
      });
    }
  },
  {
    target: '[data-tour="operator-toggle-second-and"]',
    title: 'Step 10: Change AND to OR Operator',
    content: 'Click the highlighted "AND" button between Epigenomics and Proteomics (or click Finish Tour) to toggle it to "OR". Now datasets with EITHER Epigenomics OR Proteomics will be included!',
    onEnter: () => {
      setSearchTerm('');
      setShowAdvancedLogic(true);
      setExpandedKeys(new Set(['0_2_4_4', '0_2_4_4_0']));
      setSelectedFilters(prev => {
        const next = new Set(prev);
        next.add("0_0_0_9");
        next.add("0_2_4_4_0_0");
        next.add("0_2_4_4_0_4");
        return next;
      });
      setTimeout(() => {
        const btn = document.querySelector('[data-tour="operator-toggle-second-and"]');
        if (btn && btn.textContent.trim() === 'AND') {
          btn.click();
        }
      }, 500);
    }
  }
];
