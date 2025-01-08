import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import messageService from '../services/messageService';
import realtimeService from '../services/realtimeService';
import { getUser } from '../services/auth';
import MessageReactions from './MessageReactions';
import FormattedMessage from './FormattedMessage';
import EditMessageForm from './EditMessageForm';
import reactionService from '../services/reactionService';

function ThreadView({ parentMessage, onClose, onParentReactionUpdate }) {
    const [replies, setReplies] = useState([]);
    const [newReply, setNewReply] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const repliesEndRef = useRef(null);
    const currentUser = getUser();

    useEffect(() => {
        const loadReplies = async () => {
            try {
                const threadReplies = await messageService.getThreadReplies(parentMessage.id);
                setReplies(threadReplies);
            } catch (error) {
                console.error('Error loading replies:', error);
            }
        };

        loadReplies();

        // Subscribe to realtime updates for this thread
        const channel = realtimeService.subscribeToThread(parentMessage.id, (event) => {
            switch (event.type) {
                case 'new_message':
                    setReplies(prev => [...prev, { ...event.message, reactions: [] }]);
                    break;
                case 'message_updated':
                    setReplies(prev => prev.map(msg =>
                        msg.id === event.message.id ? { ...event.message, reactions: msg.reactions } : msg
                    ));
                    break;
                case 'message_deleted':
                    setReplies(prev => prev.filter(msg => msg.id !== event.messageId));
                    break;
                case 'reactions_updated':
                    setReplies(prev => prev.map(msg =>
                        msg.id === event.messageId ? { ...msg, reactions: event.reactions } : msg
                    ));
                    break;
            }
        });

        return () => {
            realtimeService.unsubscribeFromThread(parentMessage.id);
        };
    }, [parentMessage.id]);

    useEffect(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newReply.trim()) return;

        try {
            const reply = {
                content: newReply.trim(),
                channel_id: parentMessage.channel_id,
                parent_id: parentMessage.id
            };

            await messageService.sendMessage(reply);
            setNewReply('');
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const updatedMessage = await messageService.editMessage(messageId, newContent);
            setReplies(prev => prev.map(msg =>
                msg.id === messageId ? { ...updatedMessage, reactions: msg.reactions } : msg
            ));
            setEditingMessageId(null);
        } catch (error) {
            console.error('Error editing reply:', error);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Are you sure you want to delete this reply?')) {
            return;
        }

        try {
            await messageService.deleteMessage(messageId);
            setReplies(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting reply:', error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            await reactionService.toggleReaction(messageId, emoji);
            const reactions = await reactionService.getMessageReactions(messageId);
            if (messageId === parentMessage.id) {
                // Update parent message reactions
                onParentReactionUpdate?.(reactions);
            } else {
                // Update reply reactions
                setReplies(prev => prev.map(msg =>
                    msg.id === messageId ? { ...msg, reactions } : msg
                ));
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    return (
        <div className="flex flex-col h-full border-l">
            {/* Thread header */}
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Thread</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            {/* Parent message */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                        {parentMessage.sender?.avatar_url && (
                            <img
                                src={parentMessage.sender.avatar_url}
                                alt="avatar"
                                className="w-8 h-8 rounded-full"
                            />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm">
                                {parentMessage.sender?.username || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(parentMessage.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <FormattedMessage content={parentMessage.content} />
                        <MessageReactions
                            reactions={parentMessage.reactions}
                            onReact={handleReaction}
                            messageId={parentMessage.id}
                        />
                    </div>
                </div>
            </div>

            {/* Replies */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {replies.map((reply) => (
                    <div key={reply.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                            {reply.sender?.avatar_url && (
                                <img
                                    src={reply.sender.avatar_url}
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full"
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold text-sm">
                                    {reply.sender?.username || 'Unknown User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(reply.created_at).toLocaleTimeString()}
                                </span>
                                {reply.is_edited && (
                                    <span className="text-xs text-gray-400">(edited)</span>
                                )}
                                {reply.sender_id === currentUser.id && (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setEditingMessageId(reply.id)}
                                            className="text-gray-400 hover:text-gray-600 text-sm"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMessage(reply.id)}
                                            className="text-red-400 hover:text-red-600 text-sm"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            {editingMessageId === reply.id ? (
                                <EditMessageForm
                                    message={reply}
                                    onSave={(content) => handleEditMessage(reply.id, content)}
                                    onCancel={() => setEditingMessageId(null)}
                                />
                            ) : (
                                <FormattedMessage content={reply.content} />
                            )}
                            <MessageReactions
                                reactions={reply.reactions}
                                onReact={handleReaction}
                                messageId={reply.id}
                            />
                        </div>
                    </div>
                ))}
                <div ref={repliesEndRef} />
            </div>

            {/* Reply input */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder="Reply to thread..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newReply.trim()}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Reply
                    </button>
                </div>
            </form>
        </div>
    );
}

ThreadView.propTypes = {
    parentMessage: PropTypes.shape({
        id: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        channel_id: PropTypes.string.isRequired,
        sender: PropTypes.shape({
            id: PropTypes.string.isRequired,
            username: PropTypes.string.isRequired,
            avatar_url: PropTypes.string
        }),
        created_at: PropTypes.string.isRequired,
        reactions: PropTypes.array
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onParentReactionUpdate: PropTypes.func
};

export default ThreadView;
