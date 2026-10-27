import React, { useState, useEffect } from 'react';
import { ErrorLogsTab } from './ErrorLogsTab.jsx';
import { AdminAnalyticsTab } from './AdminAnalyticsTab.jsx';
import FilterTelemetryTab from './FilterTelemetryTab.jsx';
import FocusLock from 'react-focus-lock';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";



export const ManageHub = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [userTeamLinks, setUserTeamLinks] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [enquiriesSortField, setEnquiriesSortField] = useState('created_at');
    const [enquiriesSortOrder, setEnquiriesSortOrder] = useState('desc');
    const [enquiriesCurrentPage, setEnquiriesCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Auth context
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // Forms state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRepeatPassword, setNewUserRepeatPassword] = useState('');
    const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Linking state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');

    // Delete Modals state
    const [teamToDelete, setTeamToDelete] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Enquiry Modal State
    const [viewEnquiry, setViewEnquiry] = useState(null);

    // Change Password state (Admin)
    const [userToChangePassword, setUserToChangePassword] = useState(null);
    const [adminNewPassword, setAdminNewPassword] = useState('');
    const [adminNewPasswordRepeat, setAdminNewPasswordRepeat] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    // Search state
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        if (!isAdmin || !token) return;
        fetchData();
    }, [isAdmin, token]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const MIDDLELAYER_URL = import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002";
            const headers = { 'Authorization': `Bearer ${token}` };
            const [usersRes, teamsRes, invRes, linksRes, enqRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/users`, { headers }),
                fetch(`${API_BASE_URL}/admin/teams`, { headers }),
                fetch(`${API_BASE_URL}/admin/invitations`, { headers }),
                fetch(`${API_BASE_URL}/admin/user_team_links`, { headers }),
                fetch(`${MIDDLELAYER_URL}/admin/enquiries`, { headers })
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            
            let fetchedTeams = [];
            if (teamsRes.ok) {
                fetchedTeams = await teamsRes.json();
                setTeams(fetchedTeams);
            }
            
            if (invRes.ok) setInvitations(await invRes.json());
            if (linksRes.ok) setUserTeamLinks(await linksRes.json());
            
            if (enqRes.ok) {
                const enqData = await enqRes.json();
                const enqWithTeams = enqData.map(enq => ({
                    ...enq,
                    team_name: fetchedTeams.find(t => t.id === enq.team_id)?.name || `Team ${enq.team_id}`
                }));
                setEnquiries(enqWithTeams);
            }
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (msg, isError = false) => {
        if (isError) setError(msg);
        else setSuccess(msg);
        setTimeout(() => { setError(''); setSuccess(''); }, 4000);
    };

    // --- USER MANAGEMENT ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (newUserPassword !== newUserRepeatPassword) {
            return showMessage("Passwords do not match", true);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: newUserEmail, name: newUserName, password: newUserPassword, is_admin: newUserIsAdmin })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create user');

            showMessage('User created successfully!');
            setNewUserEmail(''); setNewUserName(''); setNewUserPassword(''); setNewUserRepeatPassword(''); setNewUserIsAdmin(false);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete user');

            showMessage('User deleted successfully!');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setUserToDelete(null);
            setDeleteConfirmText('');
        }
    };

    const handleToggleAdmin = async (userId, currentStatus) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_admin: !currentStatus })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update admin status');
            showMessage(`Admin status updated successfully!`);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleAdminChangePassword = async (e) => {
        e.preventDefault();
        if (!userToChangePassword) return;
        if (adminNewPassword !== adminNewPasswordRepeat) {
            return showMessage("Passwords do not match", true);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userToChangePassword.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ new_password: adminNewPassword })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to change password');

            showMessage(`Password changed successfully for ${userToChangePassword.name}!`);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setUserToChangePassword(null);
            setAdminNewPassword('');
            setAdminNewPasswordRepeat('');
            setShowAdminPassword(false);
        }
    };

    // --- TEAM MANAGEMENT ---
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            // Note: team creation uses query parameters in basic_backend
            const res = await fetch(`${API_BASE_URL}/admin/teams?name=${encodeURIComponent(newTeamName)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create team');

            showMessage('Team created successfully!');
            setNewTeamName('');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const confirmDeleteTeam = async (deleteProjects) => {
        if (!teamToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/teams/${teamToDelete.id}?delete_projects=${deleteProjects}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete team');

            showMessage(`Team deleted successfully (Projects wiped: ${deleteProjects})!`);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setTeamToDelete(null);
        }
    };

    // --- LINK MANAGEMENT ---
    const handleLinkUserToTeam = async (e) => {
        e.preventDefault();
        if (!selectedUserId || !selectedTeamId) return showMessage('Please select both a user and a team', true);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${selectedUserId}/teams/${selectedTeamId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to link user to team');

            showMessage('User successfully linked to team!');
            setSelectedUserId(''); setSelectedTeamId('');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleUnlink = async (userId, teamId) => {
        if (!window.confirm("Are you sure you want to unlink this user from this team?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/teams/${teamId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to unlink user');

            showMessage('User unlinked from team successfully!');
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleToggleTeamAdmin = async (userId, teamId, currentStatus) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/teams/${teamId}/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_admin: !currentStatus })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update team admin status');
            showMessage(`Team Admin status updated successfully!`);
            fetchData();
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    if (!isAdmin) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                <p>You must be an administrator to view this page.</p>
            </div>
        );
    }

    return (
        <main className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md mb-20">
            <h1 className="text-3xl font-bold mb-6 text-[var(--cruk-darkblue)] border-b pb-4">Manage the Hub</h1>

            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded">{success}</div>}

            {/* TABS */}
            <div role="tablist" className="flex border-b mb-6 overflow-x-auto">
                <button role="tab" aria-selected={activeTab === 'users'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('users')}>Users</button>
                <button role="tab" aria-selected={activeTab === 'teams'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'teams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('teams')}>Teams</button>
                <button role="tab" aria-selected={activeTab === 'links'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'links' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('links')}>User-Team Links</button>
                <button role="tab" aria-selected={activeTab === 'notifications'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'notifications' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('notifications')}>Notifications</button>
                <button role="tab" aria-selected={activeTab === 'errors'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'errors' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('errors')}>Error Logs</button>
                <button role="tab" aria-selected={activeTab === 'analytics'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'analytics' ? 'border-b-2 border-[#E40085] text-[#E40085]' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('analytics')}>AI Analytics</button>
                <button role="tab" aria-selected={activeTab === 'filter-telemetry'} className={`py-2 px-6 font-medium whitespace-nowrap ${activeTab === 'filter-telemetry' ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('filter-telemetry')}>Filter Telemetry</button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Loading data...</div>
            ) : (
                <>
                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
                                <h3 className="text-xl font-bold mb-4">Create New User</h3>
                                <form onSubmit={handleCreateUser} autoComplete="off">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input type="text" required autoComplete="off" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input type="email" required autoComplete="off" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm" />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input type={showPassword ? "text" : "password"} required autoComplete="new-password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm pr-10" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-8 text-gray-500 hover:text-gray-700 font-bold px-2">
                                                {showPassword ? "👁️‍🗨️" : "👁️"}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
                                            <input type={showPassword ? "text" : "password"} required autoComplete="new-password" value={newUserRepeatPassword} onChange={e => setNewUserRepeatPassword(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm pr-10" />
                                        </div>
                                    </div>
                                    <div className="mb-6 flex items-center">
                                        <input
                                            type="checkbox"
                                            id="new_user_admin"
                                            checked={newUserIsAdmin}
                                            onChange={e => setNewUserIsAdmin(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="new_user_admin" className="ml-2 block text-sm text-gray-900 font-medium">
                                            Grant Administrator Privileges
                                        </label>
                                    </div>
                                    <button type="submit" className="btn py-2 px-6 bg-blue-600 text-white rounded font-medium shadow">Create User</button>
                                </form>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">All Users</h3>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    className="p-2 border border-gray-400 rounded-md bg-white w-64 shadow-sm"
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border">
                                    <thead>
                                        <tr className="bg-gray-100 text-left border-b">
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Teams</th>
                                            <th className="p-3 text-center">Admin</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase())).map(user => (
                                            <tr key={user.email} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-medium">{user.name}</td>
                                                <td className="p-3 text-gray-600">{user.email}</td>
                                                <td className="p-3 text-sm text-gray-500">
                                                    {user.teams.length > 0 ? user.teams.map(t => teams.find(tm => tm.id === t)?.name || t).join(', ') : 'None'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={user.is_admin || false}
                                                        onChange={() => handleToggleAdmin(user.id, user.is_admin || false)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                                        title="Toggle Admin Status"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => { setUserToChangePassword(user); setAdminNewPassword(''); setAdminNewPasswordRepeat(''); setShowAdminPassword(false); }} className="text-blue-600 hover:text-blue-800 font-medium mr-4">Change Password</button>
                                                    <button onClick={() => { setUserToDelete(user); setDeleteConfirmText(''); }} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* DELETE USER MODAL */}
                            {userToDelete && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <FocusLock returnFocus={true}>
                                        <div className="bg-white p-8 rounded-lg max-w-md w-full shadow-2xl">
                                        <h3 className="text-2xl font-bold text-red-600 mb-4">Delete User</h3>
                                        <p className="mb-4 text-gray-700">Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?</p>
                                        <p className="mb-6 text-sm text-gray-500">Their uploaded datasets and projects will be preserved, but unlinked from them.</p>

                                        <div className="mb-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Type their name <span className="text-red-600">"{userToDelete.name}"</span> to confirm:</label>
                                            <input
                                                type="text"
                                                autoComplete="off"
                                                value={deleteConfirmText}
                                                onChange={e => setDeleteConfirmText(e.target.value)}
                                                className="w-full p-2 border border-gray-400 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <button
                                                onClick={confirmDeleteUser}
                                                disabled={deleteConfirmText !== userToDelete.name}
                                                className={`w-full p-3 font-bold rounded ${deleteConfirmText === userToDelete.name ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                            >
                                                Confirm Delete
                                            </button>
                                            <button onClick={() => setUserToDelete(null)} className="w-full p-3 text-gray-500 hover:text-gray-700 underline font-medium">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                    </FocusLock>
                                </div>
                            )}

                            {/* CHANGE PASSWORD MODAL */}
                            {userToChangePassword && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <FocusLock returnFocus={true}>
                                        <div className="bg-white p-8 rounded-lg max-w-md w-full shadow-2xl">
                                        <h3 className="text-2xl font-bold mb-4">Change Password</h3>
                                        <p className="mb-6 text-gray-700">Set a new password for <strong>{userToChangePassword.name}</strong>.</p>

                                        <form onSubmit={handleAdminChangePassword}>
                                            <div className="relative mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                                <input type={showAdminPassword ? "text" : "password"} required autoComplete="new-password" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm pr-10" />
                                                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-2 top-8 text-gray-500 hover:text-gray-700 font-bold px-2">
                                                    {showAdminPassword ? "👁️‍🗨️" : "👁️"}
                                                </button>
                                            </div>
                                            <div className="relative mb-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Repeat New Password</label>
                                                <input type={showAdminPassword ? "text" : "password"} required autoComplete="new-password" value={adminNewPasswordRepeat} onChange={e => setAdminNewPasswordRepeat(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm pr-10" />
                                            </div>

                                            <div className="space-y-4">
                                                <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow">
                                                    Change Password
                                                </button>
                                                <button type="button" onClick={() => setUserToChangePassword(null)} className="w-full p-3 text-gray-500 hover:text-gray-700 underline font-medium">
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                    </FocusLock>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TEAMS TAB */}
                    {activeTab === 'teams' && (
                        <div>
                            <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
                                <h3 className="text-xl font-bold mb-4">Create New Team</h3>
                                <form onSubmit={handleCreateTeam} className="flex gap-4 items-end">
                                    <div className="flex-1 max-w-md">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                                        <input type="text" required autoComplete="off" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm" />
                                    </div>
                                    <button type="submit" className="btn py-2 px-6 bg-blue-600 text-white rounded font-medium">Create Team</button>
                                </form>
                            </div>

                            <h3 className="text-xl font-bold mb-4">All Teams</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border">
                                    <thead>
                                        <tr className="bg-gray-100 text-left border-b">
                                            <th className="p-3">Team ID</th>
                                            <th className="p-3">Team Name</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teams.map(team => (
                                            <tr key={team.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">#{team.id}</td>
                                                <td className="p-3 font-medium">{team.name}</td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => setTeamToDelete(team)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* DELETE TEAM MODAL */}
                            {teamToDelete && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <FocusLock returnFocus={true}>
                                        <div className="bg-white p-8 rounded-lg max-w-md w-full shadow-2xl">
                                        <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Team: {teamToDelete.name}</h3>
                                        <p className="mb-6 text-gray-700">How would you like to handle the projects and datasets owned by this team?</p>

                                        <div className="space-y-4">
                                            <button onClick={() => confirmDeleteTeam(false)} className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded">
                                                Preserve Data (Unlink them)
                                            </button>
                                            <button onClick={() => confirmDeleteTeam(true)} className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded">
                                                Delete Data (Wipe test data)
                                            </button>
                                            <button onClick={() => setTeamToDelete(null)} className="w-full p-3 mt-4 text-gray-500 hover:text-gray-700 underline font-medium">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                    </FocusLock>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LINKS TAB */}
                    {activeTab === 'links' && (
                        <div>
                            <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
                                <h3 className="text-xl font-bold mb-4">Link User to Team</h3>
                                <form onSubmit={handleLinkUserToTeam} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                                        <select required value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm">
                                            <option value="">-- Choose User --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Team</label>
                                        <select required value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="w-full p-2 border border-gray-400 rounded-md bg-white focus:ring-2 focus:ring-blue-500 shadow-sm">
                                            <option value="">-- Choose Team --</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="submit" className="btn py-2 px-6 bg-blue-600 text-white rounded font-medium">Link</button>
                                </form>
                            </div>

                            <h3 className="text-xl font-bold mb-4">Current Links & Invitations</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border">
                                    <thead>
                                        <tr className="bg-gray-100 text-left border-b">
                                            <th className="p-3">User / Email</th>
                                            <th className="p-3">Team</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-center">Team Admin</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Render Active Links */}
                                        {users.flatMap(user =>
                                            user.teams.map(teamId => {
                                                const teamName = teams.find(t => t.id === teamId)?.name || `Team #${teamId}`;
                                                const linkData = userTeamLinks.find(l => l.user_id === user.id && l.team_id === teamId);
                                                const isTeamAdmin = linkData ? linkData.is_team_admin : false;
                                                return (
                                                    <tr key={`active-${user.id}-${teamId}`} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{user.name} <span className="text-gray-500 font-normal">({user.email})</span></td>
                                                        <td className="p-3">{teamName}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">ACTIVE</span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isTeamAdmin}
                                                                onChange={() => handleToggleTeamAdmin(user.id, teamId, isTeamAdmin)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                                                title="Toggle Team Admin Status"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => handleUnlink(user.id, teamId)} className="text-red-600 hover:text-red-800 font-medium">Unlink</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                        {/* Render Pending/Rejected Invitations */}
                                        {invitations.filter(inv => inv.status !== 'ACCEPTED').map(inv => {
                                            const teamName = inv.team ? inv.team.name : (teams.find(t => t.id === inv.team_id)?.name || `Team #${inv.team_id}`);
                                            const isPending = inv.status === 'PENDING';
                                            return (
                                                <tr key={`inv-${inv.id}`} className="border-b hover:bg-gray-50 bg-gray-50">
                                                    <td className="p-3 font-medium text-gray-500 italic">Unknown User <span className="font-normal">({inv.email})</span></td>
                                                    <td className="p-3">{teamName}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="text-gray-400">-</span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <span className="text-gray-400 text-sm italic">No actions</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (() => {
                        const sortedEnquiries = [...enquiries].sort((a, b) => {
                            let valA = a[enquiriesSortField] || '';
                            let valB = b[enquiriesSortField] || '';
                            if (typeof valA === 'string') valA = valA.toLowerCase();
                            if (typeof valB === 'string') valB = valB.toLowerCase();

                            if (valA < valB) return enquiriesSortOrder === 'asc' ? -1 : 1;
                            if (valA > valB) return enquiriesSortOrder === 'asc' ? 1 : -1;
                            return 0;
                        });

                        const handleSort = (field) => {
                            if (enquiriesSortField === field) {
                                setEnquiriesSortOrder(enquiriesSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                                setEnquiriesSortField(field);
                                setEnquiriesSortOrder('asc');
                            }
                            setEnquiriesCurrentPage(1); // Reset page on sort
                        };

                        const itemsPerPage = 20;
                        const totalPages = Math.ceil(sortedEnquiries.length / itemsPerPage);
                        const startIndex = (enquiriesCurrentPage - 1) * itemsPerPage;
                        const currentEnquiries = sortedEnquiries.slice(startIndex, startIndex + itemsPerPage);

                        return (
                            <div>
                                <h3 className="text-xl font-bold mb-4">All Notifications (Enquiries)</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                                        <table className="min-w-full bg-white relative">
                                            <thead className="bg-gray-100 text-left sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                                                        Timestamp {enquiriesSortField === 'created_at' && (enquiriesSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('team_name')}>
                                                        Team {enquiriesSortField === 'team_name' && (enquiriesSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('dataset_name')}>
                                                        Dataset {enquiriesSortField === 'dataset_name' && (enquiriesSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('applicant_name')}>
                                                        Applicant Name {enquiriesSortField === 'applicant_name' && (enquiriesSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="p-3">Institute</th>
                                                    <th className="p-3">Email</th>
                                                    <th className="p-3">Enquiry</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentEnquiries.map(enq => (
                                                    <tr key={enq.id} className="border-b hover:bg-gray-50 align-top">
                                                        <td className="p-3 text-sm text-gray-500 whitespace-nowrap">{new Date(enq.created_at).toLocaleString()}</td>
                                                        <td className="p-3 font-medium text-[var(--cruk-darkblue)]">{enq.team_name}</td>
                                                        <td className="p-3 font-medium text-gray-800">{enq.dataset_name || 'N/A'}</td>
                                                        <td className="p-3">{enq.applicant_name}</td>
                                                        <td className="p-3 text-sm">{enq.applicant_organisation}</td>
                                                        <td className="p-3 text-sm text-gray-600"><a href={`mailto:${enq.applicant_email}`}>{enq.applicant_email}</a></td>
                                                        <td className="p-3 text-sm">
                                                            {enq.enquiry_text.length > 100 ? (
                                                                <>
                                                                    {enq.enquiry_text.substring(0, 100)}...
                                                                    <button
                                                                        className="block text-blue-600 hover:underline text-xs mt-1 font-medium"
                                                                        onClick={() => setViewEnquiry(enq)}
                                                                    >
                                                                        View Full Enquiry
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                enq.enquiry_text
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {enquiries.length === 0 && <p className="p-4 text-center text-gray-500">No notifications found.</p>}
                                    </div>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-4 px-2">
                                        <div className="text-sm text-gray-500">
                                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedEnquiries.length)} of {sortedEnquiries.length} entries
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setEnquiriesCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={enquiriesCurrentPage === 1}
                                                className={`px-3 py-1 rounded ${enquiriesCurrentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                            >
                                                Previous
                                            </button>
                                            <div className="px-3 py-1 bg-blue-50 text-blue-700 font-medium rounded">
                                                Page {enquiriesCurrentPage} of {totalPages}
                                            </div>
                                            <button
                                                onClick={() => setEnquiriesCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={enquiriesCurrentPage === totalPages}
                                                className={`px-3 py-1 rounded ${enquiriesCurrentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* Enquiry Details Modal */}
                                {viewEnquiry && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                        <FocusLock returnFocus={true}>
                                        <div className="bg-white p-6 rounded-lg max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                                            <div className="flex justify-between items-start mb-4 border-b pb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-800">Enquiry Details</h3>
                                                    <p className="text-sm text-gray-500 mt-1">From: {viewEnquiry.applicant_name} ({viewEnquiry.applicant_organisation})</p>
                                                    <p className="text-sm text-gray-500">Dataset: {viewEnquiry.dataset_name || 'N/A'}</p>
                                                </div>
                                                <button onClick={() => setViewEnquiry(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2">
                                                <div className="bg-gray-50 p-4 rounded border border-gray-100 text-gray-700 whitespace-pre-wrap">
                                                    {viewEnquiry.enquiry_text}
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t text-right">
                                                <button
                                                    onClick={() => setViewEnquiry(null)}
                                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                        </FocusLock>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ERROR LOGS TAB */}
                    {activeTab === 'errors' && (
                        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200 shadow-sm">
                            <ErrorLogsTab token={token} />
                        </div>
                    )}
                    {/* AI ANALYTICS TAB */}
                    {activeTab === 'analytics' && (
                        <div className="mb-8 shadow-sm">
                            <AdminAnalyticsTab />
                        </div>
                    )}
                    {/* FILTER TELEMETRY TAB */}
                    {activeTab === 'filter-telemetry' && (
                        <div className="mb-8 shadow-sm">
                            <FilterTelemetryTab />
                        </div>
                    )}
                </>
            )}
        </main>
    );
};
