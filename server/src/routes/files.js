import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateJWT } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { uploadFileToAws, getFileUrl } from '../utils/awsS3connect.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const uniquePrefix = uuidv4();
        cb(null, uniquePrefix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add file type restrictions if needed
        cb(null, true);
    }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Upload file route
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { channelId, messageContent } = req.body;
        const userId = req.user.id;

        // Upload file to S3
        const s3Key = `files/${req.file.filename}`;
        await uploadFileToAws(s3Key, req.file.path);

        // Get the S3 URL
        const fileUrl = await getFileUrl(s3Key);

        // Save file metadata to database
        const { data: file, error: fileError } = await supabase
            .from('files')
            .insert({
                name: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size,
                url: fileUrl,
                uploader_id: userId
            })
            .select()
            .single();

        if (fileError) {
            console.error('Error saving file metadata:', fileError);
            return res.status(500).json({ message: 'Error saving file metadata' });
        }

        // Create a message with the file
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                content: messageContent || `Shared a file: ${req.file.originalname}`,
                sender_id: userId,
                channel_id: channelId,
                file_id: file.id
            })
            .select(`
                *,
                sender:sender_id(id, username, avatar_url),
                file:file_id(*)
            `)
            .single();

        if (messageError) {
            console.error('Error creating message:', messageError);
            return res.status(500).json({ message: 'Error creating message' });
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error in file upload:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router; 