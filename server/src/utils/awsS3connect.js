import { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

export const uploadFileToAws = async (fileName, filePath) => {
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: fs.createReadStream(filePath),
        };

        await s3Client.send(new PutObjectCommand(uploadParams)).then((data) => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file after upload:', err);
                    } else {
                        console.log('File deleted successfully');
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error uploading file to AWS S3:', error);
        throw error;
    }
};

export const getFileUrl = async (fileName, expireTime = null) => {
    try {
        const check = await isFileAvailable(fileName);

        if (!check) {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileName
            });

            if (expireTime !== null) {
                const url = await getSignedUrl(s3Client, command, {
                    expiresIn: expireTime
                });
                return url;
            } else {
                const url = await getSignedUrl(s3Client, command);
                return url;
            }
        } else {
            return error;
        }
    } catch (error) {
        console.error('Error getting file URL from AWS S3:', error);
        throw error;
    }
};

export const isFileAvailable = async (fileName) => {
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
        }));
        return true;
    } catch (error) {
        return false;
    }
};

export const deleteFile = async (fileName) => {
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName
        };
        await s3Client.send(new DeleteObjectCommand(uploadParams)).then((data) => {
            console.log('File deleted successfully');
        });
    } catch (error) {
        console.error('Error deleting file from AWS S3:', error);
        return 'error';
    }
};
