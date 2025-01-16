import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample messages that represent a developer's communication style
const sampleMessages = [
    "Just pushed the new authentication middleware. Can someone review the PR?",
    "Found a bug in the user service - it's not properly handling concurrent requests. Working on a fix.",
    "The performance improvements we made last week reduced API latency by 40%. Here's the metrics: [link]",
    "I think we should refactor the database schema to normalize the user preferences table.",
    "Anyone else experiencing issues with the WebSocket connections in the staging environment?",
    "Updated the documentation for the new API endpoints. Let me know if anything needs clarification.",
    "The memory leak was caused by an unclosed database connection in the error handler. Fixed now.",
    "Going to implement rate limiting on the public API endpoints to prevent abuse.",
    "Code review feedback addressed - simplified the error handling and added more unit tests.",
    "The new caching layer is working great! Response times are down to <50ms.",
    "Need help debugging this weird race condition in the message queue processor.",
    "Just deployed v2.0.0 to production. Everything looks stable so far.",
    "We should consider using TypeScript for better type safety and developer experience.",
    "Created a new GitHub Actions workflow for automated dependency updates.",
    "The frontend build is failing because of an outdated webpack config. I'll take a look.",
    "Implemented the new search feature using Elasticsearch. It's much faster now!",
    "Don't forget to update your .env files with the new configuration variables.",
    "The integration tests are failing on CI but work locally. Investigating...",
    "Added error boundaries to prevent the entire app from crashing on component errors.",
    "We need to upgrade Node.js version in production before the EOL date.",
    "The database backup script wasn't running due to incorrect cron syntax. Fixed.",
    "Optimized the image processing pipeline - it's now 3x faster.",
    "Remember to use the new logging format we agreed on in the tech spec.",
    "The API documentation is now automatically generated from our OpenAPI spec.",
    "Found a security vulnerability in one of our dependencies. Updating ASAP."
];

async function uploadDevMessages() {
    try {
        // 1. Get the dev user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', 'dev')
            .single();

        if (userError) {
            throw new Error(`Error finding dev user: ${userError.message}`);
        }

        if (!user) {
            throw new Error('Dev user not found');
        }

        console.log('Found dev user:', user.id);

        // 2. Get the general channel
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('id')
            .eq('name', 'general')
            .single();

        if (channelError) {
            throw new Error(`Error finding general channel: ${channelError.message}`);
        }

        if (!channel) {
            throw new Error('General channel not found');
        }

        console.log('Found general channel:', channel.id);

        // 3. Upload messages with random timestamps over the last week
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const messageData = sampleMessages.map(content => {
            const randomTime = new Date(
                oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime())
            );

            return {
                content,
                sender_id: user.id,
                channel_id: channel.id,
                created_at: randomTime.toISOString(),
                updated_at: randomTime.toISOString()
            };
        });

        console.log('Uploading messages...');
        const { error: insertError } = await supabase
            .from('messages')
            .insert(messageData);

        if (insertError) {
            throw new Error(`Error inserting messages: ${insertError.message}`);
        }

        console.log(`Successfully uploaded ${sampleMessages.length} messages for dev user! ✅`);
    } catch (error) {
        console.error('Script failed:', error.message);
        process.exit(1);
    }
}

uploadDevMessages(); 