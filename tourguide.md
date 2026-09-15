# Guided Tour System Documentation (`tourguide.md`)

This document outlines the architecture, data flow, component breakdown, and extension patterns for the **Interactive Guided Tour** system in the CRUK Metadata Catalogue (`CRUK_datahub_landing_page`).

---

## 1. Overview & Goal

The Guided Tour framework provides interactive, visual step-by-step onboarding walkthroughs across the web application. It spotlights targeted UI elements with SVG masks, displays explanatory popovers, and automatically manipulates application state (opening filter accordions, expanding taxonomy trees, and toggling Boolean logic operators).

### Key Features
* **Modular Tour Definitions**: Tour step sequences are decoupled from application logic into standalone config files (`simpleFilters.js`, `advancedFilters.js`).
* **Cross-Page Navigation Awareness**: Tours automatically detect the current page. If initiated from another page (e.g. `about.html`, `projects.html`), the system routes the user to `dashboard.html` first with a navigation step highlighting **"Browse or Search Datasets"**, then seamlessly transitions to `datasets.html` where filter steps resume.
* **Viewport-Relative Spotlight Overlay**: SVG overlay uses direct bounding box geometry (`getBoundingClientRect`) so spotlights and thought bubbles render accurately across scrolling and window resizing.

---

## 2. Directory & File Structure

All tour-related components and step definitions reside in `src/components/guided_tour/`:

```
src/components/guided_tour/
├── GuidedTourController.jsx  # Main state machine & event listener controller
├── TourOverlay.jsx           # SVG spotlight mask & popover thought bubble UI
├── simpleFilters.js          # Step config: Simple Filters Demonstration
└── advancedFilters.js        # Step config: Advanced Filters & Logic Demonstration
```

---

## 3. Component Architecture & Responsibilities

### `GuidedTourController.jsx`
* **Role**: Manages active tour state (`tourState`), current step index, and step navigation (`handleNext`, `handlePrev`, `handleClose`).
* **Events**: Listens for the `startGuidedTour` CustomEvent dispatched globally by the top navbar (`Header.jsx`).
* **Cross-Page Navigation**:
  * Reads `sessionStorage.getItem('pendingGuidedTour')` upon mounting.
  * If a tour was queued from another page, `GuidedTourController` initializes the tour at the appropriate step (`stepIndex: 0` for Dashboard navigation, or `stepIndex: 1` for filter catalog steps).
  * Intercepts clicks on the **"Browse or Search Datasets"** button (`[data-tour="browse-datasets"]`) on Step 0 to persist state and navigate to `datasets.html`.

### `TourOverlay.jsx`
* **Role**: Visual presentation layer.
* **SVG Spotlight Mask**: Creates a dark translucent backdrop (`rgba(15, 23, 42, 0.75)`) with an SVG path cutout around the target element's exact bounding box.
* **Popover Card**: Positions a styled thought bubble adjacent to the spotlighted element, complete with title, content body, progress count (e.g. `Step 2 of 5`), **Back**, **Next**, and **Close** controls.

### `Header.jsx`
* **Role**: Provides the top navbar dropdown menu under **"Interactive Guided Tour ▼"** (styled cleanly in yellow text to match the rest of the navbar bar).
* **Helper Function (`triggerTour`)**:
  ```js
  const triggerTour = (tourId) => {
    const isDatasets = currentPath.endsWith('datasets.html') || currentPath === '/' || currentPath.endsWith('/');
    const isDashboard = currentPath.endsWith('dashboard.html');

    if (isDatasets) {
      window.dispatchEvent(new CustomEvent('startGuidedTour', { detail: { tourId, stepIndex: 1 } }));
    } else if (isDashboard) {
      window.dispatchEvent(new CustomEvent('startGuidedTour', { detail: { tourId, stepIndex: 0 } }));
    } else {
      sessionStorage.setItem('pendingGuidedTour', JSON.stringify({ tourId, stepIndex: 0 }));
      window.location.href = './dashboard.html';
    }
  };
  ```

---

## 4. Tour Definitions

### Tour 1: `simpleFilters.js` (**Simple Filters Demonstration**)
* **Goal**: Basic filtering using CRUK Cancer Term *"Bowel cancer"* combined with Accessibility restriction *"Ethics approval required"*.
* **Steps**:
  0. *(Dashboard)* Highlight **"Browse or Search Datasets"** button.
  1. Highlight **"Which Cancers are you interested in?"** tab.
  2. Highlight **CRUK Cancer Terms** card.
  3. Check **Bowel cancer** (`0_0_2_12`).
  4. Highlight **"Which access restrictions apply?"** tab.
  5. Check **ethics approval required** (`0_1_3`).

### Tour 2: `advancedFilters.js` (**Advanced Filters & Logic Demonstration**)
* **Goal**: Advanced multi-category filtering for Breast Cancer (ICD-O C50), expanding nested Techniques (`Multi-omic Data > Biological molecules > Epigenomics & Proteomics`), opening the Advanced Logic Builder, and toggling the data operator from `AND` to `OR`.
* **Steps**:
  0. *(Dashboard)* Highlight **"Browse or Search Datasets"** button.
  1. Highlight **"Which Cancers are you interested in?"** tab.
  2. Select **ICD-O Classification** card.
  3. Check **C50 Breast** (`0_0_0_9`).
  4. Highlight **"What kind of data do you need?"** tab.
  5. Expand **Multi-omic Data** (`0_2_4_4`).
  6. Expand **Biological molecules (eg DNA)** (`0_2_4_4_0`).
  7. Check **Epigenomics** (`0_2_4_4_0_0`).
  8. Check **Proteomics** (`0_2_4_4_0_4`).
  9. Click **Show Advanced Logic Builder**.
  10. Toggle 2nd `AND` operator button to `OR`.

---

## 5. How to Add a New Tour (Collaborator Guide)

Adding a new guided tour requires 3 simple steps:

### Step 1: Create a Step Config File
Create a new file in `src/components/guided_tour/myNewTour.js`:

```js
/**
 * My New Guided Tour
 */
export const getMyNewTourSteps = (params = {}) => {
  const { setActivePanel, setSelectedFilters } = params;

  return [
    {
      target: '[data-tour="browse-datasets"]',
      title: 'Navigate to Datasets Page',
      content: 'Goal: Click "Browse or Search Datasets" to start.',
      onEnter: () => {}
    },
    {
      target: '[data-tour="cancer-tab"]',
      title: 'Step 1: Open Cancer Section',
      content: 'Click here to select cancer terms.',
      onEnter: () => {
        setActivePanel?.('cancer');
      }
    }
  ];
};
```

### Step 2: Register in `GuidedTourController.jsx`
Import your step configuration and add a condition in `activeTourSteps`:

```js
import { getMyNewTourSteps } from './myNewTour.js';

// Inside activeTourSteps useMemo:
if (tourState.tourId === 'my_new_tour') {
  return getMyNewTourSteps(params);
}
```

### Step 3: Add Entry to `Header.jsx`
Add a dropdown item under **Interactive Guided Tour ▼** in `Header.jsx`:

```jsx
<li>
  <a 
    href="#" 
    onClick={(e) => {
      e.preventDefault();
      triggerTour('my_new_tour');
    }}
    className="block px-4 py-2 text-sm font-semibold hover:bg-gray-100"
    style={{ color: '#103067' }}
  >
    🌟 My New Demonstration Tour
  </a>
</li>
```

---

## 6. Target Element Tagging Rules

To ensure spotlights lock onto DOM elements properly:
1. Always attach a unique DOM `id="..."` or `data-tour="..."` attribute to target elements.
   * Example: `<button data-tour="access-tab">...</button>`
   * Example: `<button id="classification-card-cruk">...</button>`
2. Avoid target selectors dependent on unstable class names (e.g. Tailwind utility hashes).
3. When targeting nested tree nodes that render conditionally, invoke the necessary state setter in `onEnter()` (e.g. `setExpandedKeys(new Set(['0_2_4_4']))`) to ensure the target element exists in the DOM before the step renders.
