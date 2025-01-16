import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { getUser } from '../services/auth';
import FileDisplay from './FileDisplay';
import EditMessageForm from './EditMessageForm';
import bookmarkService from '../services/bookmarkService';
import { supabase } from '../supabaseClient';
import MessageAnalysis from './MessageAnalysis';

function FormattedMessage({ content, file, message, onEdit, onPin }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const currentUser = getUser();
    const isOwner = message && currentUser.id === message.sender.id;

    useEffect(() => {
        const checkBookmarkStatus = async () => {
            if (!message) return;
            try {
                const { data } = await supabase
                    .from('bookmarked_messages')
                    .select('message_id')
                    .eq('message_id', message.id)
                    .maybeSingle();
                setIsBookmarked(!!data);
            } catch (error) {
                console.error('Error checking bookmark status:', error);
            }
        };

        checkBookmarkStatus();
    }, [message]);

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

    const handlePin = () => {
        onPin(message.id);
    };

    const handleBookmark = async () => {
        try {
            const isNowBookmarked = await bookmarkService.toggleBookmark(message.id);
            setIsBookmarked(isNowBookmarked);
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    if (isEditing) {
        return <EditMessageForm message={message} onSave={handleSave} onCancel={handleCancel} />;
    }

    return (
        <div className="group relative">
            <div className="prose prose-sm max-w-none prose-invert">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ children }) => <p className="my-1 text-accent1">{children}</p>,
                        a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {children}
                            </a>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside my-1 text-accent1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside my-1 text-accent1">{children}</ol>,
                        code: ({ inline, children }) => (
                            inline ? (
                                <code className="bg-secondary/10 px-1 py-0.5 rounded text-sm text-accent1">{children}</code>
                            ) : (
                                <pre className="bg-secondary/10 p-2 rounded overflow-x-auto">
                                    <code className="text-accent1">{children}</code>
                                </pre>
                            )
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-secondary/20 pl-4 my-2 text-accent1/80">
                                {children}
                            </blockquote>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
            {file && <FileDisplay file={file} />}
            {(isOwner || onPin) && (
                <div className="mt-1 flex items-center space-x-2">
                    {isOwner && onEdit && (
                        <button
                            onClick={handleEdit}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                        </button>
                    )}
                    {onPin && (
                        <button
                            onClick={handlePin}
                            className={`text-xs flex items-center ${message.pinned
                                ? 'text-yellow-600 hover:text-yellow-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {message.pinned ? 'Pinned' : 'Pin'}
                        </button>
                    )}
                    <button
                        onClick={handleBookmark}
                        className={`text-xs flex items-center space-x-1 ${isBookmarked
                            ? 'text-blue-600 hover:text-blue-700'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                    </button>
                    <button
                        onClick={() => setShowAnalysis(true)}
                        className="text-xs flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Analyze</span>
                    </button>
                </div>
            )}
            {showAnalysis && (
                <MessageAnalysis
                    messageId={message.id}
                    onClose={() => setShowAnalysis(false)}
                />
            )}
        </div>
    );
}

FormattedMessage.propTypes = {
    content: PropTypes.string.isRequired,
    file: PropTypes.object,
    message: PropTypes.shape({
        id: PropTypes.string,
        sender: PropTypes.shape({
            id: PropTypes.string
        }),
        pinned: PropTypes.bool
    }),
    onEdit: PropTypes.func,
    onPin: PropTypes.func
};

export default FormattedMessage;