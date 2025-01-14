import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

// Test message with varying lengths
const testMessages = [
    {
        id: 'test1',
        content: 'This is a short message that should not be chunked.',
        metadata: {
            sender: 'test_user',
            channel: 'test_channel',
            created_at: new Date().toISOString(),
            type: 'user'
        }
    },
    {
        id: 'test2',
        content: `This is a longer message that should be chunked into multiple parts. 
        It contains multiple paragraphs and should demonstrate how the text splitter handles
        different types of content and separators.

        Here's a new paragraph that adds more content to ensure we exceed the chunk size.
        We want to make sure that the chunking process works correctly and maintains context
        between chunks through the overlap mechanism.

        Finally, we'll add some more text to definitely ensure we get multiple chunks.
        The text splitter should handle this appropriately and create multiple chunks
        while maintaining readability and context through the chunk overlap feature.`,
        metadata: {
            sender: 'test_user',
            channel: 'test_channel',
            created_at: new Date().toISOString(),
            type: 'user'
        }
    }
];

async function testMessageChunking() {
    try {
        console.log('\nTesting message chunking...\n');

        for (const message of testMessages) {
            console.log(`Processing message ${message.id}:`);
            console.log('Original length:', message.content.length);

            const chunks = await ragService.chunkMessage(message);

            console.log(`Resulted in ${chunks.length} chunks:`);
            chunks.forEach((chunk, i) => {
                console.log(`\nChunk ${i + 1}/${chunks.length}:`);
                console.log('ID:', chunk.id);
                console.log('Length:', chunk.content.length);
                console.log('Content preview:', chunk.content.substring(0, 50) + '...');
                console.log('Metadata:', JSON.stringify(chunk.metadata, null, 2));
            });
            console.log('\n---\n');
        }

    } catch (error) {
        console.error('\nError testing message chunking:', error);
        process.exit(1);
    }
}

testMessageChunking(); 