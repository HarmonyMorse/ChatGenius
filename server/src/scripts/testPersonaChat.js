import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatWithPersona } from '../services/personaService.js';
import supabase from '../config/supabase.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const testMessages = [
    "How's the development going?",
    "Can you help me debug an issue?",
    "What's your opinion on TypeScript?",
    "Tell me about your latest project."
];

async function testPersonaChat() {
    try {
        // 1. Get the dev user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', 'dev')
            .single();

        if (userError) {
            throw new Error(`Error finding dev user: ${userError.message}`);
        }

        if (!user) {
            throw new Error('Dev user not found');
        }

        console.log('Testing chat with dev persona...');

        // 2. Test multiple chat interactions
        for (const message of testMessages) {
            console.log('\nUser:', message);
            const response = await chatWithPersona(user.id, message);
            console.log('Persona:', response);
        }

        console.log('\nAll persona chat tests passed! ✅');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testPersonaChat(); 