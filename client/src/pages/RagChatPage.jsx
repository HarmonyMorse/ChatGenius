import { useNavigate } from 'react-router-dom';
import RagChat from '../components/RagChat';

const RagChatPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col bg-primary">
            {/* Header */}
            <header className="bg-[#0a131a] shadow-md border-b-2 border-secondary/20">
                <div className="px-4 py-3 flex items-center">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 hover:bg-secondary/10 rounded-full mr-3 text-accent1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-accent1">Chat History Search</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <RagChat />
            </main>
        </div>
    );
};

export default RagChatPage; 