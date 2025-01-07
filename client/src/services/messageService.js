import api from '../api/api';

class MessageService {
    async sendMessage(message) {
        const response = await api.post('/api/messages', message);
        return response.data;
    }

    async getChannelMessages(channelId, limit = 50) {
        const response = await api.get(`/api/messages/channel/${channelId}?limit=${limit}`);
        return response.data;
    }
}

const messageService = new MessageService();
export default messageService;