import express from 'express';
import ragService from '../services/ragService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/rag/ask
 * @description Ask a question using RAG (Retrieval-Augmented Generation)
 * @access Private
 */
router.post('/ask', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required'
            });
        }

        // Process the question using RAG
        const result = await ragService.askQuestion(query);

        // Return the answer and context
        res.json({
            success: true,
            answer: result.answer,
            context: result.context
        });

    } catch (error) {
        console.error('Error processing RAG query:', error);
        res.status(500).json({
            error: 'Failed to process query',
            details: error.message
        });
    }
});

/**
 * @route GET /api/rag/stats
 * @description Get statistics about the RAG system
 * @access Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await ragService.getIndexStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching RAG stats:', error);
        res.status(500).json({
            error: 'Failed to fetch stats',
            details: error.message
        });
    }
});

export default router;
