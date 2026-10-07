import React, { useState, useEffect } from 'react';


const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const DataCustodians = () => {
    const [teams, setTeams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/teams/`)
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                setTeams(sorted);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching teams:", err);
                setIsLoading(false);
            });
    }, []);

    const filteredTeams = teams.filter(team => 
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-[var(--cruk-darkblue)]">Meet our Data Custodians</h1>
                <a href="./dashboard.html" className="text-blue-600 hover:underline">Back to Dashboard</a>
            </div>

            <div className="mb-6">
                <input 
                    type="text" 
                    placeholder="Search data custodians..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {isLoading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custodian Name</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTeams.length > 0 ? (
                                filteredTeams.map(team => (
                                    <tr key={team.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            <a 
                                                href={`/src/data_custodian?team_id=${team.id}`}
                                                className="text-blue-600 hover:text-blue-900 hover:underline font-bold text-base block"
                                            >
                                                {team.name}
                                            </a>
                                            {team.introduction && (
                                                <p className="text-gray-500 font-normal text-xs mt-1 line-clamp-2 max-w-3xl">{team.introduction}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                                        No data custodians found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
