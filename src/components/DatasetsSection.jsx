import React, { useState, useEffect, useMemo } from 'react';
import { extractMetadataConstants } from '../utils/metadataUtils';
import { executeFilterLogic } from '../utils/filterLogic.js';
import { getDatasetUrl } from '../utils/urlUtils';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


// --- Helper Component for Blanks ---
const CellValue = ({ value, isBoolean }) => {
    if (value === null || value === undefined || value === "") {
        return <span style={{ color: 'grey' }}>Not given</span>;
    }
    if (isBoolean) {
        return value ? "True" : "False";
    }
    return value;
};

// --- DatasetsSection Component ---
export const DatasetsSection = ({ custodianFilter }) => {
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeepSearch, setIsDeepSearch] = useState(false);
    const [sortConfig, setSortConfig] = useState({ column: 'title', direction: 'asc' });
    const [showSynopsis, setShowSynopsis] = useState(true);
    const [activeFilterTokens, setActiveFilterTokens] = useState(null);

    const [cart, setCart] = useState([]);
    const [favourites, setFavourites] = useState([]);
    const [showCartModal, setShowCartModal] = useState(false);

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                // Assuming standard /datasets endpoint. Adjust path as necessary.
                const response = await fetch(`${API_BASE_URL}/datasets/`);
                if (!response.ok) throw new Error("Failed to fetch");

                const data = await response.json();

                // Process the metadata blob into flat properties for sorting and rendering
                const processedData = data.map(record => {
                    const extracted = extractMetadataConstants(record);
                    return {
                        id: record.id || crypto.randomUUID(),
                        ...extracted,
                        rawData: record
                    };
                });

                setDatasets(processedData);
            } catch (error) {
                console.error("Error fetching datasets:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDatasets();
    }, []);

    useEffect(() => {
        const handleApplyFilter = (e) => {
            const payload = e.detail?.tokens !== undefined ? e.detail.tokens : e.detail;
            setActiveFilterTokens(payload);
        };
        window.addEventListener('apply-dataset-filters', handleApplyFilter);
        return () => window.removeEventListener('apply-dataset-filters', handleApplyFilter);
    }, []);

    const toggleFavourite = (id) => {
        if (favourites.includes(id)) {
            setFavourites(favourites.filter(favId => favId !== id));
        } else {
            setFavourites([...favourites, id]);
        }
    };

    const toggleCart = (dataset) => {
        const isInCart = cart.find(item => item.id === dataset.id);
        if (isInCart) {
            setCart(cart.filter(item => item.id !== dataset.id));
        } else {
            setCart([...cart, dataset]);
        }
    };

    const filteredAndSortedDatasets = useMemo(() => {
        let currentDatasets = [...datasets];

        if (custodianFilter) {
            const lowerFilter = "cancer research horizons";
            const shortFilter = "crh";
            currentDatasets = currentDatasets.filter(dataset => {
                const cust = (dataset.datasetCustodian || "").toLowerCase();
                return cust.includes(lowerFilter) || cust.includes(shortFilter);
            });
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            currentDatasets = currentDatasets.filter(dataset =>
                (dataset.title && dataset.title.toLowerCase().includes(lower)) ||
                (isDeepSearch && dataset.abstract && dataset.abstract.toLowerCase().includes(lower)) ||
                (isDeepSearch && dataset.leadResearcher && dataset.leadResearcher.toLowerCase().includes(lower))
            );
        }

        if (activeFilterTokens && activeFilterTokens.length > 0) {
            const results = executeFilterLogic(activeFilterTokens, datasets);
            if (results.success) {
                const matchingIds = new Set(results.studies);
                currentDatasets = currentDatasets.filter(dataset => {
                    const id = dataset.rawData?.datasetid || dataset.id.toString();
                    return matchingIds.has(id);
                });
            } else {
                // If parsing fails or returns no success, show none
                currentDatasets = [];
            }
        }

        currentDatasets.sort((a, b) => {
            if (sortConfig.column === 'favourite') {
                const isFavA = favourites.includes(a.id);
                const isFavB = favourites.includes(b.id);
                if (isFavA === isFavB) return 0;
                return sortConfig.direction === 'desc' ? (isFavA ? 1 : -1) : (isFavA ? -1 : 1);
            }

            const valA = a[sortConfig.column] || "";
            const valB = b[sortConfig.column] || "";

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return currentDatasets;
    }, [datasets, searchTerm, isDeepSearch, sortConfig, favourites, custodianFilter, activeFilterTokens]);

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
        downloadAnchorNode.setAttribute("download", "datasets_metadata.json");
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
                .datasets-table { width: 100%; border-collapse: collapse; }
                .datasets-table th { white-space: nowrap; padding: 12px; text-align: left; background-color: #e9ecef; cursor: pointer; border-bottom: 2px solid #ccc; position: sticky; top: 0; z-index: 500; }
                .datasets-table td { padding: 10px 12px; }
                .dataset-title-row { background-color: #fff; border-top: 2px solid #888; position: relative; }
                .dataset-data-row { background-color: #fcfcfc; }
                .synopsis-row td { background-color: #f8f9fa; color: #555; font-style: italic; padding: 10px 20px; border-bottom: 1px solid #ddd; font-size: 1.1rem; }
                .controls-container { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 20px; background: #f1f1f1; padding: 15px; border-radius: 8px; position: relative; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 20000; }
                .modal-content { background: white; padding: 20px; border-radius: 8px; width: 500px; max-width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .action-btn-group { display: flex; gap: 15px; margin-right: 20px; }
                .dataset-title-link { font-size: 1.4rem; font-weight: bold; margin-right: 20px; color: #0056b3; text-decoration: none; }
                .dataset-title-link:hover { text-decoration: underline; }
                .expand-collapse-btn { background: none; border: none; color: #0056b3; font-size: 1.1rem; font-weight: bold; text-decoration: underline; cursor: pointer; padding: 10px 20px; transition: color 0.2s; }
                .expand-collapse-btn:hover { color: #003060; background-color: #eef; border-radius: 4px; }
            `}</style>
            <main className="datasets-section">
                {activeFilterTokens && (
                    <div className="mt-4 flex items-center justify-between bg-pink-50 p-2 rounded border border-pink-200">
                        <span className="text-pink-800 text-sm font-semibold">
                            ⚠️ Showing filtered results ({filteredAndSortedDatasets.length} studies)
                        </span>
                        <div className="flex items-center">
                            <button onClick={() => setActiveFilterTokens(null)} className="text-pink-800 hover:text-pink-900 font-bold hover:underline transition-colors px-2 py-1 rounded">Clear Filters</button>
                        </div>
                    </div>
                )}
                <div className="controls-container">
                    <div>
                        <input
                            type="search"
                            placeholder="Search datasets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px', fontSize: '1.1rem', width: '300px' }}
                        />
                    </div>
                    <div>
                        <label style={{ marginRight: '10px' }}>Sort by:</label>
                        <select
                            onChange={(e) => handleSort(e.target.value)}
                            value={sortConfig.column}
                            style={{ padding: '8px', fontSize: '1rem' }}
                        >
                            <option value="favourite">Favourites</option>
                            <option value="title">dataset Title</option>
                            <option value="leadResearcher">Lead Researcher</option>
                            <option value="popSize">Population Size</option>
                            <option value="accessibility">Accessibility</option>
                            <option value="dataRange">Data Range</option>
                        </select>
                    </div>
                    <div>
                        <button className="expand-collapse-btn" onClick={() => setShowSynopsis(!showSynopsis)}>
                            {showSynopsis ? "Collapse Synopses" : "Expand Synopses"}
                        </button>
                    </div>
                </div>

                {showCartModal && (
                    <div className="modal-overlay" onClick={() => setShowCartModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h3>Your Cart ({cart.length})</h3>
                            {cart.length === 0 ? <p>Your cart is empty.</p> : (
                                <ul style={{ marginBottom: '20px' }}>
                                    {cart.map(item => <li key={item.id} style={{ marginBottom: '8px' }}>{item.title}</li>)}
                                </ul>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => setShowCartModal(false)} style={{ padding: '8px 16px' }}>Close</button>
                                {cart.length > 0 && (
                                    <button onClick={handleDownloadMetadata} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        Download Metadata
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="datasets-table-container">
                    {isLoading ? (
                        <p>Loading datasets...</p>
                    ) : (
                        <table className="datasets-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button className="w-full text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onClick={() => handleSort('leadResearcher')}>
                                            Lead Researcher <span className="sort-indicator">{getSortIndicator('leadResearcher')}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button className="w-full text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onClick={() => handleSort('popSize')}>
                                            Pop. Size <span className="sort-indicator">{getSortIndicator('popSize')}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button className="w-full text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onClick={() => handleSort('accessibility')}>
                                            Accessibility <span className="sort-indicator">{getSortIndicator('accessibility')}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button className="w-full text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onClick={() => handleSort('nonCommercialUseOnly')}>
                                            Non-Commercial Use Only <span className="sort-indicator">{getSortIndicator('nonCommercialUseOnly')}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button className="w-full text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" onClick={() => handleSort('dataRange')}>
                                            Data Range <span className="sort-indicator">{getSortIndicator('dataRange')}</span>
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedDatasets.map(dataset => {
                                    const isFav = favourites.includes(dataset.id);
                                    const isInCart = cart.some(c => c.id === dataset.id);

                                    return (
                                        <React.Fragment key={dataset.id}>
                                            {/* LINE 1: Actions, Title */}
                                            <tr className="dataset-title-row">
                                                <td colSpan="5" style={{ padding: '15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <a href={getDatasetUrl(dataset.id)} className="dataset-title-link">
                                                            <CellValue value={dataset.title} />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* LINE 2: Summary Information */}
                                            <tr className="dataset-data-row">
                                                <td><CellValue value={dataset.leadResearcher} /></td>
                                                <td><CellValue value={dataset.popSize} /></td>
                                                <td><CellValue value={dataset.accessibility} /></td>
                                                <td><CellValue value={dataset.nonCommercialUseOnly}  /></td>
                                                <td><CellValue value={dataset.dataRange} /></td>
                                            </tr>

                                            {/* LINE 3: Synopsis */}
                                            {showSynopsis && (
                                                <tr className="synopsis-row">
                                                    <td colSpan="5">
                                                        <strong>Synopsis: </strong> <CellValue value={dataset.abstract} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};