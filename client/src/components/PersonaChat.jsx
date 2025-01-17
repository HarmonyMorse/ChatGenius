import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import api from '../api/api';
import FormattedMessage from './FormattedMessage';

function PersonaChat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(true);
    const { userId } = useParams();
    const navigate = useNavigate();

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
            <div className="flex flex-col h-screen">
                <div className="bg-[#0a131a] border-b-2 border-secondary/20 px-6 py-3 shadow-sm">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 hover:bg-secondary/20 rounded-full transition-colors text-accent1"
                            aria-label="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <h2 className="text-lg font-semibold text-accent1">Persona Chat</h2>
                    </div>
                </div>
                <div className="flex-1 bg-[#0a131a] p-4">
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent2"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!persona) {
        return (
            <div className="flex flex-col h-screen">
                <div className="bg-[#0a131a] border-b-2 border-secondary/20 px-6 py-3 shadow-sm">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 hover:bg-secondary/20 rounded-full transition-colors text-accent1"
                            aria-label="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <h2 className="text-lg font-semibold text-accent1">Persona Chat</h2>
                    </div>
                </div>
                <div className="flex-1 bg-[#0a131a] flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-accent1 mb-2">Persona Not Found</h2>
                        <p className="text-accent1/80">This user hasn&apos;t created a persona yet.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <div className="bg-[#0a131a] border-b-2 border-secondary/20 px-6 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 hover:bg-secondary/20 rounded-full transition-colors text-accent1"
                            aria-label="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-accent1">{persona?.username}&apos;s Persona</h2>
                            <p className="text-sm text-accent1/80">{persona?.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a131a]">
                {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${message.role === 'user' ? 'bg-accent2 text-white' : 'bg-secondary/20 text-accent1'} rounded-lg px-4 py-2`}>
                            <FormattedMessage
                                content={message.content}
                                message={{
                                    id: index,
                                    content: message.content,
                                    sender: {
                                        id: message.role === 'user' ? 'user' : persona?.id,
                                        username: message.role === 'user' ? 'You' : persona?.username
                                    },
                                    timestamp: message.timestamp
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t-2 border-secondary/20 bg-[#0a131a] p-4">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-lg bg-secondary/20 border-0 px-4 py-2 text-accent1 placeholder-accent1/50 focus:outline-none focus:ring-2 focus:ring-accent2"
                    />
                    <button
                        type="submit"
                        className="bg-accent2 text-white px-6 py-2 rounded-lg hover:bg-accent2/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!newMessage.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default PersonaChat;
