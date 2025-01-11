import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { getUser } from '../services/auth';
import FileDisplay from './FileDisplay';
import EditMessageForm from './EditMessageForm';

function FormattedMessage({ content, file, message, onEdit }) {
    const [isEditing, setIsEditing] = useState(false);
    const currentUser = getUser();
    const isOwner = currentUser.id === message.sender.id;

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async (newContent) => {
        await onEdit(message.id, newContent);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    if (isEditing) {
        return <EditMessageForm message={message} onSave={handleSave} onCancel={handleCancel} />;
    }

    return (
        <div className="group relative">
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Override default element styling
                        p: ({ children }) => <p className="my-1">{children}</p>,
                        a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {children}
                            </a>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside my-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside my-1">{children}</ol>,
                        code: ({ inline, children }) =>
                            inline ? (
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
                            ) : (
                                <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                                    <code>{children}</code>
                                </pre>
                            ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-gray-200 pl-4 my-2 text-gray-600">
                                {children}
                            </blockquote>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
            {file && <FileDisplay file={file} />}
            {isOwner && (
                <button
                    onClick={handleEdit}
                    className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

FormattedMessage.propTypes = {
    content: PropTypes.string.isRequired,
    file: PropTypes.shape({
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        size: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired
    }),
    message: PropTypes.shape({
        id: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        sender: PropTypes.shape({
            id: PropTypes.string.isRequired
        }).isRequired
    }).isRequired,
    onEdit: PropTypes.func.isRequired
};

export default FormattedMessage;