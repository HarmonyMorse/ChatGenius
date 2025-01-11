import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import FileDisplay from './FileDisplay';

function FormattedMessage({ content, file }) {
    return (
        <div>
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
    })
};

export default FormattedMessage;