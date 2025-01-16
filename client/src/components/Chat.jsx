import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import PropTypes from 'prop-types';
import messageService from '../services/messageService';
import realtimeService from '../services/realtimeService';
import reactionService from '../services/reactionService';
import fileService from '../services/fileService';
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
import UserList from './UserList';
import channelService from '../services/channelService';

const systemMessageStyles = {
    container: 'flex items-center justify-center py-2',
    content: 'text-accent1 text-sm flex items-center space-x-2',
    label: 'bg-secondary/10 text-accent1 px-2 py-0.5 rounded text-xs font-medium'
};

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
    const [channels, setChannels] = useState([]);
    const fileInputRef = useRef(null);

    const currentChannelId = !selectedDMId ? searchParams.get('channel') : null;

    useEffect(() => {
        const loadChannels = async () => {
            try {
                const userChannels = await channelService.getChannels();
                setChannels(userChannels);

                if (!searchParams.get('channel') && userChannels.length > 0) {
                    setSearchParams({ channel: userChannels[0].id });
                }
            } catch (error) {
                console.error('Error loading channels:', error);
            }
        };

        loadChannels();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Only proceed if we have a valid channel ID or DM ID
        if (!selectedDMId && !currentChannelId) return;

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
                        sender: event.message.sender,
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
                    break;
                case 'message_updated':
                    messageWithSender = {
                        ...event.message,
                        sender: event.message.sender
                    };
                    setMessages(prev => prev.map(msg =>
                        msg.id === event.message.id ? { ...messageWithSender, reactions: msg.reactions } : msg
                    ));
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

                // Load pinned messages first to get the pinned status
                const { data: pinnedMessages, error: pinnedError } = await supabase
                    .from('pinned_messages')
                    .select('message_id')
                    .eq(selectedDMId ? 'dm_id' : 'channel_id', selectedDMId || currentChannelId);

                if (pinnedError) {
                    console.error('Error loading pinned messages:', pinnedError);
                }

                const pinnedMessageIds = new Set(pinnedMessages?.map(p => p.message_id) || []);

                // Load reactions for each message and set pinned status
                const messagesWithReactionsAndPins = await Promise.all(
                    messages.map(async (message) => {
                        const reactions = await reactionService.getMessageReactions(message.id);
                        return {
                            ...message,
                            reactions,
                            pinned: pinnedMessageIds.has(message.id)
                        };
                    })
                );
                setMessages(messagesWithReactionsAndPins);

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
            await messageService.editMessage(messageId, newContent);
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

            // Update pinned messages list
            if (updatedMessage.pinned) {
                setPinnedMessages(prev => [...prev, { ...updatedMessage }]);
            } else {
                setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
        } catch (error) {
            console.error('Error toggling message pin:', error);
        }
    };

    useEffect(() => {
        const loadChannel = async () => {
            if (!currentChannelId) return;

            try {
                const { data: channels, error } = await supabase
                    .from('channels')
                    .select(`
                        *,
                        creator:created_by(
                            id,
                            username
                        )
                    `)
                    .eq('id', currentChannelId)
                    .limit(1);

                if (error) {
                    console.error('Error loading channel:', error);
                    return;
                }

                if (channels && channels.length > 0) {
                    // Ensure created_by is set correctly
                    const channel = {
                        ...channels[0],
                        created_by: channels[0].creator.id
                    };
                    setCurrentChannel(channel);
                    // Load pinned messages when channel is loaded
                    loadPinnedMessages();
                } else {
                    console.log('No channel found with ID:', currentChannelId);
                    setCurrentChannel(null);
                }
            } catch (error) {
                console.error('Error in channel loading:', error);
                setCurrentChannel(null);
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
                        sender:sender_id(id, username, avatar_url),
                        file:file_id(id, name, type, size, url)
                    )
                `)
                .eq(selectedDMId ? 'dm_id' : 'channel_id', selectedDMId || currentChannelId);

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

    const handleViewPinnedMessages = (show) => {
        setShowPinnedMessages(show);
        if (show) {
            loadPinnedMessages();
        }
    };

    const handleLeaveChannel = async () => {
        try {
            await channelService.leaveChannel(currentChannelId);
            setCurrentChannel(null);
            setSearchParams({});
            setMessages([]);
            // Trigger a refresh of the channel list
            const updatedChannels = await channelService.getChannels();
            setChannels(updatedChannels);
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
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
        setSearchParams({ dm: dmId });  // Update URL to reflect DM selection
        setMessages([]); // Clear messages when switching
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const channelList = await channelService.getChannels();
                setChannels(channelList);
            } catch (error) {
                console.error('Error loading channels:', error);
            }
        };

        loadInitialData();
    }, []);

    const handleChannelUpdate = (updatedChannel) => {
        setCurrentChannel(updatedChannel);
        // Update the channel in the channels list
        setChannels(prev => prev.map(ch =>
            ch.id === updatedChannel.id ? updatedChannel : ch
        ));
    };

    const handleChannelDelete = () => {
        // Clear current channel
        setCurrentChannel(null);
        setSearchParams({});
        setMessages([]);
        // Remove the channel from the channels list
        setChannels(prev => prev.filter(ch => ch.id !== currentChannel.id));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await fileService.uploadFile(file, {
                channelId: selectedDMId ? null : currentChannelId,
                dmId: selectedDMId
            });
            // The message will be added through the realtime subscription
            event.target.value = ''; // Reset file input
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    useEffect(() => {
        // Get DM ID from URL if present
        const dmId = searchParams.get('dm');
        if (dmId) {
            handleDMSelect(dmId);
        }

        // Get user ID from URL if present (for starting new DM)
        const userId = searchParams.get('user');
        if (userId) {
            const startNewDM = async () => {
                try {
                    // Create a new DM
                    const { data: dm, error: dmError } = await supabase
                        .from('direct_messages')
                        .insert({})
                        .select()
                        .limit(1)
                        .single();

                    if (dmError) {
                        console.error('Error creating DM:', dmError);
                        return;
                    }

                    // Add both users to the DM
                    const members = [
                        { dm_id: dm.id, user_id: currentUser.id },
                        { dm_id: dm.id, user_id: userId }
                    ];

                    const { error: membersError } = await supabase
                        .from('direct_message_members')
                        .insert(members);

                    if (membersError) {
                        console.error('Error adding DM members:', membersError);
                        return;
                    }

                    // Send system message about DM creation
                    const systemMessage = {
                        content: 'A Direct Message has been created',
                        dm_id: dm.id,
                        is_system_message: true
                    };

                    await messageService.sendMessage(systemMessage);

                    // Navigate to the new DM
                    handleDMSelect(dm.id);
                    setSearchParams({ dm: dm.id });
                } catch (error) {
                    console.error('Error in DM creation:', error);
                }
            };

            startNewDM();
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-primary">
            <Header onLogout={onLogout} />
            <div className="flex flex-1 h-[calc(100vh-64px)]">
                <div className="w-64 bg-gradient-to-b from-[#0a131a] to-primary border-r-2 border-secondary/20 p-4">
                    <ChannelList
                        channels={channels}
                        selectedChannelId={currentChannelId}
                        onChannelSelect={handleChannelSelect}
                    />
                    <DirectMessageList
                        selectedDMId={selectedDMId}
                        onDMSelect={handleDMSelect}
                    />
                </div>

                <div className="flex-1 flex">
                    {activeThread ? (
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
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {!selectedDMId && currentChannel && (
                                <ChannelInfoBar
                                    channel={currentChannel}
                                    onViewPinnedMessages={handleViewPinnedMessages}
                                    onLeaveChannel={handleLeaveChannel}
                                    onChannelUpdated={handleChannelUpdate}
                                    onDeleteChannel={handleChannelDelete}
                                />
                            )}

                            {selectedDMId && dmParticipants.length > 0 && (
                                <div className="bg-[#0a131a] border-b border-secondary/20 px-6 py-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-accent1">
                                            {dmParticipants
                                                .filter(p => p.id !== currentUser.id)
                                                .map(p => p.username)
                                                .join(', ')}
                                        </h2>
                                        <div className="flex items-center space-x-4">
                                            <button
                                                onClick={() => handleViewPinnedMessages(!showPinnedMessages)}
                                                className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm ${showPinnedMessages
                                                    ? 'bg-secondary/20 text-secondary'
                                                    : 'text-accent1/60 hover:bg-secondary/10'
                                                    }`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M9.293 1.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 4.414V13a1 1 0 11-2 0V4.414L7.707 5.707a1 1 0 01-1.414-1.414l3-3z" />
                                                </svg>
                                                <span>{showPinnedMessages ? 'Show All Messages' : 'Show Pinned Messages'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 bg-primary">
                                {(showPinnedMessages ? pinnedMessages : messages)
                                    .filter(message => !message.parent_id)
                                    .map((message) => (
                                        <div key={message.id} className={message.type === 'system' ? systemMessageStyles.container : 'mb-4'}>
                                            {message.type === 'system' ? (
                                                <div className={systemMessageStyles.content}>
                                                    <span className={systemMessageStyles.label}>System</span>
                                                    <span>{message.content}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-start space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                                                            <span className="text-accent1 text-sm">
                                                                {message.sender.username[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-accent2 font-medium">
                                                                {message.sender.username}
                                                            </span>
                                                            <span className="text-accent1/60 text-sm">
                                                                {new Date(message.created_at).toLocaleTimeString()}
                                                            </span>
                                                            {message.is_edited && (
                                                                <span className="text-accent1/40 text-xs">(edited)</span>
                                                            )}
                                                        </div>
                                                        {editingMessageId === message.id ? (
                                                            <EditMessageForm
                                                                message={message}
                                                                onSave={(content) => handleEditMessage(message.id, content)}
                                                                onCancel={() => setEditingMessageId(null)}
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="mt-1 text-accent1">
                                                                    <FormattedMessage
                                                                        content={message.content}
                                                                        file={message.file}
                                                                        message={message}
                                                                        onEdit={handleEditMessage}
                                                                        onPin={handlePinMessage}
                                                                        onDelete={handleDeleteMessage}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center space-x-4 mt-1">
                                                                    <MessageReactions
                                                                        reactions={message.reactions}
                                                                        onReact={handleReaction}
                                                                        messageId={message.id}
                                                                    />
                                                                    {!message.parent_id && (
                                                                        <button
                                                                            onClick={() => setActiveThread(message)}
                                                                            className="text-xs text-accent1/60 hover:text-accent1/80 flex items-center space-x-1"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                            <span>
                                                                                {replyCounts[message.id] ? `${replyCounts[message.id]} ${replyCounts[message.id] === 1 ? 'reply' : 'replies'}` : 'Reply'}
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                {typingUsers.length > 0 && (
                                    <div className="text-accent1/60 text-sm italic">
                                        {typingUsers.map(user => user.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 border-t border-secondary/10 bg-primary">
                                <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                                    <div className="flex space-x-3">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                            }}
                                            placeholder="Type a message... (supports Markdown formatting)"
                                            className="flex-1 rounded-lg border border-secondary/20 px-4 py-2 bg-accent1/5 text-accent1 placeholder-accent1/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                                        />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-secondary/10 text-accent1 rounded-lg hover:bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="px-4 py-2 bg-secondary text-accent1 rounded-lg hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <FormattingGuide />
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-64 bg-gradient-to-b from-[#0a131a] to-primary border-l-2 border-secondary/20">
                    <UserList />
                </div>
            </div>
        </div>
    );
}

Chat.propTypes = {
    onLogout: PropTypes.func.isRequired
};

export default Chat; 