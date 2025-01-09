import PropTypes from 'prop-types';

function FileDisplay({ file }) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isImage) {
        return (
            <div className="mt-2">
                <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-md rounded-lg shadow-sm hover:shadow-md transition-shadow"
                />
                <div className="text-sm text-gray-500 mt-1">
                    {file.name} ({formatFileSize(file.size)})
                </div>
            </div>
        );
    }

    if (isVideo) {
        return (
            <div className="mt-2">
                <video
                    controls
                    className="max-w-md rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                    <source src={file.url} type={file.type} />
                    Your browser does not support the video tag.
                </video>
                <div className="text-sm text-gray-500 mt-1">
                    {file.name} ({formatFileSize(file.size)})
                </div>
            </div>
        );
    }

    if (isAudio) {
        return (
            <div className="mt-2">
                <audio controls className="w-full max-w-md">
                    <source src={file.url} type={file.type} />
                    Your browser does not support the audio tag.
                </audio>
                <div className="text-sm text-gray-500 mt-1">
                    {file.name} ({formatFileSize(file.size)})
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2">
            <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
                <span>{file.name}</span>
                <span className="text-sm text-gray-500">({formatFileSize(file.size)})</span>
            </a>
        </div>
    );
}

FileDisplay.propTypes = {
    file: PropTypes.shape({
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        size: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired
    }).isRequired
};

export default FileDisplay; 