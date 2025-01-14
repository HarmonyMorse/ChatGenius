import { getToken } from './auth';

const analysisService = {
    analyzeMessage: async (messageId) => {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/analysis/messages/${messageId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to analyze message');
            }

            // Check if we're getting a stream
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/event-stream')) {
                return response; // Return the response for streaming
            }

            // If not streaming, return regular JSON
            return await response.json();
        } catch (error) {
            console.error('Error analyzing message:', error);
            throw error;
        }
    }
};

export default analysisService;