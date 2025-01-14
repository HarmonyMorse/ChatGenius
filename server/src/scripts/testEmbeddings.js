import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

async function testEmbeddings() {
    try {
        console.log('\nStarting embedding test...\n');

        // Test with a small set of messages
        const testMessages = [
            {
                id: 'test1',
                content: 'Hello, this is a test message.',
                metadata: {
                    sender: 'test_user',
                    channel: 'test_channel',
                    created_at: new Date().toISOString(),
                    type: 'user'
                }
            },
            {
                id: 'test2',
                content: 'This is another test message with different content.',
                metadata: {
                    sender: 'test_user',
                    channel: 'test_channel',
                    created_at: new Date().toISOString(),
                    type: 'user'
                }
            }
        ];

        // Generate embeddings
        console.log('Generating embeddings for test messages...');
        const embeddings = await ragService.generateEmbeddings(testMessages);

        // Verify the results
        console.log('\nEmbedding Results:');
        embeddings.forEach((embedding, i) => {
            console.log(`\nEmbedding ${i + 1}/${embeddings.length}:`);
            console.log('ID:', embedding.id);
            console.log('Vector dimensions:', embedding.values.length);
            console.log('First 5 vector values:', embedding.values.slice(0, 5));
            console.log('Metadata:', JSON.stringify(embedding.metadata, null, 2));
        });

    } catch (error) {
        console.error('\nError testing embeddings:', error);
        process.exit(1);
    }
}

testEmbeddings(); 