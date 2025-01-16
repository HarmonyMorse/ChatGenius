import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createOrUpdatePersona, getPersona } from '../services/personaService.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPersonaSummarization() {
    try {
        // 1. Get a test user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .limit(1)
            .single();

        if (userError) {
            throw new Error(`Error getting test user: ${userError.message}`);
        }

        console.log('Testing persona generation for user:', user.username);

        // 2. Generate persona using our service
        console.log('Generating persona...');
        const persona = await createOrUpdatePersona(user.id, user.username);
        console.log('Generated Persona:', persona);

        // 3. Verify we can retrieve it
        console.log('Verifying persona retrieval...');
        const retrievedPersona = await getPersona(user.id);
        console.log('Retrieved Persona:', retrievedPersona);

        if (retrievedPersona.id !== persona.id) {
            throw new Error('Retrieved persona does not match generated persona');
        }

        // 4. Clean up
        console.log('Cleaning up...');
        // const { error: deleteError } = await supabase
        //     .from('personas')
        //     .delete()
        //     .eq('id', persona.id);

        // if (deleteError) {
        //     throw new Error(`Error cleaning up: ${deleteError.message}`);
        // }

        console.log('All persona summarization tests passed! ✅');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testPersonaSummarization(); 