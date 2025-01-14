import { useState } from 'react';
import PropTypes from 'prop-types';
import analysisService from '../services/analysisService';

function MessageAnalysis({ messageId, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [status, setStatus] = useState('');

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await analysisService.analyzeMessage(messageId);

            // Handle streaming response
            if (response instanceof Response) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const events = text.split('\n\n').filter(Boolean);

                    for (const event of events) {
                        const lines = event.split('\n');
                        const eventType = lines[0].replace('event: ', '');
                        const data = JSON.parse(lines[1].replace('data: ', ''));

                        switch (eventType) {
                            case 'status':
                                setStatus(data.message);
                                break;
                            case 'result':
                                console.log('Analysis result:', data.data.analysis.analysis); // Debug log
                                setAnalysis(data.data.analysis.analysis);
                                setLoading(false);
                                break;
                            case 'error':
                                setError(data.error);
                                setLoading(false);
                                break;
                        }
                    }
                }
            } else {
                // Handle regular JSON response (cached results)
                console.log('Cached analysis:', response.data.analysis); // Debug log
                setAnalysis(response.data.analysis);
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Message Analysis</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!analysis && !loading && (
                        <div className="text-center">
                            <p className="mb-4 text-gray-600">
                                Analyze this message to get insights about its content and context.
                            </p>
                            <button
                                onClick={handleAnalyze}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                disabled={loading}
                            >
                                Start Analysis
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">{status || 'Analyzing message...'}</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {analysis && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                                <p className="text-gray-700">{analysis.summary}</p>
                            </div>

                            {/* Key Points */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    {analysis.keyPoints.map((point, index) => (
                                        <li key={index} className="text-gray-700">{point}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Tone */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Tone</h3>
                                <p className="text-gray-700">{analysis.tone}</p>
                            </div>

                            {/* Action Items */}
                            {analysis.actionItems.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Action Items</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {analysis.actionItems.map((item, index) => (
                                            <li key={index} className="text-gray-700">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Patterns */}
                            {analysis.patterns.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Patterns</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {analysis.patterns.map((pattern, index) => (
                                            <li key={index} className="text-gray-700">{pattern}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Context Messages */}
                            {analysis.context && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Context</h3>
                                    <div className="space-y-2">
                                        {analysis.context.map((msg, index) => (
                                            <div key={index} className="bg-gray-50 p-3 rounded">
                                                <div className="text-sm text-gray-500 mb-1">
                                                    {msg.sender.username} • {new Date(msg.created_at).toLocaleString()}
                                                </div>
                                                <p className="text-gray-700">{msg.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Similar Messages */}
                            {analysis.similarMessages?.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Similar Messages</h3>
                                    <div className="space-y-2">
                                        {analysis.similarMessages.map((msg, index) => (
                                            <div key={index} className="bg-gray-50 p-3 rounded">
                                                <div className="text-sm text-gray-500 mb-1">
                                                    {msg.metadata.sender} • Match Score: {(msg.metadata.score * 100).toFixed(1)}%
                                                </div>
                                                <p className="text-gray-700">{msg.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

MessageAnalysis.propTypes = {
    messageId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

export default MessageAnalysis;