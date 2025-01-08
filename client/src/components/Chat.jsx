import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import PropTypes from 'prop-types';
import messageService from '../services/messageService';
import realtimeService from '../services/realtimeService';
import reactionService from '../services/reactionService';
import { getUser } from '../services/auth';
import ChannelList from './ChannelList';
import DirectMessageList from './DirectMessageList';
import MessageReactions from './MessageReactions';
import EditMessageForm from './EditMessageForm';
import FormattedMessage from './FormattedMessage';
import FormattingGuide from './FormattingGuide';
import ThreadView from './ThreadView';
import ChannelInfoBar from './ChannelInfoBar';
import { supabase } from '../supabaseClient';

function Chat({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [activeThread, setActiveThread] = useState(null);
    const [replyCounts, setReplyCounts] = useState({});
    const [currentChannel, setCurrentChannel] = useState(null);
    const [showPinnedMessages, setShowPinnedMessages] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const typingChannelRef = useRef(null);
    const currentUser = getUser();
    const [selectedDMId, setSelectedDMId] = useState(null);
    const [dmParticipants, setDMParticipants] = useState([]);

    const currentChannelId = !selectedDMId ? (searchParams.get('channel') || '680dca5c-885f-4e21-930f-3c93ad6dc064') : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Subscribe to realtime messages
        const channelOrDM = selectedDMId || currentChannelId;
        realtimeService.subscribeToChannel(channelOrDM, (event) => {
            console.log('Received realtime event:', event);
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

                    // If this is a reply, update the reply count for the parent message
                    if (event.message.parent_id) {
                        setReplyCounts(prev => ({
                            ...prev,
                            [event.message.parent_id]: (prev[event.message.parent_id] || 0) + 1
                        }));
                    }

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
                        msg.id === event.message.id ? { ...messageWithSender, reactions: msg.reactions } : msg
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
                    console.log('Handling message deletion:', event.messageId);
                    setMessages(prev => {
                        console.log('Current messages:', prev);
                        const messageExists = prev.some(msg => msg.id === event.messageId);
                        const deletedMessage = prev.find(msg => msg.id === event.messageId);

                        // If the deleted message was a reply, update the reply count
                        if (deletedMessage?.parent_id) {
                            setReplyCounts(prev => ({
                                ...prev,
                                [deletedMessage.parent_id]: Math.max(0, (prev[deletedMessage.parent_id] || 0) - 1)
                            }));
                        }

                        return messageExists ? prev.filter(msg => msg.id !== event.messageId) : prev;
                    });
                    break;
                case 'reactions_updated':
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.messageId ? { ...msg, reactions: event.reactions } : msg
                    ));
                    break;
            }
        });

        // Subscribe to typing indicators
        typingChannelRef.current = realtimeService.subscribeToTyping(channelOrDM, (users) => {
            setTypingUsers(users.filter(user => user.user_id !== currentUser.id));
        });

        // Load existing messages
        const loadMessages = async () => {
            try {
                let messages;
                if (selectedDMId) {
                    messages = await messageService.getDMMessages(selectedDMId);
                } else {
                    messages = await messageService.getChannelMessages(currentChannelId);
                }
                // Load reactions for each message
                const messagesWithReactions = await Promise.all(
                    messages.map(async (message) => {
                        const reactions = await reactionService.getMessageReactions(message.id);
                        return { ...message, reactions };
                    })
                );
                setMessages(messagesWithReactions);

                // Load reply counts for each message
                const counts = {};
                await Promise.all(
                    messages.filter(msg => !msg.parent_id).map(async (message) => {
                        try {
                            const count = await messageService.getThreadCount(message.id);
                            if (count > 0) {
                                counts[message.id] = count;
                            }
                        } catch (error) {
                            console.error('Error fetching reply count:', error);
                        }
                    })
                );
                setReplyCounts(counts);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        loadMessages();

        // Clean up
        return () => {
            realtimeService.unsubscribeFromChannel(channelOrDM);
            if (typingChannelRef.current) {
                realtimeService.stopTyping(typingChannelRef.current);
            }
        };
    }, [currentChannelId, selectedDMId, currentUser.id]);

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
                channel_id: selectedDMId ? null : currentChannelId,
                dm_id: selectedDMId || null
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
        setSelectedDMId(null);  // Clear selected DM
        setSearchParams({ channel: channelId });
        setMessages([]); // Clear messages when switching
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

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            await messageService.deleteMessage(messageId);
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handlePinMessage = async (messageId) => {
        try {
            const updatedMessage = await messageService.togglePin(messageId);
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...updatedMessage, reactions: msg.reactions } : msg
            ));
        } catch (error) {
            console.error('Error toggling message pin:', error);
        }
    };

    useEffect(() => {
        const loadChannel = async () => {
            try {
                const { data: channel, error } = await supabase
                    .from('channels')
                    .select('*')
                    .eq('id', currentChannelId)
                    .single();

                if (error) {
                    console.error('Error loading channel:', error);
                    return;
                }

                setCurrentChannel(channel);
            } catch (error) {
                console.error('Error in channel loading:', error);
            }
        };

        loadChannel();
    }, [currentChannelId]);

    const loadPinnedMessages = async () => {
        try {
            const { data: pinned, error } = await supabase
                .from('pinned_messages')
                .select(`
                    *,
                    message:message_id(
                        *,
                        sender:sender_id(id, username, avatar_url)
                    )
                `)
                .eq('channel_id', currentChannelId);

            if (error) {
                console.error('Error loading pinned messages:', error);
                return;
            }

            // Transform the data to get the message with pinned status
            const pinnedMessagesData = pinned.map(p => ({
                ...p.message,
                pinned: true,
                pinned_at: p.pinned_at,
                pinned_by: p.pinned_by
            }));

            setPinnedMessages(pinnedMessagesData);
        } catch (error) {
            console.error('Error in pinned messages loading:', error);
        }
    };

    useEffect(() => {
        if (showPinnedMessages) {
            loadPinnedMessages();
        }
    }, [showPinnedMessages, currentChannelId]);

    const handleViewPinnedMessages = (show) => {
        setShowPinnedMessages(show);
    };

    useEffect(() => {
        if (selectedDMId) {
            const loadDMParticipants = async () => {
                try {
                    const { data: members, error } = await supabase
                        .from('direct_message_members')
                        .select(`
                            user:user_id(
                                id,
                                username,
                                avatar_url
                            )
                        `)
                        .eq('dm_id', selectedDMId);

                    if (error) {
                        console.error('Error loading DM participants:', error);
                        return;
                    }

                    setDMParticipants(members.map(m => m.user));
                } catch (error) {
                    console.error('Error in DM participants loading:', error);
                }
            };

            loadDMParticipants();
        }
    }, [selectedDMId]);

    const handleDMSelect = (dmId) => {
        setSelectedDMId(dmId);
        setSearchParams({});  // Clear channel from URL
        setMessages([]); // Clear messages when switching
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
                        <DirectMessageList
                            onDMSelect={handleDMSelect}
                            selectedDMId={selectedDMId}
                        />
                    </div>
                </div>

                {/* Main chat area */}
                <div className={`flex-1 flex flex-col ${activeThread ? 'w-[calc(100%-40rem)]' : ''}`}>
                    {/* Channel/DM info bar */}
                    {currentChannel && !selectedDMId && (
                        <ChannelInfoBar
                            channel={currentChannel}
                            onViewPinnedMessages={handleViewPinnedMessages}
                        />
                    )}
                    {selectedDMId && dmParticipants.length > 0 && (
                        <div className="bg-white border-b px-6 py-3">
                            <div className="flex items-center">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {dmParticipants
                                        .filter(p => p.id !== currentUser.id)
                                        .map(p => p.username)
                                        .join(', ')}
                                </h2>
                            </div>
                        </div>
                    )}

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {showPinnedMessages ? (
                            // Show pinned messages
                            pinnedMessages.map((message) => (
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
                                            {message.pinned && (
                                                <span className="text-xs text-yellow-600 flex items-center">
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 013 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L7 4.323V3a1 1 0 011-1h2z" />
                                                    </svg>
                                                    Pinned
                                                </span>
                                            )}
                                            {message.sender_id === currentUser.id && (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => setEditingMessageId(message.id)}
                                                        className="text-gray-400 hover:text-gray-600 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        className="text-red-400 hover:text-red-600 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => handlePinMessage(message.id)}
                                                        className={`text-sm ${message.pinned ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        {message.pinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setActiveThread(message)}
                                                className="text-gray-400 hover:text-gray-600 text-sm flex items-center space-x-1"
                                            >
                                                <span>Reply</span>
                                                {replyCounts[message.id] > 0 && (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                                        {replyCounts[message.id]}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                        {editingMessageId === message.id ? (
                                            <EditMessageForm
                                                message={message}
                                                onSave={(content) => handleEditMessage(message.id, content)}
                                                onCancel={() => setEditingMessageId(null)}
                                            />
                                        ) : (
                                            <FormattedMessage content={message.content} />
                                        )}
                                        <MessageReactions
                                            reactions={message.reactions}
                                            onReact={handleReaction}
                                            messageId={message.id}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Show regular messages
                            messages.filter(msg => !msg.parent_id).map((message) => (
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
                                            {message.pinned && (
                                                <span className="text-xs text-yellow-600 flex items-center">
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 013 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L7 4.323V3a1 1 0 011-1h2z" />
                                                    </svg>
                                                    Pinned
                                                </span>
                                            )}
                                            {message.sender_id === currentUser.id && (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => setEditingMessageId(message.id)}
                                                        className="text-gray-400 hover:text-gray-600 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        className="text-red-400 hover:text-red-600 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => handlePinMessage(message.id)}
                                                        className={`text-sm ${message.pinned ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        {message.pinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setActiveThread(message)}
                                                className="text-gray-400 hover:text-gray-600 text-sm flex items-center space-x-1"
                                            >
                                                <span>Reply</span>
                                                {replyCounts[message.id] > 0 && (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                                        {replyCounts[message.id]}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                        {editingMessageId === message.id ? (
                                            <EditMessageForm
                                                message={message}
                                                onSave={(content) => handleEditMessage(message.id, content)}
                                                onCancel={() => setEditingMessageId(null)}
                                            />
                                        ) : (
                                            <FormattedMessage content={message.content} />
                                        )}
                                        <MessageReactions
                                            reactions={message.reactions}
                                            onReact={handleReaction}
                                            messageId={message.id}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                        {typingUsers.length > 0 && (
                            <div className="text-sm text-gray-500 italic">
                                {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t">
                        <div className="flex flex-col space-y-2">
                            <div className="flex space-x-4">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    placeholder="Type a message... (supports Markdown formatting)"
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
                            <div className="flex justify-end">
                                <FormattingGuide />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Thread panel */}
                {activeThread && (
                    <div className="w-96 bg-white">
                        <ThreadView
                            parentMessage={activeThread}
                            onClose={() => setActiveThread(null)}
                            onParentReactionUpdate={(reactions) => {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === activeThread.id ? { ...msg, reactions } : msg
                                ));
                                setActiveThread(prev => ({ ...prev, reactions }));
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

Chat.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Chat; 