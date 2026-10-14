import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToolUploadPage } from './components/ToolUploadPage.jsx';
import './utils/fetchInterceptor.js';

function renderReactComponent(targetId, Component) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    const root = ReactDOM.createRoot(targetElement);
    root.render(
      <React.StrictMode>
        {Component}
      </React.StrictMode>
    );
  }
}

renderReactComponent('upload', <ToolUploadPage />);
