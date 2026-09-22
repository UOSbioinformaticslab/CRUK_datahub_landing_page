import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";



export const ManageTeamModal = ({ isOpen, onClose, activeTeamId, userTeams, mode = 'members' }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
    const [notificationEmail, setNotificationEmail] = useState('');
    const [members, setMembers] = useState([]);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [viewEnquiry, setViewEnquiry] = useState(null);

    const activeTeam = userTeams?.find(t => t.id.toString() === activeTeamId?.toString());

    const fetchData = async () => {
        if (!activeTeamId) return;
        setIsLoadingData(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const MIDDLELAYER_URL = import.meta.env.VITE_MIDDLELAYER_URL || "http://localhost:8002";
            
            const [teamRes, membersRes, enquiriesRes, invitationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/teams/${activeTeamId}`, { headers }),
                fetch(`${API_BASE_URL}/teams/${activeTeamId}/members`, { headers }),
                fetch(`${MIDDLELAYER_URL}/teams/${activeTeamId}/enquiries`, { headers }),
                fetch(`${API_BASE_URL}/teams/${activeTeamId}/invitations`, { headers })
            ]);

            if (teamRes.ok) {
                const teamData = await teamRes.json();
                setNotificationEmail(teamData.notification_email || '');
            }
            if (membersRes.ok) {
                setMembers(await membersRes.json());
            }
            if (enquiriesRes.ok) {
                setEnquiries(await enquiriesRes.json());
            }
            if (invitationsRes && invitationsRes.ok) {
                setPendingInvitations(await invitationsRes.json());
            }
        } catch (err) {
            console.error("Failed to fetch team data", err);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTeamId) {
            fetchData();
        }
    }, [isOpen, activeTeamId]);

    if (!isOpen) return null;

    const showMessage = (msg, isError = false) => {
        setMessage(msg);
        setStatus(isError ? 'error' : 'success');
        setTimeout(() => {
            setStatus('idle');
            setMessage('');
        }, 3000);
    };

    const handleSaveNotificationEmail = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/teams/${activeTeamId}/notification_email`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notification_email: notificationEmail })
            });
            if (!res.ok) throw new Error('Failed to update notification email');
            showMessage('Notification email updated successfully!');
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleToggleAdmin = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/teams/${activeTeamId}/members/${userId}/admin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_admin: !currentStatus })
            });
            if (!res.ok) throw new Error('Failed to update admin status');
            fetchData(); // Refresh list
            showMessage('Admin status updated');
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/teams/${activeTeamId}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to remove member');
            fetchData(); // Refresh list
            showMessage('Member removed');
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleCancelInvitation = async (invitationId) => {
        if (!window.confirm("Are you sure you want to cancel this pending invitation?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/teams/${activeTeamId}/invitations/${invitationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to cancel invitation');
            fetchData(); // Refresh list
            showMessage('Invitation cancelled');
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setStatus('loading');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/teams/${activeTeamId}/invitations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: inviteEmail, is_admin: inviteAsAdmin })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to send invitation');

            showMessage(`Successfully sent invitation to ${inviteEmail}`);
            setInviteEmail('');
            setInviteAsAdmin(false);
            fetchData(); // Refresh list to display newly created invitation
        } catch (err) {
            showMessage(err.message, true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 font-bold text-xl"
                >
                    &times;
                </button>

                <h2 className="text-2xl font-bold mb-6 text-[var(--cruk-darkblue)]">
                    {mode === 'notifications' ? 'Team Notifications:' : 'Manage Team:'} {activeTeam?.name}
                </h2>

                {status !== 'idle' && status !== 'loading' && (
                    <div className={`p-3 mb-4 rounded font-bold text-sm ${status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}

                {isLoadingData ? (
                    <p className="text-gray-500">Loading team data...</p>
                ) : (
                    <>
                        {mode === 'members' && (
                            <>
                                {/* 1. Notification Email Settings */}
                                <div className="mb-8 p-4 border border-gray-200 rounded-lg">
                                    <h3 className="font-bold text-lg mb-2">Team Notification Email</h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Specify an alternative email address for all team notifications (e.g., Data Access Requests).
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={notificationEmail}
                                            onChange={(e) => setNotificationEmail(e.target.value)}
                                            placeholder="e.g. data-team@university.edu"
                                            className="flex-1 p-2 border border-gray-300 rounded focus:border-[var(--cruk-darkblue)] focus:outline-none"
                                        />
                                        <button onClick={handleSaveNotificationEmail} className="btn py-2 px-4 whitespace-nowrap">Save</button>
                                    </div>
                                </div>

                                {/* 2. Existing Members */}
                                <div className="mb-8">
                                    <h3 className="font-bold text-lg mb-3">Current Members</h3>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="w-full text-sm relative">
                                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                                    <tr className="text-left border-b border-gray-200">
                                                        <th className="p-3">User</th>
                                                        <th className="p-3 text-center">Team Admin</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {members.map(member => (
                                                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="p-3">
                                                                <span className="font-medium">{member.name}</span>
                                                                <span className="text-gray-500 ml-2">({member.email})</span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={member.is_team_admin}
                                                                    onChange={() => handleToggleAdmin(member.id, member.is_team_admin)}
                                                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <button onClick={() => handleRemoveMember(member.id)} className="text-red-600 hover:text-red-800 font-medium">Remove</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Pending Invitations */}
                                <div className="mb-8">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-lg">Pending Invitations</h3>
                                        {pendingInvitations.length > 0 && (
                                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                                {pendingInvitations.length} Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="max-h-48 overflow-y-auto">
                                            <table className="w-full text-sm relative">
                                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                                    <tr className="text-left border-b border-gray-200">
                                                        <th className="p-3">Email</th>
                                                        <th className="p-3 text-center">Role</th>
                                                        <th className="p-3 text-center">Status</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingInvitations.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="p-4 text-center text-gray-500 italic">No pending invitations.</td>
                                                        </tr>
                                                    ) : (
                                                        pendingInvitations.map(inv => (
                                                            <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                                <td className="p-3 font-medium text-gray-800">{inv.email}</td>
                                                                <td className="p-3 text-center">
                                                                    {inv.is_admin ? (
                                                                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded">Team Admin</span>
                                                                    ) : (
                                                                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">Member</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                        Pending
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <button onClick={() => handleCancelInvitation(inv.id)} className="text-red-600 hover:text-red-800 font-medium">
                                                                        Cancel
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Invite New Members */}
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
                                    <h3 className="font-bold text-blue-800 mb-2">Invite a new member</h3>
                                    <p className="text-sm text-blue-600 mb-4">
                                        Enter the email address of the person you'd like to invite. They will be automatically linked to your team when they register.
                                    </p>

                                    <form onSubmit={handleInvite}>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="email"
                                                placeholder="Colleague's email address"
                                                required
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)]"
                                                disabled={status === 'loading'}
                                            />
                                            <button
                                                type="submit"
                                                className="btn py-2 px-4 whitespace-nowrap"
                                                disabled={status === 'loading'}
                                            >
                                                {status === 'loading' ? 'Sending...' : 'Invite'}
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-blue-800 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={inviteAsAdmin}
                                                onChange={(e) => setInviteAsAdmin(e.target.checked)}
                                                className="w-4 h-4 rounded text-blue-600"
                                            />
                                            Invite as Team Admin
                                        </label>
                                    </form>
                                </div>
                            </>
                        )}

                        {mode === 'notifications' && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg">Team Notifications</h3>
                                    {enquiries.length > 0 && <span className="bg-blue-100 text-blue-800 text-xs font-bold py-1 px-3 rounded-full">{enquiries.length} Enquiries</span>}
                                </div>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto">
                                        <table className="w-full text-sm relative">
                                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                                <tr className="text-left border-b border-gray-200">
                                                    <th className="p-3 whitespace-nowrap">Date</th>
                                                    <th className="p-3">Dataset</th>
                                                    <th className="p-3">Applicant</th>
                                                    <th className="p-3">Enquiry</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {enquiries.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-4 text-center text-gray-500">No notifications found for this team.</td>
                                                    </tr>
                                                ) : (
                                                    enquiries.map(enq => (
                                                        <tr key={enq.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                                            <td className="p-3 whitespace-nowrap text-gray-500">{new Date(enq.created_at).toLocaleDateString()}</td>
                                                            <td className="p-3 font-medium text-gray-800">{enq.dataset_name || 'N/A'}</td>
                                                            <td className="p-3">
                                                                <div className="font-medium text-[var(--cruk-darkblue)]">{enq.applicant_name}</div>
                                                                <div className="text-xs text-gray-500">{enq.applicant_organisation}</div>
                                                                <div className="text-xs text-blue-600"><a href={`mailto:${enq.applicant_email}`}>{enq.applicant_email}</a></div>
                                                                {enq.contact_number && <div className="text-xs text-gray-500">{enq.contact_number}</div>}
                                                            </td>
                                                            <td className="p-3">
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
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enquiry Details Modal */}
                        {viewEnquiry && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
                            </div>
                        )}
                    </>
                )}

                <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Close</button>
                </div>
            </div>
        </div>
    );
};
