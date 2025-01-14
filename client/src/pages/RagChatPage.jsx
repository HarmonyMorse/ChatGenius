import { useNavigate } from 'react-router-dom';
import RagChat from '../components/RagChat';

const RagChatPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-blue-600 text-white shadow">
                <div className="px-4 py-3 flex items-center">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 hover:bg-blue-700 rounded-full mr-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">Chat History Search</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50">
                <RagChat />
            </main>
        </div>
    );
};

export default RagChatPage; 