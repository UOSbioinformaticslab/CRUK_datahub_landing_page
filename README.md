# CRUK Datahub Landing Page

Welcome to the **CRUK Datahub Landing Page** frontend application. This repository contains the React-based user interface for browsing, filtering, and managing cancer research datasets, tools, and project metadata.

## 🌟 Key Features

- **Advanced Dataset Filtering Engine:** Features a custom, PubMed-style Boolean logic search (AND/OR, brackets) that allows researchers to build highly specific dataset queries.
- **Hierarchical Terminology Browser:** Integrated support for exploring and filtering by major cancer classification systems, including:
  - ICD-O (Topography & Histology)
  - SNOMED-CT
  - TCGA
  - CRUK-specific terms
- **Dataset & Tool Catalogue:** A dynamic, sortable interface for viewing research meta datasets and software tools, complete with synopses, accessibility restrictions, and structural metadata summaries.
- **AI-Assisted Filtering:** Seamless integration with backend AI microservices to allow natural language queries to pre-filter complex dataset lists.

## 🏗 Architecture Overview

The application is built as a modern Multi-Page Application (MPA) prioritizing fast client-side interactions and modular design. Rather than relying on a single entry point, the frontend uses Vite's multi-page capabilities to serve distinct HTML files for different sections of the platform, each mounting their respective React component trees.

### Frontend Tech Stack
- **Framework:** React.js
- **Build Tool:** Vite (configured for multiple HTML entry points and optimized production bundles)
- **Styling:** Tailwind CSS combined with custom CSS variables (e.g., CRUK brand colors) for a responsive, accessible, and visually distinct interface.
- **Routing:** Handled via distinct HTML files (e.g., `/datasets.html`, `/upload.html`) rather than a purely client-side React router.

### Core Subsystems

1. **Client-Side Query Evaluator (`src/utils/filterLogic.js`)**
   - The application does not rely purely on backend SQL for search. Instead, it converts visual filter selections into Boolean prefix expressions, dynamically generating and evaluating JavaScript `Set` operations in the browser for instant, offline-capable filtering across thousands of records.

2. **Terminology Data Layer (`src/utils/longer_filter_data.js`)**
   - Employs a local hierarchical JSON structure for the taxonomy tree. This is processed on initialization into a flattened, `O(1)` lookup map for high-performance rendering of the nested filter UI.

3. **Backend Connectivity**
   - Designed to run alongside a Python-based middleware (`middle/`) and AI microservice architecture (`ai/`).
   - Fetches live metadata and handles data access requests via standard REST APIs configured through `import.meta.env.VITE_BACKEND_URL`.

---

## 🚀 System Setup & Quick Start

### System Architecture Overview

The CRUK Metadata Catalogue consists of five inter-connected repositories:

1. **Frontend Landing Page** (`CRUK_datahub_landing_page`) — [`git@github.com:UOSbioinformaticslab/CRUK_datahub_landing_page.git`](https://github.com/UOSbioinformaticslab/CRUK_datahub_landing_page)
   * **Role**: React/Vite user interface running on `http://localhost:5173`. Provides dataset browsing, search, metadata upload forms, custodian management, and live schema documentation views.
2. **Basic Backend** (`basic/basic_backend`) — [`git@github.com:UOSbioinformaticslab/basic_backend.git`](https://github.com/UOSbioinformaticslab/basic_backend)
   * **Role**: Core FastAPI database backend running on `http://localhost:8000`. Manages Users, Teams, Datasets (JSON metadata blobs & draft states), Projects, Publications, Tools, and Team Invitations.
3. **Middle Layer Proxy** (`middle`) — [`git@github.com:UOSbioinformaticslab/cruk-middle-layer.git`](https://github.com/UOSbioinformaticslab/cruk-middle-layer)
   * **Role**: Administrative FastAPI service running on `http://localhost:8002`. Manages new Data Custodian team request applications (`TeamRequest`) and centralized system error logging (`ErrorLog`).
4. **CRUK Semantic Schema Viewer & Package** (`semantic-schema/cruk-semantic-schema`) — [`git@github.com:UOSbioinformaticslab/cruk-semantic-schema.git`](https://github.com/UOSbioinformaticslab/cruk-semantic-schema)
   * **Role**: React component library & standalone interactive UI for rendering the CRUK 1.0.0 semantic schema overlay dynamically fetched from HDRUK schemata.
5. **AI Microservices** (`ai/ai-microservices`) — *Optional / Private Repository* — [`git@github.com:UOSbioinformaticslab/ai-microservices.git`](https://github.com/UOSbioinformaticslab/ai-microservices)
   * **Role**: FastAPI AI microservice running on `http://localhost:8001`. Powered by Google Gemini API for intelligent metadata extraction, automated tagging, and semantic search assistance. Note: This repository is private. If you do not have access to it or do not have a Gemini API key, the rest of the CRUK catalogue will run fully and seamlessly without it.

### Environment Setup (`.env` Configuration)

Each backend service requires a local `.env` configuration file to operate properly:

1. **Automatic `.env` Creation**:
   When you run `./start_all.sh`, the script automatically detects missing `.env` files and creates them from their `.env.example` templates.
2. **Manual Setup**:
   You can also manually copy template files before starting:
   ```bash
   cp ../basic/basic_backend/.env.example ../basic/basic_backend/.env
   cp ../middle/.env.example ../middle/.env
   cp ../ai/ai-microservices/.env.example ../ai/ai-microservices/.env  # Optional
   ```
3. **Variable Customization**:
   * `basic/basic_backend/.env`: Configure `ADMIN_PASSWORD="your-admin-password"`, `SECRET_KEY`, and `DATABASE_URL` (SQLite `sqlite:///./cruk_datahub.db`).
   * `middle/.env`: Configure `DATABASE_URL` (SQLite `sqlite:///./middlelayer.db`).
   * `ai/ai-microservices/.env`: Configure `GEMINI_API_KEY="your-google-gemini-api-key"`. *(Optional / Private repo)*.

### Quick Start (Single Command Setup & Run)

To automatically create a Python virtual environment, install Node & Python dependencies, verify/create `.env` files, and launch all available microservices:

```bash
# Run from this repository directory
./start_all.sh
```

Press `Ctrl+C` in the terminal to stop all microservices cleanly.

---

## 📄 Application Pages

The frontend is divided into several dedicated pages, each focusing on a specific workflow within the Datahub ecosystem:

### Catalogues & Browsing
- **`index.html`**: The main entry point and general landing page for the hub.
- **`datasets.html`**: The primary data catalogue featuring the advanced terminology search, Boolean filtering, and dataset listings.
- **`tools.html`**: A dedicated catalogue for browsing registered software tools and analytical pipelines.
- **`projects.html`**: A directory for viewing ongoing or completed research projects utilizing the datahub.
- **`publications.html`**: A listing of academic publications linked to the data, tools, or projects within the hub.

### Metadata Viewing
- **`meta.html`**: Detailed view page for an individual dataset's structural and descriptive metadata.
- **`project_meta.html` / `tool.html`**: Dedicated detail pages for viewing in-depth information about specific projects and tools.

### Data Upload & Management
- **`upload.html`**: The main interface for data custodians to submit new datasets into the hub.
- **`upload_tool.html` / `upload_project.html` / `upload_publications.html`**: Specialized forms for registering tools, projects, and publications, ensuring metadata conforms to the hub's schemas.
- **`manage_hub.html` / `dashboard.html`**: Administrative interfaces for managing submissions, users, and overall hub activity.

### User Workflows
- **`sign_in.html`**: Authentication portal for researchers and data custodians.
- **`team_request.html`**: Interface for users to request access to specific datasets or to form research teams.
- **`data_custodian.html` / `data_custodians.html`**: Pages detailing the data custodians and their specific access requirements or contact procedures.

---

## ♿ Accessibility Improvements (Completed)

The application has undergone significant remediation to meet WCAG 2.1 AA standards. Key improvements include:

- **Global Semantics**: All HTML entry points now include `<html lang="en">` and proper `<title>` tags for screen readers.
- **Heading Hierarchy**: Restructured headings (e.g., ensuring `<h1>` is present and headings are strictly hierarchical) across the platform.
- **Form Linkage & Unique IDs**: Dynamic schema forms now generate mathematically unique IDs for every field (e.g., `id="field-summary-title"`) and use explicit `<label htmlFor="...">` tags, guaranteeing reliable form-to-label association for screen readers.
- **Accessible Toggles & Interactive Elements**: Expandable/collapsible sections (like schema nested objects or "CRUK Cancer Terms") have been converted from `<div>` to native `<button type="button">` tags. They now support full keyboard operability (Tab, Enter) and utilize `aria-expanded` attributes.
- **ARIA Landmarks and Roles**: Added `<main>` and `<aside>` landmarks to critical pages. Tab-based navigation (like in `ManageHub.jsx`) properly implements `role="tablist"` and `role="tab"`.
- **Focus Trapping**: Integrated `react-focus-lock` to securely trap keyboard focus within active modals (Admin Modals, Feedback), preventing keyboard users from accidentally interacting with the background page.
- **Keyboard Operability (Dropdowns)**: Custom dropdown menus (such as "Data Custodian Actions") now correctly close on `Blur` (when tabbing away) and on `Escape` keypress, aligning with WCAG expectations.

## 🔜 What Remains to be Done

1. **Refactor PubMed-style Search UI**: The current search filter allows users to manually edit a free-text `textarea`. This needs to be replaced with a robust, token-based UI where users can only toggle logical operators (`AND`/`OR`) and group tokens with brackets, preventing them from modifying the underlying filter names.
2. **Remove `eval()` Security Risk**: The `executeFilterLogic` function in `src/utils/filterLogic.js` currently relies on `eval()` to execute the query string. This must be refactored into a safe, AST-based expression evaluator or entirely replaced by the new token-based logic system.
3. **Data Flow Propagation**: Complete the connection between the newly structured filter logic and the `DatasetsSection`, ensuring that the resulting array of filtered dataset IDs correctly propagates downward to update the displayed datasets in real-time.

---

*Note: This README is a high-level overview. If you need deeper technical details on specific modules (e.g., the set-evaluation engine, the AI integration, or the deployment pipeline), please refer to the specific implementation plans or request targeted documentation.*
