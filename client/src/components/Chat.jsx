import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from './Header';
import PropTypes from 'prop-types';
import messageService from '../services/messageService';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TEMP_CHANNEL_ID = '680dca5c-885f-4e21-930f-3c93ad6dc064';

function Chat({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Subscribe to realtime messages
        const channel = supabase
            .channel('messages')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${TEMP_CHANNEL_ID}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => [...prev, payload.new]);
                    }
                }
            )
            .subscribe();

        // Load existing messages
        const loadMessages = async () => {
            try {
                const messages = await messageService.getChannelMessages(TEMP_CHANNEL_ID);
                setMessages(messages);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        loadMessages();

        // Clean up
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const message = {
                content: newMessage.trim(),
                channel_id: TEMP_CHANNEL_ID
            };

            // Send message through API
            await messageService.sendMessage(message);

            // Clear input
            setNewMessage('');

            // Clear typing indicator
            setIsTyping(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        } catch (error) {
            console.error('Error sending message:', error);
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
                        <div className="space-y-1">
                            <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                                # general
                            </button>
                            <button className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 text-gray-700">
                                # random
                            </button>
                        </div>
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
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-sm">
                                            {message.sender?.username || 'Unknown User'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(message.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 mt-1">{message.content}</p>
                                </div>
                            </div>
                        ))}
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