import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

// Load environment variables
dotenv.config();

// Debug logging for environment variables
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Found' : 'Missing');
console.log('Pinecone API Key:', process.env.PINECONE_API_KEY ? 'Found' : 'Missing');
console.log('Pinecone Index:', process.env.PINECONE_INDEX ? 'Found' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing required Supabase environment variables');
}

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

class RagService {
    constructor() {
        // Initialize text splitter with conservative defaults
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,          // Smaller chunks for chat messages
            chunkOverlap: 50,        // Small overlap to maintain context
            separators: ["\n\n", "\n", " ", ""],  // Common message separators
        });

        // Initialize OpenAI embeddings with ada-002 model
        this.embeddings = new OpenAIEmbeddings({
            modelName: "text-embedding-ada-002",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Initialize the index reference
        this.index = this.pinecone.Index(process.env.PINECONE_INDEX);

        // Expose Supabase client
        this.supabase = supabase;
    }

    // Helper to generate 3072-dimensional embeddings
    async generate3072DimEmbedding(text) {
        // Generate two embeddings with slightly different prompts
        const [embedding1, embedding2] = await Promise.all([
            this.embeddings.embedQuery(text),
            this.embeddings.embedQuery(text + " [context]") // Adding a suffix to get a different perspective
        ]);

        // Concatenate the two 1536-dimensional vectors
        return [...embedding1, ...embedding2];
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

    async generateEmbeddings(messages) {
        console.log(`Generating embeddings for ${messages.length} messages/chunks...`);
        const embeddings = [];

        try {
            // Process messages in batches to avoid rate limits
            const batchSize = 20;
            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(messages.length / batchSize)}`);

                // Generate embeddings for the batch
                const batchEmbeddings = await Promise.all(
                    batch.map(async (message) => {
                        const vector = await this.generate3072DimEmbedding(message.content);
                        return {
                            id: message.id,
                            values: vector,
                            metadata: {
                                content: message.content,
                                ...message.metadata
                            }
                        };
                    })
                );

                embeddings.push(...batchEmbeddings);
                console.log(`Processed ${embeddings.length}/${messages.length} messages`);

                // Add a small delay between batches to respect rate limits
                if (i + batchSize < messages.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`Successfully generated ${embeddings.length} embeddings`);
            return embeddings;
        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }

    async upsertEmbeddings(embeddings) {
        console.log(`Upserting ${embeddings.length} embeddings to Pinecone...`);

        try {
            // Process in batches for efficiency
            const batchSize = 100; // Pinecone can handle larger batches
            for (let i = 0; i < embeddings.length; i += batchSize) {
                const batch = embeddings.slice(i, i + batchSize);
                console.log(`Upserting batch ${i / batchSize + 1}/${Math.ceil(embeddings.length / batchSize)}`);

                // Upsert the batch
                await this.index.upsert(batch);

                console.log(`Upserted ${Math.min((i + batchSize), embeddings.length)}/${embeddings.length} embeddings`);
            }

            console.log('Successfully upserted all embeddings to Pinecone');
            return true;
        } catch (error) {
            console.error('Error upserting embeddings to Pinecone:', error);
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

    // Helper method to get index stats
    async getIndexStats() {
        try {
            const stats = await this.index.describeIndexStats();
            return stats;
        } catch (error) {
            console.error('Error getting index stats:', error);
            throw error;
        }
    }
}

export default new RagService();
