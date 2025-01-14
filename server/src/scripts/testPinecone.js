import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Log environment variables
console.log('Environment variables:');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX);
console.log('ENV file path:', path.join(__dirname, '../../.env'));
console.log('-------------------\n');

async function testPineconeConnection() {
    try {
        // Initialize Pinecone client
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // List all indexes
        console.log('Fetching indexes...');
        const indexes = await pinecone.listIndexes();
        console.log('Available indexes:', indexes);

        // Try to connect to our specific index
        const indexName = process.env.PINECONE_INDEX;
        console.log(`\nConnecting to index: ${indexName}`);
        const index = pinecone.index(indexName);

        // Test a simple query to ensure we can interact with the index
        console.log('\nTesting query capability...');
        const queryResponse = await index.query({
            vector: Array(3072).fill(1), // Default OpenAI embedding dimension
            topK: 1,
            includeMetadata: true
        });
        console.log('Query response:', queryResponse);

        // Test a simple upsert
        console.log('\nTesting upsert capability...');
        const upsertResponse = await index.upsert([{
            id: 'test-vector-1',
            values: Array(3072).fill(1),
            metadata: {
                text: 'This is a test vector'
            }
        }]);
        console.log('Upsert response:', upsertResponse);

        console.log('\nPinecone connection test completed successfully! 🎉');
    } catch (error) {
        console.error('Error testing Pinecone connection:', error);
        process.exit(1);
    }
}

// Run the test
testPineconeConnection(); 