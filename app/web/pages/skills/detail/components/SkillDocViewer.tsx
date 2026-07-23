import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { Empty, Spin } from 'antd';

import fileDocIcon from '@/asset/images/skills-detail-figma/file-doc.svg';
import MarkdownRenderer from '@/components/markdownRenderer';
import { SkillFileContent } from '../../types';
import { parseMarkdownFrontmatter } from '../utils/skillDetailUtils';
import { DetailIcon } from './DetailIcon';

interface SkillDocViewerProps {
    selectedFilePath: string;
    fileLoading: boolean;
    fileContent: SkillFileContent | null;
}

const renderFileBody = (fileContent: SkillFileContent | null) => {
    if (!fileContent) {
        return <Empty description="请选择需要查看的文件" />;
    }

    if (fileContent.isBinary) {
        return <Empty description="二进制文件暂不支持在线预览" />;
    }

    if (fileContent.language === 'markdown') {
        const parsedMarkdown = parseMarkdownFrontmatter(fileContent.content || '');
        return (
            <div className="markdown-file-viewer">
                {parsedMarkdown.frontmatter.length > 0 ? (
                    <div className="frontmatter-table-wrap">
                        <table className="frontmatter-table">
                            <tbody>
                                {parsedMarkdown.frontmatter.map((item) => {
                                    const isCodeStyle =
                                        item.value.includes('\n') ||
                                        item.value.startsWith('{') ||
                                        item.value.startsWith('[');
                                    return (
                                        <tr key={item.key}>
                                            <th>{item.key}</th>
                                            <td>
                                                {isCodeStyle ? (
                                                    <pre className="frontmatter-code">
                                                        {item.value}
                                                    </pre>
                                                ) : (
                                                    <span>{item.value}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
                {parsedMarkdown.body.trim() ? (
                    <MarkdownRenderer content={parsedMarkdown.body} />
                ) : null}
            </div>
        );
    }

    return (
        <SyntaxHighlighter
            style={atomOneLight}
            language={fileContent.language || 'text'}
            customStyle={{ margin: 0, borderRadius: 0, minHeight: 420, background: '#fff' }}
            showLineNumbers
        >
            {fileContent.content || ''}
        </SyntaxHighlighter>
    );
};

export const SkillDocViewer: React.FC<SkillDocViewerProps> = ({
    selectedFilePath,
    fileLoading,
    fileContent,
}) => (
    <section className="document-panel">
        <div className="document-toolbar">
            <div className="document-toolbar-left">
                <DetailIcon src={fileDocIcon} className="is-article" />
                <span>{selectedFilePath || 'SKILL.md'}</span>
            </div>
            <div className="document-toolbar-right">
                {fileLoading ? (
                    <span className="document-loading-indicator">
                        <Spin size="small" />
                    </span>
                ) : null}
                <span />
                <span />
                <span />
            </div>
        </div>
        <div className="document-scroll-area">
            <div className="document-content-shell">
                {fileLoading ? (
                    <div className="file-viewer-loading">
                        <Spin size="large" />
                    </div>
                ) : (
                    renderFileBody(fileContent)
                )}
            </div>
        </div>
    </section>
);
