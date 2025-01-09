const API_BASE_URL = 'http://localhost:3000/api';

const uploadFile = async (file, channelId, messageContent = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);
    if (messageContent) {
        formData.append('messageContent', messageContent);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error uploading file');
    }

    return response.json();
};

export default {
    uploadFile
};

