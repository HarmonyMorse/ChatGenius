import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { createOrUpdatePersona, getPersona } from '../services/personaService.js';

const router = express.Router();

/**
 * POST /api/persona/generate
 * Generates or updates a persona for the authenticated user
 */
router.post('/generate', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;

        const persona = await createOrUpdatePersona(userId, username);
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

export default router; 