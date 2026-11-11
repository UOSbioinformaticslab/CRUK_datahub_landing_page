import React from 'react';
import ReactDOM from 'react-dom/client';
import { HorizonsIntroduction } from './components/HorizonsIntroduction.jsx';
import { FilterApp } from './components/FilterApp.jsx';
import { Header } from './components/Header.jsx';
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
renderReactComponent('introduction', <HorizonsIntroduction/>);
// Pass the custodian filter so DatasetsSection will pre-filter the datasets
renderReactComponent('filter_navbar', <FilterApp custodianFilter="Cancer Research Horizons" />);
renderReactComponent('qr', <FloatingQRCode/>);

