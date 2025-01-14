import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

async function testPineconeUpsert() {
    try {
        console.log('\nStarting Pinecone upsert test...\n');

        // First, get initial index stats
        console.log('Getting initial index stats...');
        const initialStats = await ragService.getIndexStats();
        console.log('Initial vector count:', initialStats.totalVectorCount);

        // Test with a small set of messages
        const testMessages = [
            {
                id: 'test1',
                content: 'Hello, this is a test message for Pinecone.',
                metadata: {
                    sender: 'test_user',
                    channel: 'test_channel',
                    created_at: new Date().toISOString(),
                    type: 'user'
                }
            },
            {
                id: 'test2',
                content: 'This is another test message with different content for Pinecone.',
                metadata: {
                    sender: 'test_user',
                    channel: 'test_channel',
                    created_at: new Date().toISOString(),
                    type: 'user'
                }
            }
        ];

        // Generate embeddings
        console.log('\nGenerating embeddings for test messages...');
        const embeddings = await ragService.generateEmbeddings(testMessages);
        console.log(`Generated ${embeddings.length} embeddings`);

        // Upsert to Pinecone
        console.log('\nUpserting embeddings to Pinecone...');
        await ragService.upsertEmbeddings(embeddings);

        // Get final stats
        console.log('\nGetting final index stats...');
        const finalStats = await ragService.getIndexStats();
        console.log('Final vector count:', finalStats.totalVectorCount);

        console.log('\nTest completed successfully!');

    } catch (error) {
        console.error('\nError testing Pinecone upsert:', error);
        process.exit(1);
    }
}

testPineconeUpsert(); 