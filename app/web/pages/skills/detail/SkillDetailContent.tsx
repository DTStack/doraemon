import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { Button, Empty, Spin, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/lib/tree';

import { API } from '@/api';
import agentIcon from '@/asset/images/skills-detail-figma/agent.svg';
import chevronDownIcon from '@/asset/images/skills-detail-figma/chevron-down.svg';
import chevronRightIcon from '@/asset/images/skills-detail-figma/chevron-right.svg';
import contributorOne from '@/asset/images/skills-detail-figma/contributor-1.png';
import contributorTwo from '@/asset/images/skills-detail-figma/contributor-2.png';
import copyDarkIcon from '@/asset/images/skills-detail-figma/copy-dark.svg';
import downloadIcon from '@/asset/images/skills-detail-figma/download.svg';
import emptyRelatedIcon from '@/asset/images/skills-detail-figma/empty-related.svg';
import fileDocIcon from '@/asset/images/skills-detail-figma/file-doc.svg';
import folderOpenBlueIcon from '@/asset/images/skills-detail-figma/folder-open-blue.svg';
import heroSkillIcon from '@/asset/images/skills-detail-figma/hero-skill.svg';
import humanIcon from '@/asset/images/skills-detail-figma/human.svg';
import MarkdownRenderer from '@/components/markdownRenderer';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillDetail, SkillFileContent, SkillInstallMeta, SkillItem } from '../types';
import './style.scss';

const { Title, Text, Paragraph } = Typography;

interface SkillTreeNode extends DataNode {
    children?: SkillTreeNode[];
}

interface FrontmatterItem {
    key: string;
    value: string;
}

interface SkillDetailContentProps {
    slug: string;
    history: any;
}

interface FigmaIconProps {
    src: string;
    className?: string;
    alt?: string;
}

type InstallPanelKey = 'agent' | 'human' | null;

const relatedSkillIconUrls = [
    'http://localhost:3845/assets/7abff42ee9b5b6b17c3f0b4350bc40d2918871d6.svg',
    'http://localhost:3845/assets/b2b47e5541ef2b4c45ad4fb4cd42a7290d758d19.svg',
    'http://localhost:3845/assets/46261c14a19d03261c20a3df79aa4c0ed3b263ab.svg',
];

const relatedSkillShellClasses = ['is-blue', 'is-green', 'is-orange'];
const browseMarketArrowIcon = 'http://localhost:3845/assets/d1b40a8f52f64c4290b2006b356fc8b61c18d6fc.svg';

const FigmaIcon: React.FC<FigmaIconProps> = ({ src, className = '', alt = '' }) => (
    <img
        alt={alt}
        aria-hidden="true"
        className={`skill-detail-figma-icon ${className}`.trim()}
        src={src}
    />
);

const formatFileSize = (size = 0) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const sortTreeNodes = (nodes: SkillTreeNode[]) => {
    nodes.sort((a, b) => {
        const aIsLeaf = Boolean(a.isLeaf);
        const bIsLeaf = Boolean(b.isLeaf);
        if (aIsLeaf !== bIsLeaf) return aIsLeaf ? 1 : -1;
        return String(a.title).localeCompare(String(b.title));
    });

    nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
        }
    });
};

const buildFileTreeData = (fileList: string[]): SkillTreeNode[] => {
    const treeData: SkillTreeNode[] = [];

    fileList.forEach((filePath) => {
        const segments = filePath.split('/').filter(Boolean);
        let currentNodes = treeData;
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            const isLeaf = index === segments.length - 1;
            let node = currentNodes.find((item) => item.key === currentPath);

            if (!node) {
                node = {
                    key: currentPath,
                    title: segment,
                    isLeaf,
                    children: isLeaf ? undefined : [],
                };
                currentNodes.push(node);
            }

            if (!isLeaf) {
                node.children = node.children || [];
                currentNodes = node.children;
            }
        });
    });

    sortTreeNodes(treeData);
    return treeData;
};

const normalizeSourceUrl = (sourceRepo: string) => {
    if (!sourceRepo) return '';
    const normalized = sourceRepo.replace(/^git\+/, '').trim();
    const sshMatch = normalized.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch) {
        return `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
    if (/^https?:\/\//.test(normalized)) {
        return normalized.replace(/\.git$/, '');
    }
    return '';
};

const normalizeFrontmatterValue = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '-';
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

const parseMarkdownFrontmatter = (
    markdown = ''
): { frontmatter: FrontmatterItem[]; body: string } => {
    const content = String(markdown || '');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
        return {
            frontmatter: [],
            body: content,
        };
    }

    const block = match[1] || '';
    const lines = block.split(/\r?\n/);
    const frontmatter: FrontmatterItem[] = [];
    let currentKey = '';
    let currentValueLines: string[] = [];

    const pushCurrent = () => {
        if (!currentKey) return;
        frontmatter.push({
            key: currentKey,
            value: normalizeFrontmatterValue(currentValueLines.join('\n')),
        });
    };

    lines.forEach((line) => {
        const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        const isTopLevelKey = Boolean(keyMatch) && !/^\s/.test(line);

        if (isTopLevelKey && keyMatch) {
            pushCurrent();
            currentKey = keyMatch[1];
            currentValueLines = [keyMatch[2] || ''];
            return;
        }

        if (currentKey) {
            currentValueLines.push(line);
        }
    });

    pushCurrent();

    return {
        frontmatter,
        body: content.slice(match[0].length),
    };
};

const formatDownloadCommand = (downloadUrl = '', fileName = 'skill.zip') => {
    if (!downloadUrl) return '';
    return `curl -L "${downloadUrl}" -o ${fileName}`;
};

const formatCompactDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const SkillDetailContent: React.FC<SkillDetailContentProps> = ({ slug, history }) => {
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetail | null>(null);
    const [installMeta, setInstallMeta] = useState<SkillInstallMeta | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [uiSelectedFilePath, setUiSelectedFilePath] = useState('');
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);
    const [activeInstallPanel, setActiveInstallPanel] = useState<InstallPanelKey>('agent');

    const fileTreeData = useMemo(
        () => buildFileTreeData(detail?.fileList || []),
        [detail?.fileList]
    );
    const sourceUrl = useMemo(
        () => normalizeSourceUrl(detail?.sourceRepo || ''),
        [detail?.sourceRepo]
    );
    const downloadPath = useMemo(
        () => `/api/skills/download?slug=${encodeURIComponent(slug)}`,
        [slug]
    );
    const installKey = installMeta?.installKey || detail?.installKey || slug;
    const currentOrigin = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);
    const skillInstallCommand = useMemo(
        () => `doraemon-skills install ${installKey}`,
        [installKey]
    );
    const browseMarketPath = '/page/skills';
    const cliInstallPlaceholderCommand =
        '# 待补齐 Doraemon CLI 安装脚本 URL，例如 curl -fsSL <install.sh> | bash';
    const archiveFileName = useMemo(() => {
        const rawName = detail?.name || slug || 'skill';
        const normalized = rawName
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `${normalized || 'skill'}.zip`;
    }, [detail?.name, slug]);
    const downloadCommand = useMemo(() => {
        if (installMeta?.downloadUrl) {
            return formatDownloadCommand(installMeta.downloadUrl, archiveFileName);
        }
        if (!currentOrigin) {
            return `curl -L "${downloadPath}" -o ${archiveFileName}`;
        }
        return formatDownloadCommand(`${currentOrigin}${downloadPath}`, archiveFileName);
    }, [archiveFileName, currentOrigin, downloadPath, installMeta?.downloadUrl]);
    const frontmatterInfo = useMemo(
        () => parseMarkdownFrontmatter(detail?.skillMd || ''),
        [detail?.skillMd]
    );
    const heroMetaItems = useMemo(
        () => [
            {
                label: '分类',
                value: detail?.category || '通用',
            },
            {
                label: '最近更新',
                value: formatCompactDate(detail?.updatedAt),
            },
        ],
        [detail?.category, detail?.updatedAt]
    );
    const isInstallable = Boolean(installMeta?.installable);
    const manualDownloadUrl = installMeta?.downloadUrl || downloadPath;
    const agentTerminalCommand = isInstallable ? skillInstallCommand : downloadCommand;
    const heroSummary = useMemo(() => {
        const rawText = (detail?.description || '').replace(/\s+/g, ' ').trim();
        if (!rawText) return '暂无描述';
        const sentence = rawText.split(/(?<=[.!?。！？])/)[0]?.trim() || rawText;
        return sentence;
    }, [detail?.description]);
    const handleSelectFile = (nextPath: string) => {
        if (!nextPath || nextPath === uiSelectedFilePath) return;
        setUiSelectedFilePath(nextPath);
        setSelectedFilePath(nextPath);
        setFileContent(null);
        setFileLoading(true);
    };

    useEffect(() => {
        setUiSelectedFilePath('');
        setSelectedFilePath('');
        setFileContent(null);
        setFileLoading(false);
        setInstallMeta(null);
    }, [slug]);

    useEffect(() => {
        let cancelled = false;

        const loadDetail = async () => {
            setLoading(true);
            try {
                const [detailRes, relatedRes] = await Promise.all([
                    API.getSkillDetail({ slug }),
                    API.getRelatedSkills({ slug, limit: 6 }),
                ]);

                if (cancelled) return;

                let nextInstallMeta: SkillInstallMeta | null = null;

                if (detailRes.success) {
                    const detailData = detailRes.data as SkillDetail;
                    setDetail(detailData);
                    const defaultFile = detailData.fileList.includes('SKILL.md')
                        ? 'SKILL.md'
                        : detailData.fileList[0] || '';
                    setUiSelectedFilePath(defaultFile);
                    setSelectedFilePath(defaultFile);
                    setFileContent(null);
                    setFileLoading(Boolean(defaultFile));

                    const installMetaRes = await API.getSkillInstallMeta({
                        installKey: detailData.installKey || slug,
                    });
                    if (!cancelled && installMetaRes.success) {
                        nextInstallMeta = installMetaRes.data as SkillInstallMeta;
                    }
                } else {
                    setDetail(null);
                    setUiSelectedFilePath('');
                    setSelectedFilePath('');
                }

                setRelated(relatedRes.success ? relatedRes.data || [] : []);
                setInstallMeta(nextInstallMeta);
            } catch (error) {
                console.error('获取 Skill 详情失败:', error);
                if (!cancelled) {
                    setDetail(null);
                    setRelated([]);
                    setInstallMeta(null);
                    setUiSelectedFilePath('');
                    setSelectedFilePath('');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDetail();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    useEffect(() => {
        if (!selectedFilePath) {
            setFileContent(null);
            return;
        }

        let cancelled = false;

        const loadFileContent = async () => {
            setFileLoading(true);
            try {
                const response = await API.getSkillFileContent({
                    slug,
                    path: selectedFilePath,
                });
                if (!cancelled) {
                    setFileContent(response.success ? (response.data as SkillFileContent) : null);
                }
            } catch (error) {
                console.error('获取文件内容失败:', error);
                if (!cancelled) {
                    setFileContent(null);
                }
            } finally {
                if (!cancelled) {
                    setFileLoading(false);
                }
            }
        };

        loadFileContent();

        return () => {
            cancelled = true;
        };
    }, [selectedFilePath, slug]);

    const renderFileViewer = () => {
        if (fileLoading) {
            return (
                <div className="file-viewer-loading">
                    <Spin size="large" />
                </div>
            );
        }

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

    const renderInlineCommand = (command: string, copyMessage: string, compact = false) => (
        <div className={`command-surface is-light ${compact ? 'is-compact' : ''}`.trim()}>
            <div className="command-surface-inline">
                <div className="command-inline-code-wrap">
                    <code>{command || '暂无可复制命令'}</code>
                </div>
                <Button
                    type="text"
                    className="command-copy-btn is-inline-copy"
                    icon={<FigmaIcon src={copyDarkIcon} className="is-copy-dark" />}
                    onClick={() => copyToClipboard(command, copyMessage)}
                    disabled={!command}
                />
            </div>
        </div>
    );

    const renderTerminalCommand = (command: string, copyMessage: string) => (
        <div className="command-surface is-dark is-terminal">
            <div className="terminal-head">
                <div className="terminal-dots">
                    <span />
                    <span />
                    <span />
                </div>
                <span className="terminal-label">BASH</span>
            </div>
            <div className="terminal-body">
                <span className="terminal-prompt">$</span>
                <code>{command || '暂无可复制命令'}</code>
                <Button
                    type="text"
                    className="command-copy-btn is-terminal-copy"
                    icon={<FigmaIcon src={copyDarkIcon} className="is-copy-dark" />}
                    onClick={() => copyToClipboard(command, copyMessage)}
                    disabled={!command}
                />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="page-skill-detail loading-wrap">
                <Spin size="large" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="page-skill-detail page-skill-detail-empty">
                <Empty description="技能不存在或已被删除">
                    <Button onClick={() => history.push('/page/skills')}>返回技能列表</Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className="page-skill-detail">
            <div className="skill-detail-shell">
                <aside className="detail-left-sidebar">
                    <div className="sidebar-head">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => history.push('/page/skills')}
                            className="back-btn"
                        />
                        <div className="sidebar-title-group">
                            <span>技能目录</span>
                            <strong>{detail?.version || '-'}</strong>
                        </div>
                    </div>

                    <div className="sidebar-tree-wrap">
                        {fileTreeData.length === 0 ? (
                            <Empty description="暂无文件" />
                        ) : (
                            <Tree
                                treeData={fileTreeData}
                                defaultExpandAll
                                selectable={false}
                                titleRender={(node) => (
                                    <span
                                        className={`explorer-tree-item ${
                                            node.key === uiSelectedFilePath ? 'is-selected' : ''
                                        }`.trim()}
                                        role={node.isLeaf ? 'button' : undefined}
                                        tabIndex={node.isLeaf ? 0 : -1}
                                        onClick={() => {
                                            if (!node.isLeaf) return;
                                            handleSelectFile(String(node.key));
                                        }}
                                        onKeyDown={(event) => {
                                            if (!node.isLeaf) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                handleSelectFile(String(node.key));
                                            }
                                        }}
                                    >
                                        <FigmaIcon
                                            src={node.isLeaf ? fileDocIcon : folderOpenBlueIcon}
                                            className={`is-tree-node ${
                                                node.isLeaf ? 'is-leaf' : 'is-folder'
                                            }`}
                                        />
                                        <span>{String(node.title)}</span>
                                    </span>
                                )}
                            />
                        )}
                    </div>

                    <div className="sidebar-foot">
                        <Button
                            type="primary"
                            block
                            className="install-primary-btn"
                            onClick={() => {
                                setActiveInstallPanel('agent');
                                copyToClipboard(
                                    isInstallable ? skillInstallCommand : downloadCommand,
                                    isInstallable
                                        ? '技能安装命令已复制到剪贴板'
                                        : '下载命令已复制到剪贴板'
                                );
                            }}
                        >
                            {isInstallable ? '安装技能' : '下载技能'}
                        </Button>
                        <button
                            type="button"
                            className="sidebar-help-btn"
                            onClick={() =>
                                window.open(
                                    sourceUrl || 'https://github.com/JackWang032/doraemon-proxy-tool',
                                    '_blank'
                                )
                            }
                        >
                            <QuestionCircleOutlined />
                            <span>帮助</span>
                        </button>
                    </div>
                </aside>

                <main className="detail-main-column">
                    <section className="detail-hero-main">
                        <div className="hero-head-row">
                            <div className="hero-title-block">
                                <div className="skill-title-icon" aria-hidden="true">
                                    <FigmaIcon src={heroSkillIcon} className="is-hero" />
                                </div>
                                <div className="hero-copy">
                                    <Title level={2}>{detail.name}</Title>
                                    <Paragraph className="hero-description">{heroSummary}</Paragraph>
                                </div>
                            </div>

                            <div className="hero-actions">
                                <div className="hero-stat-chip">
                                    <span>☆</span>
                                    <strong>{detail.stars || 0}</strong>
                                </div>
                                <Button
                                    type="primary"
                                    className="hero-fork-btn"
                                    onClick={() => window.open(sourceUrl, '_blank')}
                                    disabled={!sourceUrl}
                                >
                                    Fork
                                </Button>
                            </div>
                        </div>

                        <div className="hero-meta-row">
                            {heroMetaItems.map((item) => (
                                <div key={item.label} className="hero-meta-item">
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            ))}
                        </div>

                    </section>

                    <section className="document-panel">
                        <div className="document-toolbar">
                            <div className="document-toolbar-left">
                                <FigmaIcon src={fileDocIcon} className="is-article" />
                                <span>{uiSelectedFilePath || 'SKILL.md'}</span>
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
                                {renderFileViewer()}
                            </div>
                        </div>
                    </section>
                </main>

                <aside className="detail-right-sidebar">
                    <section className="install-panel">
                        <div className="sidebar-section-title">安装方式</div>

                        <div
                            className={`install-option-card ${
                                activeInstallPanel === 'agent' ? 'is-active' : ''
                            }`.trim()}
                        >
                            <button
                                type="button"
                                className="install-option-trigger"
                                onClick={() =>
                                    setActiveInstallPanel((current) =>
                                        current === 'agent' ? null : 'agent'
                                    )
                                }
                                aria-expanded={activeInstallPanel === 'agent'}
                            >
                                <div className="install-option-meta">
                                    <span
                                        className="install-option-icon-shell is-agent"
                                        aria-hidden="true"
                                    >
                                        <FigmaIcon
                                            src={agentIcon}
                                            className="is-option-icon is-agent-icon"
                                        />
                                    </span>
                                    <div>
                                        <div className="install-option-title">智能体</div>
                                        <div className="install-option-description">
                                            {isInstallable
                                                ? '自动化安装'
                                                : '下载后安装'}
                                        </div>
                                    </div>
                                </div>
                                <FigmaIcon
                                    src={
                                        activeInstallPanel === 'agent'
                                            ? chevronDownIcon
                                            : chevronRightIcon
                                    }
                                    className={
                                        activeInstallPanel === 'agent'
                                            ? 'is-chevron'
                                            : 'is-chevron-right'
                                    }
                                />
                            </button>
                            <div
                                className={`install-option-body ${
                                    activeInstallPanel === 'agent' ? 'is-open' : 'is-closed'
                                }`.trim()}
                            >
                                <div className="install-option-body-inner">
                                    {renderTerminalCommand(
                                        agentTerminalCommand,
                                        isInstallable
                                            ? 'Agent 安装命令已复制到剪贴板'
                                            : '下载命令已复制到剪贴板',
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className={`install-option-card is-collapsed ${
                                activeInstallPanel === 'human' ? 'is-active' : ''
                            }`.trim()}
                        >
                            <button
                                type="button"
                                className="install-option-trigger"
                                onClick={() =>
                                    setActiveInstallPanel(
                                        activeInstallPanel === 'human' ? null : 'human'
                                    )
                                }
                                aria-expanded={activeInstallPanel === 'human'}
                            >
                                <div className="install-option-meta">
                                    <span
                                        className="install-option-icon-shell is-human"
                                        aria-hidden="true"
                                    >
                                        <FigmaIcon
                                            src={humanIcon}
                                            className="is-option-icon is-human-icon"
                                        />
                                    </span>
                                    <div>
                                        <div className="install-option-title">手动安装</div>
                                        <div className="install-option-description">
                                            手动配置
                                        </div>
                                    </div>
                                </div>
                                <FigmaIcon
                                    src={
                                        activeInstallPanel === 'human'
                                            ? chevronDownIcon
                                            : chevronRightIcon
                                    }
                                    className={
                                        activeInstallPanel === 'human'
                                            ? 'is-chevron'
                                            : 'is-chevron-right'
                                    }
                                />
                            </button>
                            <div
                                className={`install-option-body ${
                                    activeInstallPanel === 'human' ? 'is-open' : 'is-closed'
                                }`.trim()}
                            >
                                <div className="install-option-body-inner">
                                    <div className="human-command-card">
                                        <div className="human-command-title">先安装 Doraemon CLI</div>
                                        {renderInlineCommand(
                                            cliInstallPlaceholderCommand,
                                            'CLI 安装命令已复制到剪贴板',
                                            false
                                        )}
                                    </div>
                                    <div className="human-command-card">
                                        <div className="human-command-title">再安装当前技能</div>
                                        {renderInlineCommand(
                                            isInstallable ? skillInstallCommand : downloadCommand,
                                            isInstallable
                                                ? '技能安装命令已复制到剪贴板'
                                                : '下载命令已复制到剪贴板',
                                            false
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="download-panel">
                        <div className="sidebar-section-title">手动下载</div>
                        <Button
                            type="default"
                            block
                            className="download-btn"
                            onClick={() => window.open(manualDownloadUrl, '_blank')}
                        >
                            <FigmaIcon src={downloadIcon} className="is-download" />
                            下载 .zip
                        </Button>
                        {renderInlineCommand(downloadCommand, '下载命令已复制到剪贴板', true)}
                    </section>

                    <section className="related-panel">
                        <div className="sidebar-section-title">相关技能</div>
                        {related.length === 0 ? (
                            <div className="related-empty-state">
                                <FigmaIcon src={emptyRelatedIcon} className="is-empty-related" />
                                <span>暂无相关技能</span>
                            </div>
                        ) : (
                            <>
                                <div className="related-list">
                                    {related.map((item, index) => (
                                        <button
                                            key={item.slug}
                                            type="button"
                                            className="related-item"
                                            onClick={() => {
                                                if (item.slug === slug) return;
                                                history.push(`/page/skills/${item.slug}`);
                                            }}
                                        >
                                            <span
                                                className={`related-item-icon-shell ${
                                                    relatedSkillShellClasses[
                                                        index % relatedSkillShellClasses.length
                                                    ]
                                                }`}
                                                aria-hidden="true"
                                            >
                                                <FigmaIcon
                                                    src={
                                                        relatedSkillIconUrls[
                                                            index % relatedSkillIconUrls.length
                                                        ]
                                                    }
                                                    className="is-related-skill-icon"
                                                />
                                            </span>
                                            <div className="related-item-copy">
                                                <strong>{item.name}</strong>
                                                <span className="related-item-description">
                                                    {item.description || '暂无描述'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="browse-market-link"
                                    onClick={() => history.push(browseMarketPath)}
                                >
                                    <span>浏览市场</span>
                                    <FigmaIcon
                                        src={browseMarketArrowIcon}
                                        className="is-browse-market-arrow"
                                    />
                                </button>
                            </>
                        )}
                    </section>

                    <section className="meta-panel">
                        <div className="meta-row">
                            <span>仓库大小</span>
                            <strong>{fileContent ? formatFileSize(fileContent.size) : '1.2 MB'}</strong>
                        </div>
                        <div className="meta-row">
                            <span>近 30 天下载</span>
                            <strong>842</strong>
                        </div>
                        <div className="meta-row is-contributors">
                            <span>贡献者</span>
                            <div className="contributors-stack">
                                <img alt="contributor 1" src={contributorOne} />
                                <img alt="contributor 2" src={contributorTwo} />
                                <span>+3</span>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default SkillDetailContent;
