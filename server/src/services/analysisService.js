import { createClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

class AnalysisService {
    constructor() {
        // Initialize text splitter with conservative defaults
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,          // Smaller chunks for chat messages
            chunkOverlap: 50,        // Small overlap to maintain context
            separators: ["\n\n", "\n", " ", ""],  // Common message separators
        });
    }

    async getMessageContext(messageId) {
        try {
            // 1. Fetch target message with its details
            const { data: targetMessage, error: messageError } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(id, username),
                    channel:channel_id(id, name)
                `)
                .eq('id', messageId)
                .limit(1)
                .single();

            if (messageError) {
                console.error('Error fetching target message:', messageError);
                throw messageError;
            }

            // 2. Get 5 previous messages from the same conversation
            const query = supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(id, username),
                    channel:channel_id(id, name)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            // Add appropriate conversation filter
            if (targetMessage.channel_id) {
                query.eq('channel_id', targetMessage.channel_id);
            } else if (targetMessage.dm_id) {
                query.eq('dm_id', targetMessage.dm_id);
            }

            // Only get messages before the target message
            query.lt('created_at', targetMessage.created_at);

            const { data: previousMessages, error: contextError } = await query;

            if (contextError) {
                console.error('Error fetching context messages:', contextError);
                throw contextError;
            }

            // 3. Combine and format messages
            const allMessages = [
                ...previousMessages.reverse(), // Reverse to get chronological order
                targetMessage
            ];

            // 4. Process messages for analysis
            const processedMessages = await Promise.all(
                allMessages.map(async (msg) => {
                    // If message is too long, chunk it
                    if (msg.content && msg.content.length > this.textSplitter.chunkSize) {
                        const chunks = await this.textSplitter.splitText(msg.content);
                        return {
                            ...msg,
                            content: chunks[0], // Use first chunk for now
                            isChunked: true,
                            totalChunks: chunks.length
                        };
                    }
                    return msg;
                })
            );

            return {
                targetMessage,
                context: processedMessages,
                conversationType: targetMessage.channel_id ? 'channel' : 'dm',
                conversationId: targetMessage.channel_id || targetMessage.dm_id
            };

        } catch (error) {
            console.error('Error in getMessageContext:', error);
            throw error;
        }
    }
}

export default new AnalysisService(); 