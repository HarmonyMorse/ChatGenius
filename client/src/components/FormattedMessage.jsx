import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { getUser } from '../services/auth';
import FileDisplay from './FileDisplay';
import EditMessageForm from './EditMessageForm';
import bookmarkService from '../services/bookmarkService';
import { supabase } from '../supabaseClient';
import MessageAnalysis from './MessageAnalysis';

function FormattedMessage({ content, file, message, onEdit, onPin, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef(null);
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
                setShowMoreMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = () => {
        setIsEditing(true);
        setShowMoreMenu(false);
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
        setShowMoreMenu(false);
    };

    const handleBookmark = async () => {
        try {
            const isNowBookmarked = await bookmarkService.toggleBookmark(message.id);
            setIsBookmarked(isNowBookmarked);
            setShowMoreMenu(false);
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const handleAnalyze = () => {
        setShowAnalysis(true);
        setShowMoreMenu(false);
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            onDelete(message.id);
            setShowMoreMenu(false);
        }
    };

    if (isEditing) {
        return <EditMessageForm message={message} onSave={handleSave} onCancel={handleCancel} />;
    }

    return (
        <div className="group relative">
            {(isOwner || onPin) && (
                <div className="absolute top-0 right-0" ref={moreMenuRef}>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="text-xs text-accent1/60 hover:text-accent1/80 flex items-center space-x-1 p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </button>
                    {showMoreMenu && (
                        <div className="absolute top-0 right-0 mt-8 w-48 rounded-md shadow-lg bg-primary ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu">
                                {isOwner && onEdit && (
                                    <button
                                        onClick={handleEdit}
                                        className="flex items-center w-full px-4 py-2 text-sm text-accent1 hover:bg-secondary/20"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                )}
                                {isOwner && onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center w-full px-4 py-2 text-sm text-accent2 hover:bg-secondary/20"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                    </button>
                                )}
                                {onPin && (
                                    <button
                                        onClick={handlePin}
                                        className="flex items-center w-full px-4 py-2 text-sm text-accent1 hover:bg-secondary/20"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 013 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L7 4.323V3a1 1 0 011-1h2z" />
                                        </svg>
                                        {message.pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                )}
                                <button
                                    onClick={handleBookmark}
                                    className="flex items-center w-full px-4 py-2 text-sm text-accent1 hover:bg-secondary/20"
                                    role="menuitem"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    className="flex items-center w-full px-4 py-2 text-sm text-accent1 hover:bg-secondary/20"
                                    role="menuitem"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Analyze
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
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
    onPin: PropTypes.func,
    onDelete: PropTypes.func
};

export default FormattedMessage;