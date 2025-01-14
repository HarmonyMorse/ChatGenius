import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * @route POST /api/analysis/messages/:messageId
 * @description Analyze a specific message using AI
 * @access Private
 */
router.post('/messages/:messageId', authenticateJWT, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // Fetch the target message and verify access
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username),
                channel:channel_id(id, name)
            `)
            .eq('id', messageId)
            .limit(1)
            .single();

        if (messageError) {
            console.error('Error fetching message:', messageError);
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify user has access to the message
        if (message.channel_id) {
            // For channel messages, check channel membership
            const { data: membership, error: membershipError } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('channel_id', message.channel_id)
                .eq('user_id', userId)
                .limit(1)
                .single();

            if (membershipError || !membership) {
                return res.status(403).json({ message: 'Not authorized to analyze this message' });
            }
        } else if (message.dm_id) {
            // For DM messages, check DM membership
            const { data: dmMembership, error: dmError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('dm_id', message.dm_id)
                .eq('user_id', userId)
                .limit(1)
                .single();

            if (dmError || !dmMembership) {
                return res.status(403).json({ message: 'Not authorized to analyze this message' });
            }
        }

        // TODO: Implement message analysis logic here
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'Message analysis endpoint created',
            data: {
                messageId,
                content: message.content,
                sender: message.sender.username,
                channel: message.channel?.name || 'Direct Message'
            }
        });

    } catch (error) {
        console.error('Error analyzing message:', error);
        res.status(500).json({
            error: 'Failed to analyze message',
            details: error.message
        });
    }
});

export default router; 