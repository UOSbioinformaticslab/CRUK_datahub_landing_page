import React from 'react';
import ReactDOM from 'react-dom/client';
import PublicationUpload from './components/PublicationUpload.jsx';
import FloatingQRCode from './components/FloatingQRCode.jsx';
import { Header } from './components/Header.jsx'
import './utils/fetchInterceptor.js';


function renderReactComponent(targetId, Component) {
  // 1. Get the target DOM element
  const targetElement = document.getElementById(targetId);

  // 2. Check if the element exists
  if (targetElement) {
    // 3. Create the root and render the component
    const root = ReactDOM.createRoot(targetElement);
    root.render(
      // Keep it wrapped in React.StrictMode for development best practices
      <React.StrictMode>
        {Component}
      </React.StrictMode>
    );
  } else {
    // 4. Log an error if the element is not found
    console.error(`Target element '${targetId}' not found in the DOM. Cannot render component.`);
  }
}

renderReactComponent('header', <Header/>);
renderReactComponent('upload_publications', <PublicationUpload/>);
renderReactComponent('qr', <FloatingQRCode/>);

