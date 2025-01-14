import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Load environment variables
dotenv.config();

// Debug logging for environment variables
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

class RagService {
    constructor() {
        // Initialize text splitter with conservative defaults
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,          // Smaller chunks for chat messages
            chunkOverlap: 50,        // Small overlap to maintain context
            separators: ["\n\n", "\n", " ", ""],  // Common message separators
        });
    }

    async chunkMessage(message) {
        try {
            if (!message.content || message.content.length <= this.textSplitter.chunkSize) {
                // If message is small enough, return as single chunk
                return [{
                    id: message.id,
                    content: message.content,
                    metadata: message.metadata,
                    chunk_index: 0
                }];
            }

            // Split the message content into chunks
            const chunks = await this.textSplitter.splitText(message.content);

            // Map chunks back to our message format
            return chunks.map((chunk, index) => ({
                id: `${message.id}_chunk_${index}`,
                content: chunk,
                metadata: {
                    ...message.metadata,
                    chunk_index: index,
                    total_chunks: chunks.length,
                    original_message_id: message.id
                }
            }));
        } catch (error) {
            console.error('Error chunking message:', error);
            throw error;
        }
    }

    async fetchAllMessages() {
        console.log("Fetching all messages for RAG processing...");
        console.log("Using Supabase URL:", process.env.SUPABASE_URL);

        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(id, username),
                    channel:channel_id(id, name)
                `)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
                throw error;
            }

            console.log(`Successfully fetched ${messages?.length || 0} messages from database`);

            // Transform messages into a format suitable for RAG
            const transformedMessages = messages.map(message => ({
                id: message.id,
                content: message.content,
                metadata: {
                    sender: message.sender?.username || 'system',
                    channel: message.channel?.name || 'direct_message',
                    created_at: message.created_at,
                    type: message.type || 'user'
                }
            }));

            // Process each message and chunk if necessary
            const processedMessages = [];
            for (const message of transformedMessages) {
                const chunks = await this.chunkMessage(message);
                processedMessages.push(...chunks);
            }

            console.log(`Transformed and chunked messages. Final count: ${processedMessages.length}`);
            return processedMessages;
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            throw error;
        }
    }
}

export default new RagService();
