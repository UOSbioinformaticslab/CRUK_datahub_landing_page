import React, { useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
export const SignIn = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
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

            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userId', data.user.id.toString());
            localStorage.setItem('user_id', data.user.id.toString());
            localStorage.setItem('isAdmin', data.user.is_admin ? "true" : "false");
            if (data.user.teams && data.user.teams.length > 0) {
                localStorage.setItem('teamId', data.user.teams[0].id);
                localStorage.setItem('activeTeamId', data.user.teams[0].id);
            } else {
                localStorage.removeItem('teamId');
            }

            setStatus('success');
            setMessage('Success! Redirecting to Dashboard...');
            if (onLoginSuccess) onLoginSuccess(data.user);
            
            setTimeout(() => {
                window.location.href = './dashboard.html';
            }, 1500);
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Invalid credentials');
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <form onSubmit={handleLogin} className="flex flex-col sm:flex-row items-center gap-2">
                <input
                    type="email"
                    placeholder="Email"
                    className="p-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-[var(--cruk-darkblue)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === 'loading' || status === 'success'}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="p-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-[var(--cruk-darkblue)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={status === 'loading' || status === 'success'}
                />
                <button
                    type="submit"
                    className="btn py-2 px-4"
                    disabled={status === 'loading' || status === 'success'}
                >
                    {status === 'loading' ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
            {status === 'error' && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">{message}</div>}
            {status === 'success' && <div className="text-green-700 text-sm font-bold bg-green-50 p-2 rounded border border-green-200">{message}</div>}
        </div>
    );
};

export default SignIn;