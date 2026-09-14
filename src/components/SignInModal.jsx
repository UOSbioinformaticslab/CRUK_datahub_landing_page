import React, { useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const SignInModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const [step, setStep] = useState('login'); // 'login' or 'selectTeam'
    const [userData, setUserData] = useState(null);

    if (!isOpen) return null;

    const resetState = () => {
        setEmail('');
        setPassword('');
        setStatus('idle');
        setMessage('');
        setStep('login');
        setUserData(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_BASE_URL}/token`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || 'Login failed');

            // Save core auth data immediately
            localStorage.setItem('userId', data.user.id.toString());
            localStorage.setItem('user_id', data.user.id.toString());
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userOrg', data.user.applicant_organisation || 'University of Sussex');
            localStorage.setItem('isAdmin', data.user.is_admin ? "true" : "false");

            if (data.user.teams && data.user.teams.length > 0) {
                localStorage.setItem('userTeams', JSON.stringify(data.user.teams));
                setUserData(data.user);
                setStatus('success');
                setMessage('Successfully logged in!');
                
                // Show success briefly, then transition to team selection
                setTimeout(() => {
                    setStep('selectTeam');
                    setStatus('idle');
                    setMessage('');
                }, 1000);
            } else {
                // No teams available
                localStorage.removeItem('teamId');
                localStorage.removeItem('activeTeamId');
                localStorage.removeItem('userTeams');
                setStatus('success');
                setMessage('Successfully logged in!');
                
                setTimeout(() => {
                    onLoginSuccess(data.user);
                    resetState();
                }, 1500);
            }

        } catch (err) {
            setStatus('error');
            setMessage(err.message || "Invalid credentials");
        }
    };

    const handleTeamSelect = (teamId) => {
        localStorage.setItem('teamId', teamId);
        localStorage.setItem('activeTeamId', teamId);
        onLoginSuccess(userData);
        resetState();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-96 transform transition-all duration-300">
                
                {step === 'login' && (
                    <>
                        <h2 className="text-xl font-bold mb-4 text-[var(--cruk-darkblue)]">Researcher Sign In</h2>
                        
                        {status === 'error' && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
                                {message}
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-sm font-bold flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="email" placeholder="Email" required
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                disabled={status === 'loading' || status === 'success'}
                            />
                            <input
                                type="password" placeholder="Password" required
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                disabled={status === 'loading' || status === 'success'}
                            />
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded transition-colors" disabled={status === 'loading' || status === 'success'}>Cancel</button>
                                <button type="submit" className="btn px-4 py-2" disabled={status === 'loading' || status === 'success'}>
                                    {status === 'loading' ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                                Don't have an account? <span className="font-bold text-[var(--cruk-darkblue)] cursor-pointer">Register</span>
                            </div>
                        </form>
                    </>
                )}

                {step === 'selectTeam' && userData && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h2 className="text-xl font-bold text-[var(--cruk-darkblue)]">Select Active Team</h2>
                            <p className="text-sm text-gray-500 mt-2">Welcome {userData.name}! Please choose which team space you'd like to work in today.</p>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {userData.teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => handleTeamSelect(team.id)}
                                    className="w-full text-left p-3 rounded border border-gray-200 hover:border-[var(--cruk-darkblue)] hover:bg-blue-50 transition-all flex items-center justify-between group"
                                >
                                    <span className="font-medium text-gray-800 group-hover:text-[var(--cruk-darkblue)]">{team.name}</span>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[var(--cruk-darkblue)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignInModal;