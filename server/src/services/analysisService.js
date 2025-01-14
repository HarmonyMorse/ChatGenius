import { createClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
}

if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error('Missing Pinecone credentials');
}

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

        // Initialize OpenAI embeddings
        this.embeddings = new OpenAIEmbeddings({
            modelName: "text-embedding-3-large",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Initialize Pinecone
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Initialize the index reference
        this.index = this.pinecone.Index(process.env.PINECONE_INDEX);
    }

    // Helper to generate embeddings for a message
    async generateEmbedding(text) {
        try {
            // Generate a single embedding using text-embedding-3-large (3072 dimensions)
            return await this.embeddings.embedQuery(text);
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    // Search for similar messages in the conversation history
    async findSimilarMessages(messageContent, options = {}) {
        const {
            topK = 3,                    // Number of similar messages to retrieve
            minScore = 0.7,              // Minimum similarity score (0-1)
            includeMetadata = true       // Whether to include metadata in results
        } = options;

        try {
            // Generate embedding for the message
            const queryEmbedding = await this.generateEmbedding(messageContent);

            // Search Pinecone
            const searchResults = await this.index.query({
                vector: queryEmbedding,
                topK,
                includeMetadata
            });

            // Filter and format results
            const relevantMessages = searchResults.matches
                .filter(match => match.score >= minScore)
                .map(match => ({
                    content: match.metadata.content,
                    metadata: {
                        score: match.score,
                        sender: match.metadata.sender,
                        channel: match.metadata.channel,
                        created_at: match.metadata.created_at,
                        type: match.metadata.type
                    }
                }));

            return relevantMessages;

        } catch (error) {
            console.error('Error finding similar messages:', error);
            throw error;
        }
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

            // After getting processedMessages, find similar messages
            const targetContent = processedMessages[processedMessages.length - 1].content;
            const similarMessages = await this.findSimilarMessages(targetContent);

            return {
                targetMessage,
                context: processedMessages,
                similarMessages,  // Add similar messages from history
                conversationType: targetMessage.channel_id ? 'channel' : 'dm',
                conversationId: targetMessage.channel_id || targetMessage.dm_id
            };

        } catch (error) {
            console.error('Error in getMessageContext:', error);
            throw error;
        }
    }

    // Helper to prepare a message for embedding
    async prepareMessageForEmbedding(message) {
        // Combine relevant fields into a single text for embedding
        const textToEmbed = `
            Message: ${message.content}
            Sender: ${message.sender?.username || 'Unknown'}
            Channel: ${message.channel?.name || 'Direct Message'}
            Type: ${message.type || 'user'}
        `.trim();

        const vector = await this.generateEmbedding(textToEmbed);

        return {
            id: message.id,
            values: vector,
            metadata: {
                content: message.content,
                sender: message.sender?.username,
                channel: message.channel?.name,
                created_at: message.created_at,
                type: message.type || 'user'
            }
        };
    }

    // Add a new message to the vector store
    async indexMessage(message) {
        try {
            const embedding = await this.prepareMessageForEmbedding(message);
            await this.index.upsert([embedding]);
            return true;
        } catch (error) {
            console.error('Error indexing message:', error);
            throw error;
        }
    }
}

export default new AnalysisService(); 