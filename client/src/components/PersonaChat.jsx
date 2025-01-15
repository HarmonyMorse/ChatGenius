import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getToken } from '../services/auth';
import api from '../api/api';

function PersonaChat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(true);
    const { userId } = useParams();

    useEffect(() => {
        const loadPersona = async () => {
            try {
                // Get user info
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('id, username')
                    .eq('id', userId)
                    .single();

                if (userError) throw userError;

                // Get persona info
                const { data: personaData, error: personaError } = await supabase
                    .from('personas')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (personaError) throw personaError;

                setPersona({
                    ...personaData,
                    username: user.username
                });
            } catch (error) {
                console.error('Error loading persona:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPersona();
    }, [userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            // Add user message to chat
            setMessages(prev => [...prev, {
                content: newMessage,
                role: 'user',
                timestamp: new Date().toISOString()
            }]);

            // Clear input
            setNewMessage('');

            // Get AI response
            const { data } = await api.post(`/persona/${userId}/chat`, {
                message: newMessage
            });

            // Add AI response to chat
            setMessages(prev => [...prev, {
                content: data.response,
                role: 'assistant',
                timestamp: data.metadata.timestamp
            }]);
        } catch (error) {
            console.error('Error sending message:', error);
            // Add error message to chat
            setMessages(prev => [...prev, {
                content: 'Error: Failed to get response from persona',
                role: 'error',
                timestamp: new Date().toISOString()
            }]);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!persona) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Persona Not Found</h2>
                    <p className="text-gray-600">This user hasn&apos;t created a persona yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {persona.username}&apos;s AI Persona
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Chat with an AI that mimics {persona.username}&apos;s communication style
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${message.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : message.role === 'error'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                        >
                            <p className="text-sm">{message.content}</p>
                            <span className="text-xs opacity-75 mt-1 block">
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Message input */}
            <div className="border-t bg-white p-4">
                <form onSubmit={handleSubmit} className="flex space-x-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default PersonaChat;
