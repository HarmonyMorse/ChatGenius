import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import PropTypes from 'prop-types';
import messageService from '../services/messageService';
import realtimeService from '../services/realtimeService';
import reactionService from '../services/reactionService';
import { getUser } from '../services/auth';
import ChannelList from './ChannelList';
import MessageReactions from './MessageReactions';
import EditMessageForm from './EditMessageForm';

function Chat({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const typingChannelRef = useRef(null);
    const currentUser = getUser();
    const currentChannelId = searchParams.get('channel') || '680dca5c-885f-4e21-930f-3c93ad6dc064';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Subscribe to realtime messages
        realtimeService.subscribeToChannel(currentChannelId, (event) => {
            let messageWithSender;
            switch (event.type) {
                case 'new_message':
                    // Get the sender information from the message
                    messageWithSender = {
                        ...event.message,
                        sender: event.message.sender || {
                            id: event.message.sender_id,
                            username: 'Loading...',
                            avatar_url: null
                        },
                        reactions: []
                    };
                    setMessages(prev => [...prev, messageWithSender]);

                    // If we don't have complete sender info, fetch it
                    if (!event.message.sender) {
                        messageService.getMessageSender(event.message.sender_id)
                            .then(sender => {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === event.message.id ? { ...msg, sender } : msg
                                ));
                            });
                    }
                    break;
                case 'message_updated':
                    messageWithSender = {
                        ...event.message,
                        sender: event.message.sender || {
                            id: event.message.sender_id,
                            username: 'Loading...',
                            avatar_url: null
                        }
                    };
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.message.id ? messageWithSender : msg
                    ));

                    // If we don't have complete sender info, fetch it
                    if (!event.message.sender) {
                        messageService.getMessageSender(event.message.sender_id)
                            .then(sender => {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === event.message.id ? { ...msg, sender } : msg
                                ));
                            });
                    }
                    break;
                case 'message_deleted':
                    setMessages(prev => prev.filter(msg => msg.id !== event.messageId));
                    break;
                case 'reactions_updated':
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.messageId ? { ...msg, reactions: event.reactions } : msg
                    ));
                    break;
            }
        });

        // Subscribe to typing indicators
        typingChannelRef.current = realtimeService.subscribeToTyping(currentChannelId, (users) => {
            setTypingUsers(users.filter(user => user.user_id !== currentUser.id));
        });

        // Load existing messages
        const loadMessages = async () => {
            try {
                const messages = await messageService.getChannelMessages(currentChannelId);
                // Load reactions for each message
                const messagesWithReactions = await Promise.all(
                    messages.map(async (message) => {
                        const reactions = await reactionService.getMessageReactions(message.id);
                        return { ...message, reactions };
                    })
                );
                setMessages(messagesWithReactions);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        loadMessages();

        // Clean up
        return () => {
            realtimeService.unsubscribeFromChannel(currentChannelId);
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
        };
    }, [currentChannelId, currentUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = () => {
        if (typingChannelRef.current) {
            realtimeService.startTyping(typingChannelRef.current, currentUser);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
        }, 1000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const message = {
                content: newMessage.trim(),
                channel_id: currentChannelId
            };

            // Send message through API
            await messageService.sendMessage(message);

            // Clear input
            setNewMessage('');

            // Clear typing indicator
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            await reactionService.toggleReaction(messageId, emoji);
            const reactions = await reactionService.getMessageReactions(messageId);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions } : msg
            ));
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    const handleChannelSelect = (channelId) => {
        setSearchParams({ channel: channelId });
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const updatedMessage = await messageService.editMessage(messageId, newContent);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...updatedMessage, reactions: msg.reactions } : msg
            ));
            setEditingMessageId(null);
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <Header onLogout={onLogout} />
            <div className="flex flex-1 h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">Channels</h2>
                        <ChannelList
                            onChannelSelect={handleChannelSelect}
                            selectedChannelId={currentChannelId}
                        />
                    </div>
                </div>

                {/* Main chat area */}
                <div className="flex-1 flex flex-col">
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className="flex items-start space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                                    {message.sender?.avatar_url && (
                                        <img
                                            src={message.sender.avatar_url}
                                            alt="avatar"
                                            className="w-8 h-8 rounded-full"
                                        />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-sm">
                                            {message.sender?.username || 'Unknown User'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(message.created_at).toLocaleTimeString()}
                                        </span>
                                        {message.is_edited && (
                                            <span className="text-xs text-gray-400">(edited)</span>
                                        )}
                                        {message.sender_id === currentUser.id && (
                                            <button
                                                onClick={() => setEditingMessageId(message.id)}
                                                className="text-gray-400 hover:text-gray-600 text-sm"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    {editingMessageId === message.id ? (
                                        <EditMessageForm
                                            message={message}
                                            onSave={(content) => handleEditMessage(message.id, content)}
                                            onCancel={() => setEditingMessageId(null)}
                                        />
                                    ) : (
                                        <p className="text-gray-800 mt-1">{message.content}</p>
                                    )}
                                    <MessageReactions
                                        reactions={message.reactions}
                                        onReact={handleReaction}
                                        messageId={message.id}
                                    />
                                </div>
                            </div>
                        ))}
                        {typingUsers.length > 0 && (
                            <div className="text-sm text-gray-500 italic">
                                {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t">
                        <div className="flex space-x-4">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping();
                                }}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

Chat.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Chat; 