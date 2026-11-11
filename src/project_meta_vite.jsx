
import React from 'react'; // React is now imported from node_modules
import ReactDOM from 'react-dom/client';
import { ProjectMetadataPage} from './components/ProjectMetadataPage.jsx'; // 👈 Note the named import for Filters
import { Header } from './components/Header.jsx'

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

renderReactComponent('header', <Header/>)
renderReactComponent('project_meta', <ProjectMetadataPage/>)


