import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

async function embedMessages(options = {}) {
    const {
        mode = 'full', // 'full' or 'incremental'
        since = null,  // ISO date string for incremental updates
        batchSize = 100,
        dryRun = false
    } = options;

    try {
        console.log(`\nStarting ${mode} embedding process...`);

        // Get initial index stats
        const initialStats = await ragService.getIndexStats();
        console.log('\nCurrent index stats:', {
            totalVectorCount: initialStats.totalVectorCount,
            dimension: initialStats.dimension
        });

        // Fetch messages based on mode
        let messages;
        if (mode === 'incremental' && since) {
            console.log(`\nFetching messages since ${since}...`);
            const { data, error } = await ragService.supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(id, username),
                    channel:channel_id(id, name)
                `)
                .gt('created_at', since)
                .order('created_at', { ascending: true });

            if (error) throw error;
            messages = data;
        } else {
            console.log('\nFetching all messages...');
            messages = await ragService.fetchAllMessages();
        }

        console.log(`\nFound ${messages.length} messages to process`);

        if (dryRun) {
            console.log('\nDRY RUN - No embeddings will be generated or stored');
            return {
                mode,
                messagesFound: messages.length,
                dryRun: true
            };
        }

        // Process messages in batches
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messages.length / batchSize)}`);

            // Generate embeddings
            const embeddings = await ragService.generateEmbeddings(batch);

            // Upsert to Pinecone
            await ragService.upsertEmbeddings(embeddings);

            console.log(`Processed ${Math.min(i + batchSize, messages.length)}/${messages.length} messages`);
        }

        // Get final stats
        const finalStats = await ragService.getIndexStats();

        // Return summary
        const summary = {
            mode,
            messagesProcessed: messages.length,
            initialVectorCount: initialStats.totalVectorCount,
            finalVectorCount: finalStats.totalVectorCount,
            vectorsAdded: finalStats.totalVectorCount - initialStats.totalVectorCount,
            dryRun: false
        };

        console.log('\nEmbedding Summary:', JSON.stringify(summary, null, 2));
        return summary;

    } catch (error) {
        console.error('\nError during embedding process:', error);
        throw error;
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const options = {
    mode: args.includes('--incremental') ? 'incremental' : 'full',
    since: args.find(arg => arg.startsWith('--since='))?.split('=')[1],
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100')
};

// Validate arguments
if (options.mode === 'incremental' && !options.since) {
    console.error('\nError: --since date is required for incremental mode');
    console.log('\nUsage examples:');
    console.log('  Full update:        node embedMessages.js');
    console.log('  Incremental update: node embedMessages.js --incremental --since=2024-03-19T00:00:00Z');
    console.log('  Dry run:            node embedMessages.js --dry-run');
    console.log('  Custom batch size:  node embedMessages.js --batch-size=50');
    process.exit(1);
}

// Run the embedding process
embedMessages(options)
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Failed to complete embedding process:', error);
        process.exit(1);
    }); 