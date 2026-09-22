import React, { useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const SignInModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Registration state
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regOrg, setRegOrg] = useState('');

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const [step, setStep] = useState('login'); // 'login', 'register', or 'selectTeam'
    const [userData, setUserData] = useState(null);

    if (!isOpen) return null;

    const resetState = () => {
        setEmail('');
        setPassword('');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegOrg('');
        setShowPassword(false);
        setShowRegPassword(false);
        setShowRegConfirmPassword(false);
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

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (regPassword !== regConfirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: regName,
                    email: regEmail,
                    password: regPassword,
                    applicant_organisation: regOrg || 'University of Sussex'
                }),
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || 'Registration failed');

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
                setMessage('Registration successful! You have joined your team.');
                
                setTimeout(() => {
                    setStep('selectTeam');
                    setStatus('idle');
                    setMessage('');
                }, 1000);
            } else {
                localStorage.removeItem('teamId');
                localStorage.removeItem('activeTeamId');
                localStorage.removeItem('userTeams');
                setStatus('success');
                setMessage('Registration successful!');
                
                setTimeout(() => {
                    onLoginSuccess(data.user);
                    resetState();
                }, 1500);
            }
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Registration failed');
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
            <div className="bg-white p-8 rounded-lg shadow-xl w-96 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
                
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
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"} placeholder="Password" required
                                    className="w-full p-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    disabled={status === 'loading' || status === 'success'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.962 8.962 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243"></path><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    )}
                                </button>
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded transition-colors" disabled={status === 'loading' || status === 'success'}>Cancel</button>
                                <button type="submit" className="btn px-4 py-2" disabled={status === 'loading' || status === 'success'}>
                                    {status === 'loading' ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                                Don't have an account?{' '}
                                <span 
                                    className="font-bold text-[var(--cruk-darkblue)] cursor-pointer hover:underline"
                                    onClick={() => { setStep('register'); setStatus('idle'); setMessage(''); }}
                                >
                                    Register
                                </span>
                            </div>
                        </form>
                    </>
                )}

                {step === 'register' && (
                    <>
                        <h2 className="text-xl font-bold mb-4 text-[var(--cruk-darkblue)]">Create an Account</h2>
                        
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

                        <form onSubmit={handleRegisterSubmit} className="space-y-4">
                            <input
                                type="text" placeholder="Full Name" required
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                value={regName} onChange={(e) => setRegName(e.target.value)}
                                disabled={status === 'loading' || status === 'success'}
                            />
                            <input
                                type="email" placeholder="Email Address" required
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                                disabled={status === 'loading' || status === 'success'}
                            />
                            <div className="relative">
                                <input
                                    type={showRegPassword ? "text" : "password"} placeholder="Password" required
                                    className="w-full p-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                    value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                                    disabled={status === 'loading' || status === 'success'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegPassword(!showRegPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    title={showRegPassword ? "Hide password" : "Show password"}
                                >
                                    {showRegPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.962 8.962 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243"></path><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    )}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showRegConfirmPassword ? "text" : "password"} placeholder="Confirm Password" required
                                    className="w-full p-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                    value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
                                    disabled={status === 'loading' || status === 'success'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    title={showRegConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showRegConfirmPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A8.962 8.962 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243"></path><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    )}
                                </button>
                            </div>
                            <input
                                type="text" placeholder="Organisation (e.g. University of Sussex)"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[var(--cruk-darkblue)] focus:ring-1 focus:ring-[var(--cruk-darkblue)]"
                                value={regOrg} onChange={(e) => setRegOrg(e.target.value)}
                                disabled={status === 'loading' || status === 'success'}
                            />
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded transition-colors" disabled={status === 'loading' || status === 'success'}>Cancel</button>
                                <button type="submit" className="btn px-4 py-2" disabled={status === 'loading' || status === 'success'}>
                                    {status === 'loading' ? 'Registering...' : 'Register'}
                                </button>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                                Already have an account?{' '}
                                <span 
                                    className="font-bold text-[var(--cruk-darkblue)] cursor-pointer hover:underline"
                                    onClick={() => { setStep('login'); setStatus('idle'); setMessage(''); }}
                                >
                                    Sign In
                                </span>
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