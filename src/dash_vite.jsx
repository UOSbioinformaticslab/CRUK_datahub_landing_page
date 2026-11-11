
import React from 'react'; // React is now imported from node_modules
import ReactDOM from 'react-dom/client';
import { DatahubDashboard} from './components/DatahubDashboard.jsx'; // 👈 Note the named import for Filters
import { Header } from './components/Header.jsx'
import FloatingQRCode from './components/FloatingQRCode.jsx';


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
renderReactComponent('datahubDashboard', <DatahubDashboard/>);
renderReactComponent('qr', <FloatingQRCode/>);

