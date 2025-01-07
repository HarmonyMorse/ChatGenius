import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import channelService from '../services/channelService';

function BrowseChannels() {
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadChannels();
    }, []);

    const loadChannels = async () => {
        try {
            setIsLoading(true);
            const channelList = await channelService.getPublicChannels();
            setChannels(channelList);
        } catch (error) {
            setError('Error loading channels');
            console.error('Error loading channels:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinChannel = async (channelId) => {
        try {
            await channelService.joinChannel(channelId);
            navigate(`/chat?channel=${channelId}`);
        } catch (error) {
            console.error('Error joining channel:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600">Loading channels...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Browse Channels</h1>
                    <button
                        onClick={() => navigate('/chat')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Back to Chat
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg">
                    {channels.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No public channels available
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {channels.map((channel) => (
                                <li key={channel.id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                # {channel.name}
                                            </h3>
                                            {channel.description && (
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {channel.description}
                                                </p>
                                            )}
                                            <div className="mt-2 text-sm text-gray-500">
                                                Created by {channel.creator?.username || 'Unknown'}
                                                {channel.members_count && (
                                                    <span className="ml-4">
                                                        {channel.members_count} members
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleJoinChannel(channel.id)}
                                            className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Join Channel
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BrowseChannels;