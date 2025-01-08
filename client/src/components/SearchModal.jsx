import { useState } from 'react';
import PropTypes from 'prop-types';

function SearchModal({ isOpen, onClose }) {
    const [searchType, setSearchType] = useState('messages');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        // TODO: Implement search functionality
        console.log('Searching for:', searchQuery, 'in:', searchType);
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

                    {/* Results Area */}
                    <div className="max-h-96 overflow-y-auto">
                        {/* TODO: Add search results here */}
                        <div className="text-gray-500 text-center py-8">
                            Enter a search term to begin
                        </div>
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