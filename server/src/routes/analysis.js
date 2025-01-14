import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import analysisService from '../services/analysisService.js';

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

        // Check cache first
        const { data: cachedAnalysis, error: cacheError } = await supabase
            .from('message_analyses')
            .select('*')
            .eq('message_id', messageId)
            .limit(1)
            .single();

        // If we have a recent cached analysis (less than 1 hour old), return it
        if (cachedAnalysis && !cacheError) {
            const cacheAge = Date.now() - new Date(cachedAnalysis.created_at).getTime();
            if (cacheAge < 3600000) { // 1 hour in milliseconds
                return res.json({
                    success: true,
                    message: 'Analysis retrieved from cache',
                    data: cachedAnalysis.analysis_data,
                    cached: true,
                    cacheAge: Math.round(cacheAge / 1000) // Convert to seconds
                });
            }
        }

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

        // Send initial response to indicate analysis has started
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Send status update
        const sendUpdate = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        sendUpdate('status', {
            status: 'started',
            message: 'Analysis started'
        });

        // Get message context and perform analysis
        const result = await analysisService.getMessageContext(messageId);

        // Cache the analysis result
        const { error: insertError } = await supabase
            .from('message_analyses')
            .upsert({
                message_id: messageId,
                analysis_data: result,
                created_at: new Date().toISOString(),
                created_by: userId
            });

        if (insertError) {
            console.error('Error caching analysis:', insertError);
        }

        // Send final result
        sendUpdate('result', {
            success: true,
            message: 'Analysis completed successfully',
            data: result
        });

        // End the stream
        res.end();

    } catch (error) {
        console.error('Error analyzing message:', error);
        // If headers haven't been sent yet, send error as regular JSON
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to analyze message',
                details: error.message
            });
        } else {
            // If we're in SSE mode, send error as event
            res.write(`event: error\ndata: ${JSON.stringify({
                error: 'Failed to analyze message',
                details: error.message
            })}\n\n`);
            res.end();
        }
    }
});

export default router; 