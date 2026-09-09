import React, { useState, useEffect } from 'react';
import SignInModal from './SignInModal.jsx';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';
import { ManageTeamModal } from './ManageTeamModal.jsx';
import { InvitationsModal } from './InvitationsModal.jsx';
import { DataCustodiansModal } from './DataCustodiansModal.jsx';
import ChatWidget from './ChatWidget.jsx';
import "../styles/style.css"

export const Header = () => {
    const [userName, setUserName] = useState(null);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [userTeams, setUserTeams] = useState([]);
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [isDataDropdownOpen, setIsDataDropdownOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isManageTeamModalOpen, setIsManageTeamModalOpen] = useState(false);
    const [manageTeamModalMode, setManageTeamModalMode] = useState('members');
    const [isDataCustodiansModalOpen, setIsDataCustodiansModalOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);
    const [isTourDropdownOpen, setIsTourDropdownOpen] = useState(false);

    useEffect(() => {
        const storedName = localStorage.getItem('userName');
        if (storedName) {
            setUserName(storedName);
        }
        const storedTeams = localStorage.getItem('userTeams');
        if (storedTeams) {
            setUserTeams(JSON.parse(storedTeams));
        }
        const storedActiveTeam = localStorage.getItem('activeTeamId');
        if (storedActiveTeam) {
            setActiveTeamId(storedActiveTeam);
        }
        const storedIsAdmin = localStorage.getItem('isAdmin');
        if (storedIsAdmin === 'true') {
            setIsAdmin(true);
        }
    }, []);

    const handleTeamChange = (e) => {
        const newTeamId = e.target.value;
        setActiveTeamId(newTeamId);
        localStorage.setItem('activeTeamId', newTeamId);
        window.location.reload(); // Refresh to update context
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('teamId');
        localStorage.removeItem('activeTeamId');
        localStorage.removeItem('userTeams');
        localStorage.removeItem('isAdmin');
        setUserName(null);
        setIsAdmin(false);
        window.location.reload();
    };

    const handleLoginSuccess = (user) => {
        setUserName(user.name);
        
        const storedTeams = localStorage.getItem('userTeams');
        if (storedTeams) {
            setUserTeams(JSON.parse(storedTeams));
        }
        const storedActiveTeam = localStorage.getItem('activeTeamId');
        if (storedActiveTeam) {
            setActiveTeamId(storedActiveTeam);
        }
        
        if (user.is_admin) {
            setIsAdmin(true);
        }
        
        setIsSignInModalOpen(false);
        window.dispatchEvent(new Event('authChange'));
    };

    const logoStyle = {
        width: 'auto',
        height: 'auto',
    };

    const titleStyle = {
        fontSize: '2rem',
        fontWeight: '900',
        textDecoration: 'none',
        color: 'inherit',
        display: 'inline-block'
    };

    return (
        <>
        <header className="main-header p-2 sm:p-8 bg-gray-50">
            <div className="banner">
                <div className="logo-placeholder">
                    <p>
                        <a href="https://www.cancerresearchuk.org/">
                            <img src="../assets/cruk-logo.svg" alt="CRUK Logo" style={logoStyle} />
                        </a>
                    </p>
                </div>

                <a href="./dashboard.html" style={titleStyle}>
                    <h1 className="strap-line">CRUK Data Hub</h1>
                </a>

                <div className="header-buttons flex items-center space-x-4">
                    <a href="https://fdm2p6.csb.app/">
                        <button className="btn">Help</button>
                    </a>
                    {!userName ? (
                        <button className="btn" onClick={() => setIsSignInModalOpen(true)}>Sign In / Register</button>
                    ) : (
                        <>
                            <button className="btn" style={{backgroundColor: '#6b7280'}} onClick={handleLogout}>Sign out</button>
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Welcome, <strong>{userName}</strong></span>
                            {userTeams.length > 0 && (
                                <select 
                                    value={activeTeamId || ''} 
                                    onChange={handleTeamChange}
                                    className="p-1 border border-gray-300 rounded text-sm bg-white text-black cursor-pointer shadow-sm focus:outline-none focus:border-[var(--cruk-darkblue)]"
                                >
                                    {userTeams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}
                </div>
            </div>

            <SignInModal 
                isOpen={isSignInModalOpen} 
                onClose={() => setIsSignInModalOpen(false)} 
                onLoginSuccess={handleLoginSuccess} 
            />

            <ChangePasswordModal 
                isOpen={isChangePasswordModalOpen} 
                onClose={() => setIsChangePasswordModalOpen(false)} 
            />

            <ManageTeamModal
                isOpen={isManageTeamModalOpen}
                mode={manageTeamModalMode}
                onClose={() => setIsManageTeamModalOpen(false)}
                activeTeamId={activeTeamId}
                userTeams={userTeams}
            />

            <DataCustodiansModal
                isOpen={isDataCustodiansModalOpen}
                onClose={() => setIsDataCustodiansModalOpen(false)}
            />

            <InvitationsModal userName={userName} />

            <nav className="thin-navbar">
                <ul>
                    <li><a href="./about.html">About</a></li>
                    <li>
                        <a href="https://www.cancerresearchuk.org/funding-for-researchers/research-opportunities-in-data-science">
                            CRUK Data Strategy
                        </a>
                    </li>
                    <li><a href="./protect_data.html">How we protect your data</a></li>

                    {isAdmin && (
                        <li>
                            <a href="./manage_hub.html" className="nav-link-main font-bold text-red-300">
                                Manage the hub
                            </a>
                        </li>
                    )}

                    <li 
                        className="relative"
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                setIsTourDropdownOpen(false);
                            }
                        }}
                    >
                        <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); setIsTourDropdownOpen(!isTourDropdownOpen); }}
                            className="nav-link-main font-bold text-yellow-300 flex items-center bg-pink-700/60 hover:bg-pink-700 px-2 py-0.5 rounded transition"
                        >
                            Interactive Guided Tour <span className="ml-1 text-xs">▼</span>
                        </a>
                        {isTourDropdownOpen && (
                            <ul className="absolute left-0 mt-2 w-72 bg-white shadow-2xl border border-gray-200 rounded-md py-1.5 z-[100] text-left">
                                <li>
                                    <a 
                                        href="#" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsTourDropdownOpen(false);
                                            window.dispatchEvent(new CustomEvent('startGuidedTour', { detail: { tourId: 'simple_filters' } }));
                                        }}
                                        className="block px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                                        style={{ color: '#103067' }}
                                    >
                                        🟢 Simple Filters Demonstration
                                    </a>
                                </li>
                                <li className="border-t border-gray-100 my-1"></li>
                                <li>
                                    <a 
                                        href="#" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsTourDropdownOpen(false);
                                            window.dispatchEvent(new CustomEvent('startGuidedTour', { detail: { tourId: 'advanced_filters' } }));
                                        }}
                                        className="block px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                                        style={{ color: '#103067' }}
                                    >
                                        ⚡ Advanced Filters & Logic Demonstration
                                    </a>
                                </li>
                            </ul>
                        )}
                    </li>

                    {!userName ? (
                        <>
                            <li>
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setIsDataCustodiansModalOpen(true); }}
                                    className="nav-link-main font-bold text-yellow-300"
                                >
                                    Data Custodians
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="./schema_doc.html" 
                                    className="nav-link-main font-bold text-yellow-300"
                                >
                                    Schema Docs
                                </a>
                            </li>
                        </>
                    ) : (
                        <li 
                            className="relative"
                            onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                    setIsDataDropdownOpen(false);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsDataDropdownOpen(false);
                                }
                            }}
                        >
                            <a 
                                href="#" 
                                className="nav-link-main font-bold text-yellow-300 flex items-center"
                                onClick={(e) => { e.preventDefault(); setIsDataDropdownOpen(!isDataDropdownOpen); }}
                            >
                                Data Custodian Actions <span className="ml-1 text-xs">▼</span>
                            </a>
                            {isDataDropdownOpen && (() => {
                                const activeTeam = userTeams.find(t => t.id.toString() === activeTeamId?.toString());
                                const isTeamAdmin = activeTeam ? activeTeam.is_team_admin : false;
                                return (
                                <ul className="absolute left-0 mt-2 w-64 bg-white shadow-xl border border-gray-200 rounded-md py-2 z-50" style={{ display: 'block' }}>
                                    <li>
                                        <a href="./team_request.html" className="block px-4 py-2 text-sm font-medium !text-blue-600 hover:bg-blue-50">Register a new Data Custodian</a>
                                    </li>
                                    {activeTeamId && (
                                        <>
                                            <li className="border-t border-gray-200 my-1"></li>
                                            {isTeamAdmin && (
                                                <>
                                                    <li><a href="#" onClick={(e) => { e.preventDefault(); setManageTeamModalMode('members'); setIsManageTeamModalOpen(true); setIsDataDropdownOpen(false); }} className="block px-4 py-2 text-sm font-medium !text-blue-600 hover:bg-blue-50">Manage the Team</a></li>
                                                    <li><a href="#" onClick={(e) => { e.preventDefault(); setManageTeamModalMode('notifications'); setIsManageTeamModalOpen(true); setIsDataDropdownOpen(false); }} className="block px-4 py-2 text-sm font-medium !text-blue-600 hover:bg-blue-50">View Notifications</a></li>
                                                    <li className="border-t border-gray-200 my-1 pt-1"></li>
                                                </>
                                            )}
                                            <li>
                                                <a href="#" onClick={(e) => { e.preventDefault(); setIsUploadExpanded(!isUploadExpanded); }} className="w-full flex justify-between items-center px-4 py-2 text-sm font-medium !text-blue-600 hover:bg-blue-50">
                                                    <span>Upload info</span>
                                                    <span>{isUploadExpanded ? '▲' : '▼'}</span>
                                                </a>
                                                {isUploadExpanded && (
                                                    <ul className="bg-gray-50 border-y border-gray-200 py-1 !flex !flex-col w-full">
                                                        <li className="w-full"><a href="./upload.html" className="block w-full px-8 py-2 text-sm !text-blue-600 hover:bg-blue-100">Upload dataset</a></li>
                                                        <li className="w-full"><a href="./upload_project.html" className="block w-full px-8 py-2 text-sm !text-blue-600 hover:bg-blue-100">Upload project</a></li>
                                                        <li className="w-full"><a href="./upload_publications.html" className="block w-full px-8 py-2 text-sm !text-blue-600 hover:bg-blue-100">Upload and link a publication</a></li>
                                                        <li className="w-full"><a href="./upload_tool.html" className="block w-full px-8 py-2 text-sm !text-blue-600 hover:bg-blue-100">Upload and link a tool</a></li>
                                                    </ul>
                                                )}
                                            </li>
                                        </>
                                    )}
                                    <li className="border-t border-gray-200 mt-2 pt-2">
                                        <a 
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); setIsChangePasswordModalOpen(true); setIsDataDropdownOpen(false); }} 
                                            className="block w-full text-left px-4 py-2 text-sm font-medium !text-blue-600 hover:bg-blue-50"
                                        >
                                            Change my Password
                                        </a>
                                    </li>
                                </ul>
                                );
                            })()}
                        </li>
                    )}
                </ul>
            </nav>
        </header>
        <ChatWidget />
        </>
    );
};