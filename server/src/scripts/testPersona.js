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

async function testPersonaTable() {
    try {
        // 1. First get a test user (or create one if needed)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .limit(1)
            .single();

        if (userError) {
            throw new Error(`Error getting test user: ${userError.message}`);
        }

        // 2. Test inserting a persona
        const testPersona = {
            user_id: user.id,
            persona_name: 'Test Persona',
            persona_description: 'A test persona description'
        };

        console.log('Inserting test persona...');
        const { data: insertedPersona, error: insertError } = await supabase
            .from('personas')
            .insert(testPersona)
            .select()
            .single();

        if (insertError) {
            throw new Error(`Error inserting persona: ${insertError.message}`);
        }
        console.log('Successfully inserted persona:', insertedPersona);

        // 3. Test updating the persona
        console.log('Updating persona...');
        const { data: updatedPersona, error: updateError } = await supabase
            .from('personas')
            .update({ persona_description: 'Updated test description' })
            .eq('id', insertedPersona.id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Error updating persona: ${updateError.message}`);
        }
        console.log('Successfully updated persona:', updatedPersona);

        // 4. Test retrieving the persona
        console.log('Retrieving persona...');
        const { data: retrievedPersona, error: retrieveError } = await supabase
            .from('personas')
            .select('*')
            .eq('id', insertedPersona.id)
            .single();

        if (retrieveError) {
            throw new Error(`Error retrieving persona: ${retrieveError.message}`);
        }
        console.log('Successfully retrieved persona:', retrievedPersona);

        // 5. Test deleting the persona
        console.log('Deleting test persona...');
        const { error: deleteError } = await supabase
            .from('personas')
            .delete()
            .eq('id', insertedPersona.id);

        if (deleteError) {
            throw new Error(`Error deleting persona: ${deleteError.message}`);
        }
        console.log('Successfully deleted test persona');

        console.log('All persona table tests passed! ✅');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testPersonaTable();
