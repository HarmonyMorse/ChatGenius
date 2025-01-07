import api from '../api/api';

class MessageService {
    async sendMessage(message) {
        const response = await api.post('/api/messages', message);
        return response.data;
    }

    async getChannelMessages(channelId) {
        const response = await api.get(`/api/messages/channel/${channelId}`);
        return response.data;
    }

    async getMessageSender(senderId) {
        try {
            const response = await api.get(`/api/users/${senderId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching sender:', error);
            return {
                id: senderId,
                username: 'Unknown User',
                avatar_url: null
            };
        }
    }

    async editMessage(messageId, content) {
        const response = await api.put(`/api/messages/${messageId}`, { content });
        return response.data;
    }

    async deleteMessage(messageId) {
        const response = await api.delete(`/api/messages/${messageId}`);
        return response.data;
    }
}

const messageService = new MessageService();
export default messageService;