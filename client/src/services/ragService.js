import api from './api';

const ragService = {
    /**
     * Ask a question using RAG
     * @param {string} query - The user's question
     * @returns {Promise<{answer: string, context: Array}>} The AI's answer and supporting context
     */
    async askQuestion(query) {
        try {
            console.log('RAG Service: Making request with query:', query);
            console.log('RAG Service: API base URL:', api.defaults.baseURL);
            console.log('RAG Service: Auth token present:', !!localStorage.getItem('auth_token'));

            const response = await api.post('/rag/ask', { query });
            console.log('RAG Service: Received response:', response.data);
            return response.data;
        } catch (error) {
            console.error('RAG Service: Error details:', {
                message: error.message,
                response: error.response,
                data: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            throw error;
        }
    },

    /**
     * Get RAG system statistics
     * @returns {Promise<Object>} System statistics
     */
    async getStats() {
        try {
            const response = await api.get('/rag/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching RAG stats:', error);
            throw error;
        }
    }
};

export default ragService;
