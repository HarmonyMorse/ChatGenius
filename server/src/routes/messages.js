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

        // First get the sender information
        const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', sender_id)
            .single();

        if (senderError) {
            console.error('Error fetching sender:', senderError);
            return res.status(500).json({ message: 'Error fetching sender information' });
        }

        // Create the message with sender information
        const messageData = {
            content,
            sender_id,
            channel_id,
            sender: sender // Include sender info directly
        };

        const { data: message, error: messageError } = await supabase
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

        if (messageError) {
            console.error('Error saving message:', messageError);
            return res.status(500).json({ message: 'Error saving message' });
        }

        // Format the response to match the expected structure
        const formattedMessage = {
            ...message,
            sender: sender
        };

        res.status(201).json(formattedMessage);
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

// Edit a message
router.put('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // First check if the user is the message sender
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(500).json({ message: 'Error fetching message' });
        }

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to edit this message' });
        }

        // Update the message
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content,
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select(`
                *,
                sender:sender_id(id, username, avatar_url)
            `)
            .single();

        if (updateError) {
            console.error('Error updating message:', updateError);
            return res.status(500).json({ message: 'Error updating message' });
        }

        res.json(updatedMessage);
    } catch (error) {
        console.error('Error in message update:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete a message
router.delete('/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // First check if the user is the message sender
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', messageId)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(500).json({ message: 'Error fetching message' });
        }

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }

        // Delete the message
        const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (deleteError) {
            console.error('Error deleting message:', deleteError);
            return res.status(500).json({ message: 'Error deleting message' });
        }

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error in message deletion:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;