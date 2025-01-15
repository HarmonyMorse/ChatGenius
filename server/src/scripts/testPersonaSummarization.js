import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const chatOpenAI = new ChatOpenAI({
    openAIApiKey: openaiKey,
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7
});

async function testPersonaSummarization() {
    try {
        // 1. Get a test user with messages
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .limit(1)
            .single();

        if (userError) {
            throw new Error(`Error getting test user: ${userError.message}`);
        }

        // 2. Fetch user's messages
        console.log('Fetching messages for user:', user.username);
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('content')
            .eq('sender_id', user.id)
            .limit(50);  // Get last 50 messages for testing

        if (messagesError) {
            throw new Error(`Error fetching messages: ${messagesError.message}`);
        }

        if (!messages || messages.length === 0) {
            throw new Error('No messages found for test user');
        }

        // 3. Generate persona summary using ChatGPT
        console.log('Generating persona summary...');
        const textSample = messages.map(m => m.content).join('\n\n');

        const response = await chatOpenAI.invoke([
            {
                role: 'system',
                content: 'You are an AI that summarizes the style of a user based on their chat messages.'
            },
            {
                role: 'user',
                content: `Analyze these messages and describe the user's writing style, tone, common topics, and any notable quirks:\n\n${textSample}`
            }
        ]);

        const personaSummary = response.content;
        console.log('Generated Persona Summary:', personaSummary);

        // 4. Store the persona summary
        const personaData = {
            user_id: user.id,
            persona_name: `${user.username}'s Persona`,
            persona_description: personaSummary
        };

        console.log('Storing persona summary...');
        const { data: storedPersona, error: storeError } = await supabase
            .from('personas')
            .insert(personaData)
            .select()
            .single();

        if (storeError) {
            throw new Error(`Error storing persona: ${storeError.message}`);
        }

        console.log('Successfully stored persona:', storedPersona);

        // 5. Clean up - delete test persona
        console.log('Cleaning up...');
        const { error: deleteError } = await supabase
            .from('personas')
            .delete()
            .eq('id', storedPersona.id);

        if (deleteError) {
            throw new Error(`Error cleaning up: ${deleteError.message}`);
        }

        console.log('All persona summarization tests passed! ✅');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testPersonaSummarization(); 