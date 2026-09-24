// Configuration for First Dataset Upload Guided Tour

export const getFirstDatasetTourSteps = (params = {}) => {
  const isLoggedIn = !!localStorage.getItem('token') || !!localStorage.getItem('userName');
  const activeTeamId = localStorage.getItem('activeTeamId');
  const hasActiveTeam = !!activeTeamId && activeTeamId !== 'null' && activeTeamId !== 'undefined';

  if (!isLoggedIn || !hasActiveTeam) {
    return [
      {
        audioStepIndex: 99,
        target: '[data-tour="data-custodian-actions"]',
        title: '🔒 Data Custodian Login & Active Team Required',
        content: 'If you own or manage a dataset funded by CRUK you can upload the metadata here. To upload you must be logged in and be a registered data custodian. If you wish to join an existing data custodian team ask an existing member to invite you. Alternatively, you can request a new team, by logging in and using the form under Data Custodian Actions.',
        onEnter: () => {
          window.dispatchEvent(new CustomEvent('openSignInModal'));
        }
      }
    ];
  }

  return [
    {
      target: '[data-tour="data-custodian-actions"]',
      title: 'Step 1: Data Custodian Actions & Upload Options',
      content: 'Here you can access Data Custodian actions. Under "Upload info", click "Upload dataset" (or click Next) to begin creating a new dataset metadata record.',
      placement: 'right',
      onEnter: () => {
        window.dispatchEvent(new CustomEvent('expandDataCustodianMenu'));
      }
    },
    {
      target: '[data-tour="welcome-guide-section"]',
      title: 'Step 2: Guide to Uploading & Modifying Metadata',
      content: 'If you are adding a new dataset, you can fill in the form manually, use the AI uploader tab, or click "Upload JSON" to import an existing record. To edit an existing dataset, select it from the dropdown.',
      onEnter: () => {
        window.dispatchEvent(new CustomEvent('setSchemaSection', { detail: 'welcome' }));
      }
    },
    {
      target: '[data-tour="guidance-section"]',
      title: 'Step 3: Field Guidance & Reference Tools',
      content: 'The Guidance section in the right-hand panel provides field-specific instructions, downloadable metadata templates (.json), and user guide PDFs.',
      onEnter: () => {
        window.dispatchEvent(new CustomEvent('setAssistantTab', { detail: 'guidance' }));
      }
    },
    {
      target: '[data-tour="ai-import-section"]',
      title: 'Step 4: AI Import Assistant',
      content: 'Use the AI Import tab to auto-populate metadata from publications, PDFs, or unstructured text using AI extraction.',
      onEnter: () => {
        window.dispatchEvent(new CustomEvent('setAssistantTab', { detail: 'ai' }));
      }
    },
    {
      target: '[data-tour="live-preview-section"]',
      title: 'Step 5: Live Dataset Preview',
      content: 'The Live Preview tab displays a real-time rendering of how your dataset card and metadata page will appear to researchers on the CRUK Data Hub.',
      onEnter: () => {
        window.dispatchEvent(new CustomEvent('setAssistantTab', { detail: 'preview' }));
      }
    },
    {
      target: '[data-tour="metadata-sections-left"], [data-tour="metadata-sections-central"]',
      title: 'Step 6: Metadata Form Sections',
      content: 'Fill in the metadata sections on the left and central panels. Section indicators in the left navigation track your progress and required fields (*).',
      onEnter: () => {}
    },
    {
      target: '[data-tour="make-active-save-draft"]',
      title: 'Step 7: Make Active or Save as Draft',
      content: 'Click "Save as draft" to store your progress privately at any time, or click "Make active" when ready to publish your dataset to the CRUK Data Hub!',
      onEnter: () => {}
    }
  ];
};
