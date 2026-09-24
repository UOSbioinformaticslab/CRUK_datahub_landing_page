import React, { useState, useMemo } from 'react';

const ICON_OPTS = [
    { url: "../assets/animal.webp", label: "Model Organism Study" },
    { url: "../assets/background.webp", label: "Demographics" },
    { url: "../assets/biobank.webp", label: "Samples Available" },
    { url: "../assets/invitro.webp", label: "In Vitro Study" },
    { url: "../assets/lab_results.webp", label: "Lab Results" },
    { url: "../assets/longitudinal.webp", label: "Longitudinal Study" },
    { url: "../assets/medical_imaging.webp", label: "Medical Imaging" },
    { url: "../assets/omics.webp", label: "Omics" },
    { url: "../assets/population.webp", label: "Patient Study" },
    { url: "../assets/treatments.webp", label: "Treatments" }
];
const generateMockStudies = () => {
    const titles = [
        "Genomic Profiling of Triple-Negative Breast Cancer", "AI-Driven Drug Discovery for Pancreatic Cancer",
        "Immunotherapy Response in Lung Cancer Patients", "Early Detection Biomarkers for Ovarian Cancer",
        "Personalized Radiation Therapy for Brain Tumors", "Epigenetic Modifications in Colon Cancer Progression",
        "Targeting Metabolism in Glioblastoma Multiforme", "Circulating Tumor DNA for Disease Monitoring",
        "Novel Therapies for Pediatric Leukemias", "Understanding Metastasis in Prostate Cancer"
    ];
    const institutes = [
        "Cancer Research Institute", "Global Oncology Center", "Biomedical Research Hub",
        "University Cancer Center", "National Health Institute"
    ];
    const accesses = ["Access restricted at present","Closed to access",
    "Open in response to specific calls","Open only through collaboration","Open to applicants"
    ];
    const positions = ["D", "E", "B", "C", "A"]

    const studiesData = [];

    for (let i = 1; i <= 50; i++) {
        const j = Math.floor(Math.random() * positions.length);
        const randomAccess = accesses[j]
        const randomAccessPos = positions[j]
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const randomInstitute = institutes[Math.floor(Math.random() * institutes.length)];

        // Random Dates
        const randomDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const earliestDate = new Date(Date.now() - Math.floor(Math.random() * 10 * 365 * 24 * 60 * 60 * 1000));

        // Random Population Size (10 - 40000)
        const popSize = Math.floor(Math.random() * 39991) + 10;

        // Logic to pick up to 4 unique icons at random
        const shuffledIcons = [...ICON_OPTS].sort(() => 0.5 - Math.random());
        const selectedIcons = shuffledIcons.slice(0, Math.floor(Math.random() * 5));

        studiesData.push({
            id: i,
            position: `${randomAccessPos}`,
            accessPhrase: `${randomAccess}`,
            studyTitle: `${randomTitle} (Study ${i})`,
            leadResearcherInstitute: `Dr. ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}. ${randomInstitute}`,
            populationSize: popSize,
            dateAdded: randomDate.toISOString().split('T')[0],
            dateStarted: randomDate.toISOString().split('T')[0],
            earliestData: earliestDate.toISOString().split('T')[0],
            studyIcons: selectedIcons,
            synopsis: `This dataset explores ${randomTitle} with a cohort of ${popSize} subjects. The primary focus includes analyzing longitudinal markers and response variations to established protocols. Data collection began in ${earliestDate.getFullYear()}.`
        });
    }
    return studiesData;
};

const INITIAL_STUDIES_DATA = generateMockStudies();

// --- SVG Icons Components ---

const HeartIcon = ({ filled, onClick }) => (
    <svg
        onClick={onClick}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        style={{ cursor: 'pointer', fill: filled ? '#dc3545' : 'none', stroke: filled ? '#dc3545' : '#555', strokeWidth: 2 }}
    >
        <title>{filled ? "Remove from Favourites" : "Add to Favourites"}</title>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);

const CartIcon = ({ filled, onClick }) => (
    <svg
        onClick={onClick}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        style={{ cursor: 'pointer', fill: filled ? '#007bff' : 'none', stroke: filled ? '#007bff' : '#555', strokeWidth: 2 }}
    >
        <title>{filled ? "Remove from Cart" : "Add to Cart"}</title>
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
);


// --- StudiesSection Component ---

export const StudiesSection = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeepSearch, setIsDeepSearch] = useState(false);
    const [sortConfig, setSortConfig] = useState({ column: 'dateAdded', direction: 'desc' });
    const [studies, setStudies] = useState(INITIAL_STUDIES_DATA);
    const [showSynopsis, setShowSynopsis] = useState(true);

    // State for Cart and Favourites
    const [cart, setCart] = useState([]); // Array of Study Objects
    const [favourites, setFavourites] = useState([]); // Array of IDs
    const [showCartModal, setShowCartModal] = useState(false);

    // Toggle Logic
    const toggleFavourite = (id) => {
        if (favourites.includes(id)) {
            setFavourites(favourites.filter(favId => favId !== id));
        } else {
            setFavourites([...favourites, id]);
        }
    };

    const toggleCart = (study) => {
        const isInCart = cart.find(item => item.id === study.id);
        if (isInCart) {
            setCart(cart.filter(item => item.id !== study.id));
        } else {
            setCart([...cart, study]);
        }
    };

    const filteredAndSortedStudies = useMemo(() => {
        let currentStudies = [...studies];

        // 1. Filtering
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            currentStudies = currentStudies.filter(study =>
                study.studyTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
                (isDeepSearch && study.leadResearcherInstitute.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // 2. Sorting
        currentStudies.sort((a, b) => {
            // Special handling for Favourite Sorting
            if (sortConfig.column === 'favourite') {
                const isFavA = favourites.includes(a.id);
                const isFavB = favourites.includes(b.id);
                if (isFavA === isFavB) return 0;
                if (sortConfig.direction === 'desc') {
                    return isFavA ? 1 : -1;
                } else {
                    return isFavA ? -1 : 1;
                }
            }

            const valA = a[sortConfig.column];
            const valB = b[sortConfig.column];

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return currentStudies;
    }, [studies, searchTerm, isDeepSearch, sortConfig, favourites]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSort = (column) => {
        setSortConfig(prevConfig => ({
            column,
            direction: prevConfig.column === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleDownloadMetadata = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cart, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "studies_metadata.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const getSortIndicator = (column) => {
        if (sortConfig.column === column) {
            return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
        }
        return '';
    };

    const style = { fontSize: '1.3rem' };

    return (
        <div style={style}>
            <style>{`
                /* Container for the image and the tooltip */
                .icon-container {
                    position: relative;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1;
                }

                .icon-container:hover {
                    z-index: 9999;
                }

                /* Tooltip Box - White Text on Blue Background */
                .custom-tooltip {
                    visibility: hidden;
                    background-color: #0056b3; /* Darker Blue */
                    color: #ffffff;            /* White Text */
                    text-align: center;
                    padding: 6px 12px;
                    border-radius: 6px;
                    position: absolute;
                    z-index: 10000;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.9rem;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                    box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
                }

                /* Arrow pointing down - matches Blue background */
                .custom-tooltip::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #0056b3 transparent transparent transparent;
                }

                .custom-tooltip.large {
                    white-space: normal;      /* Overrides nowrap to allow wrapping */
                    width: 300px;             /* Sets a fixed width for the box */
                    line-height: 1.4;         /* Improves readability for multi-line text */
                    text-align: left;         /* Better for longer descriptive text */
                    padding: 10px 15px;       /* Increased padding for the larger content */
                    font-size: 1.1rem;        /* Slightly larger font for clarity */
                }
                .icon-container:hover .custom-tooltip {
                    visibility: visible;
                    opacity: 1;
                }

                .studies-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .studies-table th {
                    white-space: nowrap;
                    padding: 12px;
                    text-align: left;
                    background-color: #e9ecef;
                    cursor: pointer;
                    border-bottom: 2px solid #ccc;
                    position: sticky;
                    top: 0;
                    z-index: 500;
                }

                .studies-table td {
                    padding: 10px 12px;
                }

                .study-title-row {
                    background-color: #fff;
                    border-top: 2px solid #888;
                    position: relative;
                }

                .study-data-row {
                    background-color: #fcfcfc;
                }

                .synopsis-row td {
                    background-color: #f8f9fa;
                    color: #555;
                    font-style: italic;
                    padding: 10px 20px;
                    border-bottom: 1px solid #ddd;
                    font-size: 1.1rem;
                }

                .controls-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    align-items: center;
                    margin-bottom: 20px;
                    background: #f1f1f1;
                    padding: 15px;
                    border-radius: 8px;
                    position: relative;
                }

                .cart-container {
                    position: relative;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    font-size: 1.5rem;
                }
                .cart-badge {
                    background-color: #d9534f;
                    color: white;
                    border-radius: 50%;
                    padding: 2px 8px;
                    font-size: 0.9rem;
                    position: absolute;
                    top: -5px;
                    right: -10px;
                    font-weight: bold;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 20000;
                }
                .modal-content {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 500px;
                    max-width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }

                .action-btn-group {
                    display: flex;
                    gap: 15px;
                    margin-right: 20px;
                }

                /* Study Title Link Styling */
                .study-title-link {
                    font-size: 1.4rem;
                    font-weight: bold;
                    margin-right: 20px;
                    color: #0056b3;
                    text-decoration: none;
                }
                .study-title-link:hover {
                    text-decoration: underline;
                }

                /* Explicit "Clickable" Expand/Collapse Button */
                .expand-collapse-btn {
                    background: none;
                    border: none;
                    color: #0056b3;
                    font-size: 1.1rem;
                    font-weight: bold;
                    text-decoration: underline;
                    cursor: pointer;
                    padding: 10px 20px;
                    transition: color 0.2s;
                }
                .expand-collapse-btn:hover {
                    color: #003060;
                    background-color: #eef;
                    border-radius: 4px;
                }
            `}</style>

            {/* Main Heading */}


            <section className="studies-section">

                <h2 class="p-4 text-3xl sm:text-4xl font-bold text-[var(--cruk-blue)] sm:pr-8 sm:w-1/4 flex items-center border-b sm:border-b-0 sm:border-r border-gray-200">Studies</h2>
                {/* Controls Area */}
                <div className="controls-container">
                    <div>
                        <input
                            type="search"
                            placeholder="Search studies..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{ padding: '10px', fontSize: '1.1rem', width: '300px' }}
                        />
                    </div>

                    <div className="icon-container" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            id="deep_search"
                            checked={isDeepSearch}
                            onChange={(e) => setIsDeepSearch(e.target.checked)}
                            style={{
                                transform: "scale(1.5)",
                                marginRight: "10px",
                                marginLeft: "20px",
                                cursor: 'pointer'
                            }}
                        />
                        <label htmlFor="deep_search" style={{ cursor: 'pointer' }}>
                            Deep Search
                        </label>
                        <span className="custom-tooltip large">
                            Deep Search scans for close matches in the abstract, keywords,
                            description, title, concepts from data enrichment, and Data
                            Custodian for each study.
                        </span>
                    </div>

                    {/* Sort Dropdown */}
                    <div>
                        <label style={{ marginRight: '10px' }}>Sort by:</label>
                        <select
                            onChange={(e) => handleSort(e.target.value)}
                            value={sortConfig.column}
                            style={{ padding: '8px', fontSize: '1rem' }}
                        >
                            <option value="favourite">Favourites</option>
                            <option value="dateAdded">Updated Date</option>
                            <option value="studyTitle">Study Title</option>
                            <option value="leadResearcherInstitute">Lead Researcher</option>
                            <option value="populationSize">Population Size</option>
                            <option value="position">Accessibility</option>
                            <option value="earliestData">Earliest Data</option>
                            <option value="dateStarted">Start Date</option>
                        </select>
                    </div>

                    {/* Explicitly Clickable Expand/Collapse Text */}
                    <div>
                        <button
                            className="expand-collapse-btn"
                            onClick={() => setShowSynopsis(!showSynopsis)}
                        >
                            {showSynopsis ? "Collapse Synopses" : "Expand Synopses"}
                        </button>
                    </div>
                </div>

                {/* Cart Modal */}
                {showCartModal && (
                    <div className="modal-overlay" onClick={() => setShowCartModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h3>Your Cart ({cart.length})</h3>
                            {cart.length === 0 ? (
                                <p>Your cart is empty.</p>
                            ) : (
                                <ul style={{ marginBottom: '20px' }}>
                                    {cart.map(item => (
                                        <li key={item.id} style={{ marginBottom: '8px' }}>
                                            {item.studyTitle}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => setShowCartModal(false)} style={{ padding: '8px 16px' }}>Close</button>
                                {cart.length > 0 && (
                                    <button
                                        onClick={handleDownloadMetadata}
                                        style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Download Metadata
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="studies-table-container">
                    <table className="studies-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('leadResearcherInstitute')}>
                                    Lead Researcher <span className="sort-indicator">{getSortIndicator('leadResearcherInstitute')}</span>
                                </th>
                                <th onClick={() => handleSort('populationSize')}>
                                    Pop. Size <span className="sort-indicator">{getSortIndicator('populationSize')}</span>
                                </th>
                                <th onClick={() => handleSort('position')}>
                                    Accessibility <span className="sort-indicator">{getSortIndicator('accessPhrase')}</span>
                                </th>
                                <th onClick={() => handleSort('earliestData')}>
                                    Earliest Data <span className="sort-indicator">{getSortIndicator('earliestData')}</span>
                                </th>
                                <th onClick={() => handleSort('dateStarted')}>
                                    Start Date <span className="sort-indicator">{getSortIndicator('dateStarted')}</span>
                                </th>
                                <th onClick={() => handleSort('dateAdded')}>
                                    Updated <span className="sort-indicator">{getSortIndicator('dateAdded')}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedStudies.map(study => {
                                const isFav = favourites.includes(study.id);
                                const isInCart = cart.some(c => c.id === study.id);

                                return (
                                <React.Fragment key={study.id}>

                                    {/* LINE 1: Actions (Icons), Title, Indicators */}
                                    <tr className="study-title-row">
                                        <td colSpan="6" style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>

                                                {/* Action Buttons (Icons) */}
                                                <div className="action-btn-group">
                                                    <HeartIcon
                                                        filled={isFav}
                                                        onClick={() => toggleFavourite(study.id)}
                                                    />
                                                    <CartIcon
                                                        filled={isInCart}
                                                        onClick={() => toggleCart(study)}
                                                    />
                                                </div>

                                                {/* Title Link */}
                                                <a href={`/src/meta?id=${study.id}`} className="study-title-link">
                                                    {study.studyTitle}
                                                </a>

                                                {/* Indicators/Icons */}
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {study.studyIcons.map((icon, idx) => (
                                                        <div key={idx} className="icon-container">
                                                            <img
                                                                src={icon.url}
                                                                alt={icon.label}
                                                                style={{
                                                                    height: '1.5em',
                                                                    width: 'auto',
                                                                    cursor: 'help',
                                                                    display: 'block'
                                                                }}
                                                            />
                                                            <span className="custom-tooltip">{icon.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* LINE 2: Summary Information */}
                                    <tr className="study-data-row">
                                        <td>{study.leadResearcherInstitute}</td>
                                        <td>{study.populationSize.toLocaleString()}</td>
                                        <td>{study.accessPhrase}</td>
                                        <td>{study.earliestData}</td>
                                        <td>{study.dateStarted}</td>
                                        <td>{study.dateAdded}</td>
                                    </tr>

                                    {/* LINE 3: Synopsis */}
                                    {showSynopsis && (
                                        <tr className="synopsis-row">
                                            <td colSpan="6">
                                                <strong>Synopsis: </strong> {study.synopsis}
                                            </td>
                                        </tr>
                                    )}

                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};