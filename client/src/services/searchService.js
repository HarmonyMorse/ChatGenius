import { supabase } from '../supabaseClient';

class SearchService {
    async searchMessages(query) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id (
                        id,
                        username,
                        avatar_url
                    ),
                    channel:channel_id (
                        id,
                        name
                    ),
                    dm:dm_id (
                        id
                    )
                `)
                .ilike('content', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching messages:', error);
            return [];
        }
    }

    async searchChannels(query) {
        try {
            const { data, error } = await supabase
                .from('channels')
                .select(`
                    *,
                    creator:created_by (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching channels:', error);
            return [];
        }
    }

    async searchUsers(query) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, avatar_url, status')
                .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }
}

export default new SearchService();