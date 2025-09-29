import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './style.scss';

interface MarkdownRendererProps {
    content: string;
    className?: string;
    style?: React.CSSProperties;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
    content, 
    className = '',
    style 
}) => {
    return (
        <div className={`markdown-renderer ${className}`} style={style}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        
                        if (inline) {
                            return (
                                <code className="inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }
                        
                        return (
                            <div className="code-block-wrapper">
                                {language && (
                                    <div className="code-block-header">
                                        <span className="language-tag">{language}</span>
                                    </div>
                                )}
                                <pre className={`code-block ${className || ''}`}>
                                    <code {...props}>
                                        {children}
                                    </code>
                                </pre>
                            </div>
                        );
                    },
                    // 自定义表格样式
                    table: ({ children }) => (
                        <div className="table-wrapper">
                            <table className="markdown-table">{children}</table>
                        </div>
                    ),
                    // 自定义引用块样式
                    blockquote: ({ children }) => (
                        <blockquote className="markdown-blockquote">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
