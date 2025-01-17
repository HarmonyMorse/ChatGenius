import { useState } from 'react';
import PropTypes from 'prop-types';

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function MessageReactions({ reactions, onReact, messageId }) {
    const [showReactionPicker, setShowReactionPicker] = useState(false);

    // Group reactions by emoji
    const reactionCounts = reactions?.reduce((acc, reaction) => {
        acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
        return acc;
    }, {}) || {};

    const handleReactionClick = (emoji) => {
        onReact(messageId, emoji);
        setShowReactionPicker(false);
    };

    return (
        <div className="flex items-center space-x-1 mt-1">
            {/* Existing reactions */}
            {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <span className="mr-1">{emoji}</span>
                    <span className="text-gray-500">{count}</span>
                </button>
            ))}

            {/* Add reaction button */}
            <div className="relative">
                <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                >
                    <span className="text-xl">+</span>
                </button>

                {/* Reaction picker */}
                {showReactionPicker && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border flex space-x-2">
                        {AVAILABLE_REACTIONS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReactionClick(emoji)}
                                className="hover:bg-gray-100 p-1 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

MessageReactions.propTypes = {
    reactions: PropTypes.arrayOf(PropTypes.shape({
        emoji: PropTypes.string.isRequired,
        user_id: PropTypes.string.isRequired
    })),
    onReact: PropTypes.func.isRequired,
    messageId: PropTypes.string.isRequired
};

export default MessageReactions;