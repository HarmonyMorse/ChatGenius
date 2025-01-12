import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import bookmarkService from '../services/bookmarkService';
import FormattedMessage from './FormattedMessage';

function BookmarkedMessages({ isOpen, onClose }) {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBookmarks = async () => {
            if (!isOpen) return;
            try {
                setLoading(true);
                const data = await bookmarkService.getBookmarks();
                setBookmarks(data);
            } catch (error) {
                console.error('Error loading bookmarks:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBookmarks();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Bookmarked Messages</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : bookmarks.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            No bookmarked messages yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookmarks.map((message) => (
                                <div key={message.id} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium">{message.sender.username}</span>
                                            <span className="text-gray-500 text-sm">
                                                {new Date(message.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        {message.channel && (
                                            <span className="text-sm text-gray-500">
                                                in #{message.channel.name}
                                            </span>
                                        )}
                                    </div>
                                    <FormattedMessage content={message.content} message={message} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

BookmarkedMessages.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default BookmarkedMessages;