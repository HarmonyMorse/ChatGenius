import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { ChatOpenAI } from '@langchain/openai';
import fetch from 'node-fetch';

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

// Configure Supabase with fetch options for Node.js
const supabaseOptions = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    global: {
        fetch: fetch,
        headers: { 'x-custom-header': 'chat-genius' }
    }
};

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    supabaseOptions
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

        // Initialize ChatGPT model
        this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

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

    async queryMessages(query, options = {}) {
        const {
            topK = 5,                    // Number of similar messages to retrieve
            minScore = 0.7,              // Minimum similarity score (0-1)
            includeMetadata = true,      // Whether to include metadata in results
        } = options;

        try {
            console.log(`Querying messages with: "${query}"`);

            // Generate embedding for the query
            const queryEmbedding = await this.generate3072DimEmbedding(query);

            // Search Pinecone
            const searchResults = await this.index.query({
                vector: queryEmbedding,
                topK,
                includeMetadata,
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

            console.log(`Found ${relevantMessages.length} relevant messages`);
            return relevantMessages;

        } catch (error) {
            console.error('Error querying messages:', error);
            throw error;
        }
    }

    async generateResponse(query, context) {
        try {
            // Construct the prompt
            const messages = [
                {
                    role: 'system',
                    content: `You are a helpful AI assistant with access to chat message history. 
                    Use the provided message context to answer questions accurately and naturally.
                    If the context doesn't contain relevant information, say so.
                    Always maintain a friendly and professional tone.`
                },
                {
                    role: 'user',
                    content: `Context messages:
                    ${context.map(msg => `[${msg.metadata.sender}]: ${msg.content}`).join('\n')}
                    
                    Question: ${query}`
                }
            ];

            // Generate response
            const response = await this.llm.invoke(messages);
            return response.content;

        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    async askQuestion(query) {
        try {
            // 1. Find relevant messages
            const relevantMessages = await this.queryMessages(query);

            // 2. Generate response using context
            const answer = await this.generateResponse(query, relevantMessages);

            // 3. Return both the answer and the supporting context
            return {
                answer,
                context: relevantMessages
            };

        } catch (error) {
            console.error('Error processing question:', error);
            throw error;
        }
    }
}

export default new RagService();
