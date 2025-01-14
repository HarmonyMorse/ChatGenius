import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

async function validatePineconeUpserts() {
    try {
        console.log('\nStarting Pinecone validation...\n');

        // 1. Check index stats
        console.log('Checking index statistics...');
        const stats = await ragService.getIndexStats();
        console.log('Current index stats:', {
            totalVectorCount: stats.totalVectorCount,
            dimension: stats.dimension,
            namespaces: stats.namespaces
        });

        // 2. Insert a test message with known content
        const testMessage = {
            id: 'validation_test_' + Date.now(),
            content: 'This is a specific validation test message about artificial intelligence and machine learning.',
            metadata: {
                sender: 'validation_user',
                channel: 'validation_channel',
                created_at: new Date().toISOString(),
                type: 'validation'
            }
        };

        // 3. Generate and upsert embedding
        console.log('\nGenerating embedding for test message...');
        const embeddings = await ragService.generateEmbeddings([testMessage]);
        console.log('Upserting test embedding...');
        await ragService.upsertEmbeddings(embeddings);

        // 4. Verify the upsert by checking updated stats
        console.log('\nVerifying upsert with updated stats...');
        const updatedStats = await ragService.getIndexStats();
        console.log('Updated index stats:', {
            totalVectorCount: updatedStats.totalVectorCount,
            dimension: updatedStats.dimension,
            namespaces: updatedStats.namespaces
        });

        // 5. Perform a similarity search
        console.log('\nPerforming similarity search with test query...');
        const testQuery = 'Tell me about AI and ML';
        const queryEmbedding = await ragService.generate3072DimEmbedding(testQuery);

        const searchResults = await ragService.index.query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true
        });

        // 6. Display search results
        console.log('\nSearch Results:');
        searchResults.matches.forEach((match, i) => {
            console.log(`\nMatch ${i + 1} (Score: ${match.score}):`);
            console.log('ID:', match.id);
            console.log('Content:', match.metadata.content);
            console.log('Metadata:', JSON.stringify(match.metadata, null, 2));
        });

        console.log('\nValidation completed successfully!');

        // Return validation summary
        return {
            initialVectorCount: stats.totalVectorCount,
            finalVectorCount: updatedStats.totalVectorCount,
            dimension: updatedStats.dimension,
            searchResultsCount: searchResults.matches.length,
            testMessageFound: searchResults.matches.some(match => match.id === testMessage.id)
        };

    } catch (error) {
        console.error('\nError during validation:', error);
        process.exit(1);
    }
}

// Run validation
validatePineconeUpserts()
    .then(summary => {
        console.log('\nValidation Summary:', JSON.stringify(summary, null, 2));
    })
    .catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    }); 