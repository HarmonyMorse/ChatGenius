import api from '../api/api';

class ChannelService {
    async createChannel(channelData) {
        const response = await api.post('/api/channels', channelData);
        return response.data;
    }

    async getChannels() {
        const response = await api.get('/api/channels');
        return response.data;
    }

    async getPublicChannels() {
        const response = await api.get('/api/channels/public');
        return response.data;
    }

    async getChannel(channelId) {
        const response = await api.get(`/api/channels/${channelId}`);
        return response.data;
    }

    async updateChannel(channelId, channelData) {
        const response = await api.put(`/api/channels/${channelId}`, channelData);
        return response.data;
    }

    async deleteChannel(channelId) {
        await api.delete(`/api/channels/${channelId}`);
    }

    async joinChannel(channelId) {
        const response = await api.post(`/api/channels/${channelId}/join`);
        return response.data;
    }
}

const channelService = new ChannelService();
export default channelService;
