import React from 'react';
import ReactDOM from 'react-dom/client';
import { Header } from './components/Header.jsx'
import TeamRequest from './components/TeamRequest.jsx';

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
    console.error(`Target element '${targetId}' not found in the DOM. Cannot render component.`);
  }
}

renderReactComponent('header', <Header/>)
renderReactComponent('team_request_form', <TeamRequest/>);
