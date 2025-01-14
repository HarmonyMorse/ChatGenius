import dotenv from 'dotenv';
import ragService from '../services/ragService.js';

// Load environment variables
dotenv.config();

console.log('Starting test script...');
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Found' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Missing'
});

async function testFetchMessages() {
    try {
        console.log('\nStarting message fetch test...');
        const messages = await ragService.fetchAllMessages();
        console.log(`\nSuccess! Fetched ${messages.length} messages`);

        if (messages.length > 0) {
            console.log('\nFirst message sample:');
            console.log(JSON.stringify(messages[0], null, 2));
        } else {
            console.log('\nNo messages found in the database');
        }
    } catch (error) {
        console.error('\nError testing message fetch:', error);
        process.exit(1);
    }
}

testFetchMessages(); 