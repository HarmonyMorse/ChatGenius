import PropTypes from 'prop-types';
import { useState } from 'react';

function ChannelInfoBar({ channel, onViewPinnedMessages }) {
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);

    const handlePinnedClick = () => {
        setShowPinnedMessages(!showPinnedMessages);
        onViewPinnedMessages(!showPinnedMessages);
    };

    return (
        <div className="bg-white border-b px-6 py-3">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0"> {/* min-w-0 allows truncation to work */}
                    <h2 className="text-lg font-semibold text-gray-900">
                        {channel.name}
                    </h2>
                    {channel.description && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                            {channel.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={handlePinnedClick}
                    className={`flex items-center space-x-1 px-3 py-1 rounded hover:bg-gray-100 ${showPinnedMessages ? 'bg-gray-100 text-yellow-600' : 'text-gray-600'}`}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 013 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L7 4.323V3a1 1 0 011-1h2z" />
                    </svg>
                    <span className="text-sm font-medium">Pinned</span>
                </button>
            </div>
        </div>
    );
}

ChannelInfoBar.propTypes = {
    channel: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string
    }).isRequired,
    onViewPinnedMessages: PropTypes.func.isRequired
};

export default ChannelInfoBar; 