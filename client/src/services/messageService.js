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
}

const messageService = new MessageService();
export default messageService;