import React from 'react';
import ReactDOM from 'react-dom/client';
import { Introduction } from './components/Introduction2.jsx';
import { FilterApp } from './components/FilterApp.jsx';
import { Header } from './components/Header.jsx';
// Import removed: import { StudiesSection } from './components/AltStudiesSection.jsx';
import { InstructionsWidget } from './components/InstructionsWidget.jsx';
import FloatingQRCode from './components/FloatingQRCode.jsx';

import './utils/fetchInterceptor.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

function renderReactComponent(targetId, Component) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    const root = ReactDOM.createRoot(targetElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          {Component}
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    console.error(`Target element '${targetId}' not found in the DOM.`);
  }
}


renderReactComponent('header', <Header/>);
renderReactComponent('introduction', <Introduction/>);
renderReactComponent('filter_navbar', <FilterApp/>); // This will now contain both sections
renderReactComponent('qr', <FloatingQRCode/>);
// Render removed: renderReactComponent('studies', <StudiesSection/>);