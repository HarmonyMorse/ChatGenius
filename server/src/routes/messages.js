import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Create a new message
router.post('/', authenticateJWT, async (req, res) => {
    try {
        const { content, channel_id } = req.body;
        const sender_id = req.user.id;

        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                content,
                sender_id,
                channel_id
            })
            .select(`
                *,
                sender:sender_id(id, username, avatar_url)
            `)
            .single();

        if (error) {
            console.error('Error saving message:', error);
            return res.status(500).json({ message: 'Error saving message' });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error in message creation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get messages for a channel
router.get('/channel/:channelId', authenticateJWT, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { limit = 50 } = req.query;

        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username, avatar_url)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ message: 'Error fetching messages' });
        }

        res.json(messages);
    } catch (error) {
        console.error('Error in message retrieval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;