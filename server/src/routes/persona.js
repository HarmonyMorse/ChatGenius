import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createOrUpdatePersona, getPersona, chatWithPersona } from '../services/personaService.js';

const router = express.Router();

/**
 * POST /api/persona/generate
 * Generates or updates a persona for the authenticated user
 */
router.post('/generate', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const personaName = req.body.personaName;

        const persona = await createOrUpdatePersona(userId, personaName);
        res.json({ success: true, persona });
    } catch (error) {
        console.error('Error generating persona:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate persona',
            details: error.message
        });
    }
});

/**
 * GET /api/persona/:userId
 * Retrieves the persona for a specific user
 */
router.get('/:userId', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.params;
        const persona = await getPersona(userId);

        if (!persona) {
            return res.status(404).json({
                success: false,
                error: 'Persona not found'
            });
        }

        res.json({ success: true, persona });
    } catch (error) {
        console.error('Error fetching persona:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch persona',
            details: error.message
        });
    }
});

/**
 * POST /api/persona/:userId/chat
 * Chat with a user's AI persona
 */
router.post('/:userId/chat', authenticateJWT, async (req, res) => {
    try {
        const { userId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const response = await chatWithPersona(userId, message);
        res.json({
            success: true,
            response,
            metadata: {
                timestamp: new Date().toISOString(),
                from_persona_user_id: userId
            }
        });
    } catch (error) {
        console.error('Error chatting with persona:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to chat with persona',
            details: error.message
        });
    }
});

export default router; 