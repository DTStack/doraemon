import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
                className='md-theme-juejin-light'
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    code(props) {
                        const { children, className, node, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                            <SyntaxHighlighter
                                {...rest}
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                style={oneLight}
                            />
                        ) : (
                            <code {...rest} className={className}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {content || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
