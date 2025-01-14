import { useState } from 'react';
import ragService from '../services/ragService';

const RagChat = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            console.log('Sending query:', query);
            const response = await ragService.askQuestion(query);
            console.log('Received response:', response);
            setResult(response);
        } catch (error) {
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                data: error.response?.data,
                status: error.response?.status
            });
            setError(error.response?.data?.error || error.message || 'Failed to get answer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h2 className="text-2xl font-semibold mb-6">
                Ask AI About Chat History
            </h2>

            {/* Query Input */}
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ask a question about previous conversations..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2
                            ${loading || !query.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Asking...</span>
                            </>
                        ) : (
                            <>
                                <span>Ask</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Error Message */}
            {error && (
                <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700">
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    {/* AI Answer */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Answer</h3>
                        <p className="whitespace-pre-wrap text-gray-700">
                            {result.answer}
                        </p>
                    </div>

                    <hr className="my-6" />

                    {/* Supporting Context */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Supporting Context</h3>
                        <div className="space-y-4">
                            {result.context?.map((msg, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-50 rounded-lg p-4 border-l-4"
                                    style={{ borderLeftColor: `rgba(59, 130, 246, ${msg.metadata?.score || 0})` }}
                                >
                                    <div className="text-sm text-gray-500 mb-2">
                                        From {msg.metadata?.sender || 'Unknown'} in {msg.metadata?.channel || 'Unknown'} ({msg.metadata?.created_at ? new Date(msg.metadata.created_at).toLocaleString() : 'Unknown time'})
                                        {' - '}
                                        Match Score: {((msg.metadata?.score || 0) * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-gray-700">{msg.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RagChat;
