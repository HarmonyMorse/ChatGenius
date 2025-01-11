import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import searchService from '../services/searchService';
import { formatDistanceToNow } from 'date-fns';
import channelService from '../services/channelService';
import { supabase } from '../supabaseClient';
import { getUser } from '../services/auth';

function SearchModal({ isOpen, onClose }) {
    const [searchType, setSearchType] = useState('messages');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUser = getUser();
    const [includeSystem, setIncludeSystem] = useState(true);
    const [includeFiles, setIncludeFiles] = useState(true);

    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            performSearch();
        } else {
            setResults([]);
        }
    }, [searchQuery, searchType, includeSystem, includeFiles]);

    const performSearch = async () => {
        setIsLoading(true);
        try {
            let searchResults;
            switch (searchType) {
                case 'messages':
                    searchResults = await searchService.searchMessages(searchQuery, {
                        includeSystem,
                        includeFiles
                    });
                    break;
                case 'channels':
                    searchResults = await searchService.searchChannels(searchQuery);
                    break;
                case 'users':
                    searchResults = await searchService.searchUsers(searchQuery);
                    break;
                default:
                    searchResults = [];
            }
            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim().length >= 2) {
            performSearch();
        }
    };

    const handleMessageClick = async (message) => {
        if (message.channel_id) {
            // Check if user is already a member of the channel
            try {
                const { data: membership, error: membershipError } = await supabase
                    .from('channel_members')
                    .select('channel_id')
                    .eq('channel_id', message.channel_id)
                    .eq('user_id', currentUser.id)
                    .single();

                if (membershipError && !membershipError.message.includes('No rows found')) {
                    console.error('Error checking channel membership:', membershipError);
                    return;
                }

                // Only try to join if not already a member
                if (!membership) {
                    await channelService.joinChannel(message.channel_id);
                }
                setSearchParams({ channel: message.channel_id });
            } catch (error) {
                console.error('Error handling channel navigation:', error);
                return;
            }
        } else if (message.dm_id) {
            setSearchParams({});
            // The Chat component will handle DM selection through its state
            navigate(`/chat?dm=${message.dm_id}`);
        }
        onClose();
    };

    const handleChannelClick = async (channel) => {
        try {
            await channelService.joinChannel(channel.id);
            setSearchParams({ channel: channel.id });
            onClose();
        } catch (error) {
            console.error('Error joining channel:', error);
        }
    };

    const handleUserClick = (user) => {
        // Navigate to DM with user
        navigate(`/chat?user=${user.id}`);
        onClose();
    };

    const renderResults = () => {
        if (isLoading) {
            return (
                <div className="text-gray-500 text-center py-8">
                    Searching...
                </div>
            );
        }

        if (searchQuery.trim().length < 2) {
            return (
                <div className="text-gray-500 text-center py-8">
                    Enter at least 2 characters to search
                </div>
            );
        }

        if (results.length === 0) {
            return (
                <div className="text-gray-500 text-center py-8">
                    No results found
                </div>
            );
        }

        switch (searchType) {
            case 'messages':
                return (
                    <div className="space-y-4">
                        {results.map((message) => (
                            <div
                                key={message.id}
                                className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
                                onClick={() => handleMessageClick(message)}
                            >
                                <div className="flex items-start space-x-3">
                                    <img
                                        src={message.sender?.avatar_url || '/default-avatar.png'}
                                        alt={message.sender?.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-900">
                                                {message.sender?.username || 'Unknown User'}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                            </span>
                                            {message.channel && (
                                                <span className="text-sm text-gray-500">
                                                    in #{message.channel.name}
                                                </span>
                                            )}
                                            {message.type === 'system' && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                    System
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-800 mt-1">{message.content}</p>
                                        {message.file && (
                                            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                <a
                                                    href={message.file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {message.file.name}
                                                </a>
                                                <span className="text-gray-400">
                                                    ({(message.file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'channels':
                return (
                    <div className="space-y-2">
                        {results.map((channel) => (
                            <div
                                key={channel.id}
                                className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
                                onClick={() => handleChannelClick(channel)}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-gray-400 text-xl">#</span>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{channel.name}</h3>
                                        {channel.description && (
                                            <p className="text-sm text-gray-500">{channel.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'users':
                return (
                    <div className="space-y-2">
                        {results.map((user) => (
                            <div
                                key={user.id}
                                className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
                                onClick={() => handleUserClick(user)}
                            >
                                <div className="flex items-center space-x-3">
                                    <img
                                        src={user.avatar_url || '/default-avatar.png'}
                                        alt={user.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{user.username}</h3>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: user.status === 'online' ? '#22c55e' :
                                                        user.status === 'away' ? '#eab308' :
                                                            user.status === 'busy' ? '#ef4444' : '#6b7280'
                                                }}
                                            />
                                            <span className="text-sm text-gray-500 capitalize">
                                                {user.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="p-4">
                    {/* Search Input */}
                    <form onSubmit={handleSearch} className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            <svg
                                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                    </form>

                    {/* Search Type Toggle */}
                    <div className="flex space-x-2 mb-4">
                        <button
                            onClick={() => setSearchType('messages')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${searchType === 'messages'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Messages
                        </button>
                        <button
                            onClick={() => setSearchType('channels')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${searchType === 'channels'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Channels
                        </button>
                        <button
                            onClick={() => setSearchType('users')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${searchType === 'users'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Users
                        </button>
                    </div>

                    {/* Message Search Filters */}
                    {searchType === 'messages' && (
                        <div className="flex space-x-4 mb-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={includeSystem}
                                    onChange={(e) => setIncludeSystem(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Include system messages</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={includeFiles}
                                    onChange={(e) => setIncludeFiles(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Include files</span>
                            </label>
                        </div>
                    )}

                    {/* Results Area */}
                    <div className="max-h-96 overflow-y-auto">
                        {renderResults()}
                    </div>

                    {/* Close Button */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

SearchModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default SearchModal; 