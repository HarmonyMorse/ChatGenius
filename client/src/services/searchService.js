import { supabase } from '../supabaseClient';

class SearchService {
    async searchMessages(query) {
        try {
            // First try full-text search
            const { data: textSearchData, error: textSearchError } = await supabase
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
                .textSearch('content_tsv', query, {
                    type: 'websearch',
                    config: 'english'
                })
                .order('created_at', { ascending: false })
                .limit(10);

            // Then try partial word matches
            const existingIds = (textSearchData || []).map(msg => msg.id);
            const { data: partialMatchData, error: partialMatchError } = await supabase
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
                .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : 'null'})`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (textSearchError || partialMatchError) throw textSearchError || partialMatchError;

            // Combine and deduplicate results
            const combinedResults = [...(textSearchData || []), ...(partialMatchData || [])];
            const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());

            return uniqueResults.slice(0, 20);
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