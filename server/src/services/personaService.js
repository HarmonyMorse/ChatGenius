import { ChatOpenAI } from '@langchain/openai';
import supabase from '../config/supabase.js';

const chatOpenAI = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7
});

/**
 * Fetches recent messages for a user
 * @param {string} userId - The user's ID
 * @param {number} limit - Maximum number of messages to fetch (default 50)
 * @returns {Promise<Array>} Array of messages
 */
async function fetchUserMessages(userId, limit = 50) {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`Error fetching messages: ${error.message}`);
    return messages;
}

/**
 * Generates a persona description based on user's messages
 * @param {Array} messages - Array of user messages
 * @returns {Promise<string>} Generated persona description
 */
async function generatePersonaDescription(messages) {
    if (!messages || messages.length === 0) {
        throw new Error('No messages provided for persona generation');
    }

    const textSample = messages.map(m => m.content).join('\n\n');

    const response = await chatOpenAI.invoke([
        {
            role: 'system',
            content: `You are an expert at analyzing communication styles and patterns.
                     Your task is to create a detailed persona description that captures:
                     1. Writing style and tone
                     2. Common topics and interests
                     3. Notable patterns or quirks
                     4. Level of formality
                     5. Emotional expression patterns
                     
                     Keep the description concise but detailed enough to capture the essence of the person's communication style.`
        },
        {
            role: 'user',
            content: `Analyze these messages and create a comprehensive persona description:\n\n${textSample}`
        }
    ]);

    return response.content;
}

/**
 * Creates or updates a user's persona
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @returns {Promise<Object>} The created/updated persona
 */
async function createOrUpdatePersona(userId, username) {
    try {
        // 1. Fetch user's recent messages
        const messages = await fetchUserMessages(userId);

        if (messages.length === 0) {
            throw new Error('No messages found for persona generation');
        }

        // 2. Generate persona description
        const personaDescription = await generatePersonaDescription(messages);

        // 3. Check if user already has a persona
        const { data: existingPersona } = await supabase
            .from('personas')
            .select('id')
            .eq('user_id', userId)
            .single();

        // 4. Create or update the persona
        const personaData = {
            user_id: userId,
            persona_name: `${username}'s Persona`,
            persona_description: personaDescription
        };

        if (existingPersona) {
            // Update existing persona
            const { data: updatedPersona, error } = await supabase
                .from('personas')
                .update(personaData)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return updatedPersona;
        } else {
            // Create new persona
            const { data: newPersona, error } = await supabase
                .from('personas')
                .insert(personaData)
                .select()
                .single();

            if (error) throw error;
            return newPersona;
        }
    } catch (error) {
        throw new Error(`Error creating/updating persona: ${error.message}`);
    }
}

/**
 * Retrieves a user's persona
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} The user's persona
 */
async function getPersona(userId) {
    const { data: persona, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) throw new Error(`Error fetching persona: ${error.message}`);
    return persona;
}

export {
    createOrUpdatePersona,
    getPersona,
    generatePersonaDescription,
    fetchUserMessages
}; 