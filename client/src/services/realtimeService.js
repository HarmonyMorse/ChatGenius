import { createClient } from '@supabase/supabase-js';
import reactionService from './reactionService';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

class RealtimeService {
    constructor() {
        this.channels = new Map();
    }

    subscribeToChannel(channelId, onMessage) {
        // If already subscribed to this channel, return existing subscription
        if (this.channels.has(channelId)) {
            return this.channels.get(channelId);
        }

        // Create a new subscription
        const channel = supabase
            .channel(`messages:${channelId}`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                            onMessage({
                                type: 'new_message',
                                message: payload.new
                            });
                            break;
                        case 'UPDATE':
                            onMessage({
                                type: 'message_updated',
                                message: payload.new
                            });
                            break;
                        case 'DELETE':
                            onMessage({
                                type: 'message_deleted',
                                messageId: payload.old.id
                            });
                            break;
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_reactions'
                },
                async (payload) => {
                    try {
                        const messageId = payload.new?.message_id || payload.old?.message_id;
                        if (messageId) {
                            // Use the reactionService instead of direct fetch
                            const reactions = await reactionService.getMessageReactions(messageId);
                            onMessage({
                                type: 'reactions_updated',
                                messageId,
                                reactions
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching updated reactions:', error);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Realtime subscription status for channel ${channelId}:`, status);
            });

        // Store the subscription
        this.channels.set(channelId, channel);
        return channel;
    }

    unsubscribeFromChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelId);
        }
    }

    // Subscribe to typing indicators
    subscribeToTyping(channelId, onTypingUpdate) {
        const channel = supabase
            .channel(`typing:${channelId}`)
            .on('presence', { event: 'sync' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .on('presence', { event: 'join' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .on('presence', { event: 'leave' }, () => {
                const typingUsers = this.getTypingUsers(channel);
                onTypingUpdate(typingUsers);
            })
            .subscribe();

        return channel;
    }

    // Start typing indicator
    async startTyping(channel, user) {
        await channel.track({
            user_id: user.id,
            username: user.username,
            isTyping: true
        });
    }

    // Stop typing indicator
    async stopTyping(channel) {
        await channel.untrack();
    }

    // Get list of users currently typing
    getTypingUsers(channel) {
        const presenceState = channel.presenceState();
        return Object.values(presenceState).flat().filter(user => user.isTyping);
    }
}

const realtimeService = new RealtimeService();
export default realtimeService; 