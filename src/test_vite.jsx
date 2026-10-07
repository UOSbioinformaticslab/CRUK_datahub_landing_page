import React from 'react';
import ReactDOM from 'react-dom/client';
import PublicationSearch from './utils/PublicationSearch.jsx';
import { Header } from './components/Header.jsx';

function renderReactComponent(targetId, Component) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    const root = ReactDOM.createRoot(targetElement);
    root.render(
      <React.StrictMode>
        {Component}
      </React.StrictMode>
    );
  } else {
    console.error(`Target element '${targetId}' not found in the DOM.`);
  }
}

renderReactComponent('header', <Header/>);
renderReactComponent('publication_search', <PublicationSearch/>);
