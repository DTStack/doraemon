import React, { useEffect, useMemo, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {
    ArrowLeftOutlined,
    CopyOutlined,
    DownloadOutlined,
    FolderOpenOutlined,
    LinkOutlined,
    ReadOutlined,
    ShareAltOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Row, Space, Spin, Tabs, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/lib/tree';

import { API } from '@/api';
import MarkdownRenderer from '@/components/markdownRenderer';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillDetail, SkillFileContent, SkillInstallMeta, SkillItem } from '../types';
import './style.scss';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

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
        const value = normalizeFrontmatterValue(currentValueLines.join('\n'));
        frontmatter.push({ key: currentKey, value });
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

const SkillDetailContent: React.FC<SkillDetailContentProps> = ({ slug, history }) => {
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetail | null>(null);
    const [installMeta, setInstallMeta] = useState<SkillInstallMeta | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);

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
    const deepLinkPath = useMemo(() => `/page/skills/${encodeURIComponent(slug)}`, [slug]);
    const installKey = installMeta?.installKey || detail?.installKey || slug;
    const currentOrigin = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);
    const deepLinkUrl = useMemo(() => {
        if (!currentOrigin) return deepLinkPath;
        return `${currentOrigin}${deepLinkPath}`;
    }, [currentOrigin, deepLinkPath]);
    const skillInstallCommand = useMemo(
        () => `doraemon-skills install ${installKey}`,
        [installKey]
    );
    const cliInstallPlaceholderCommand =
        '# 待提供：Doraemon CLI 安装脚本 URL（例如 curl -fsSL <...> | bash）';
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
    const agentInstruction = useMemo(
        () =>
            [
                '请先检查 Doraemon CLI 是否已安装（例如执行 doraemon-skills --help）。',
                '若未安装，请先执行 Human 区的 Doraemon CLI 安装步骤。',
                `安装当前技能：${skillInstallCommand}`,
                '若已安装，则直接执行上面的技能安装命令。',
            ].join('\n'),
        [skillInstallCommand]
    );
    const isInstallable = Boolean(installMeta?.installable);
    const installUnavailableReason = installMeta?.reason || 'install-meta 暂不可用';

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
                    setSelectedFilePath(defaultFile);

                    const installMetaRes = await API.getSkillInstallMeta({
                        installKey: detailData.installKey || slug,
                    });
                    if (!cancelled && installMetaRes.success) {
                        nextInstallMeta = installMetaRes.data as SkillInstallMeta;
                    }
                } else {
                    setDetail(null);
                    setSelectedFilePath('');
                }

                if (relatedRes.success) {
                    setRelated(relatedRes.data || []);
                } else {
                    setRelated([]);
                }

                setInstallMeta(nextInstallMeta);
            } catch (error) {
                console.error('获取 Skill 详情失败:', error);
                if (!cancelled) {
                    setDetail(null);
                    setRelated([]);
                    setInstallMeta(null);
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
                    if (response.success) {
                        setFileContent(response.data as SkillFileContent);
                    } else {
                        setFileContent(null);
                    }
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
    }, [slug, selectedFilePath]);

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
                customStyle={{ margin: 0, borderRadius: 6, minHeight: 460 }}
                showLineNumbers
            >
                {fileContent.content || ''}
            </SyntaxHighlighter>
        );
    };

    const renderInstallCommandCard = ({
        title,
        description,
        command,
        copyMessage,
        disabled = false,
    }: {
        title: string;
        description?: string;
        command: string;
        copyMessage: string;
        disabled?: boolean;
    }) => (
        <div className="install-command-card">
            <div className="install-command-header">
                <Text className="install-command-title">{title}</Text>
                {description ? <Text type="secondary">{description}</Text> : null}
            </div>
            <div className="command-block">
                <code>{command || '暂无可复制命令'}</code>
                <Button
                    type="text"
                    className="command-copy-btn"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(command, copyMessage)}
                    disabled={disabled || !command}
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
            <div className="page-skill-detail">
                <Empty description="Skill 不存在或已被删除">
                    <Button onClick={() => history.push('/page/skills')}>返回 Skills 列表</Button>
                </Empty>
            </div>
        );
    }

    const detailTags = (detail.tags || []).filter((tag) => tag && tag !== detail.category);
    const detailSource = detail.sourceRepo || detail.sourcePath || '-';
    const detailUpdatedAt = detail.updatedAt
        ? new Date(detail.updatedAt).toLocaleString('zh-CN')
        : '-';
    const agentFallbackInstruction = [
        '当前 skill 不支持 doraemon-skills 直接安装。',
        `请先下载 zip：${downloadCommand}`,
        `原因：${installUnavailableReason}`,
        '然后手动解压并确认技能目录结构（需包含 SKILL.md）。',
    ].join('\n');
    const detailMetaItems = [
        {
            label: 'Stars',
            value: String(detail.stars || 0),
            className: 'is-accent',
        },
        {
            label: '分类',
            value: detail.category || '未分类',
        },
        {
            label: '最近更新',
            value: detailUpdatedAt,
        },
        {
            label: '来源',
            value: detailSource,
            className: 'is-wide',
        },
    ];

    return (
        <div className="page-skill-detail">
            <div className="detail-hero">
                <div className="detail-hero-main">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        className="back-btn"
                        onClick={() => history.push('/page/skills')}
                    >
                        返回列表
                    </Button>

                    <div className="hero-kicker-row">
                        <Tag color="blue">{detail.category || '未分类'}</Tag>
                        <span className="install-key-chip">安装标识 · {installKey}</span>
                    </div>

                    <div className="hero-title-row">
                        <div className="title-group">
                            <Title level={2}>{detail.name}</Title>
                            <Paragraph className="hero-description" type="secondary">
                                {detail.description || '暂无描述'}
                            </Paragraph>
                        </div>

                        <Space size={12} wrap className="hero-action-group">
                            <Button
                                icon={<ShareAltOutlined />}
                                onClick={() =>
                                    copyToClipboard(deepLinkUrl, '详情页深链已复制到剪贴板')
                                }
                            >
                                复制深链
                            </Button>
                            <Button
                                icon={<LinkOutlined />}
                                onClick={() => window.open(sourceUrl, '_blank')}
                                disabled={!sourceUrl}
                            >
                                查看源码
                            </Button>
                        </Space>
                    </div>

                    <div className="hero-meta-grid">
                        {detailMetaItems.map((item) => (
                            <div
                                key={item.label}
                                className={`hero-meta-card ${item.className || ''}`.trim()}
                            >
                                <Text className="hero-meta-label">{item.label}</Text>
                                <div className="hero-meta-value" title={item.value}>
                                    {item.label === 'Stars' ? (
                                        <>
                                            <StarOutlined /> {item.value}
                                        </>
                                    ) : (
                                        item.value
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {detailTags.length > 0 ? (
                        <div className="hero-tag-list">
                            {detailTags.map((tag) => (
                                <Tag key={tag}>{tag}</Tag>
                            ))}
                        </div>
                    ) : null}
                </div>

                <Card className="install-overview-card" bordered={false}>
                    <div className="install-card-header">
                        <div>
                            <Text className="install-card-title">安装方式</Text>
                            <Paragraph className="install-card-caption" type="secondary">
                                {isInstallable
                                    ? '默认展示 Agent 安装路径，并始终基于 installKey 生成用户可见命令。'
                                    : '当前来源暂不支持 Doraemon CLI 直装，保留手动下载与解压的降级路径。'}
                            </Paragraph>
                        </div>
                        <span
                            className={`install-status-tag ${
                                isInstallable ? 'is-ready' : 'is-fallback'
                            }`}
                        >
                            {isInstallable ? 'CLI 可安装' : '需手动接入'}
                        </span>
                    </div>

                    <Tabs defaultActiveKey="agent" className="install-tabs">
                        <TabPane tab="我是 Agent" key="agent">
                            <div className="install-tab-panel">
                                {isInstallable ? (
                                    <>
                                        <Text type="secondary">
                                            先确认 Doraemon CLI 可用，再把下面整段提示发给 Agent
                                            执行。
                                        </Text>
                                        {renderInstallCommandCard({
                                            title: '发给 Agent 的安装提示',
                                            description: '包含 CLI 检查与技能安装两步说明',
                                            command: agentInstruction,
                                            copyMessage: 'Agent 指令已复制到剪贴板',
                                        })}
                                    </>
                                ) : (
                                    <>
                                        <Text strong>当前 skill 需要 Agent 走下载降级路径</Text>
                                        {renderInstallCommandCard({
                                            title: '发给 Agent 的降级说明',
                                            description: installUnavailableReason,
                                            command: agentFallbackInstruction,
                                            copyMessage: '降级指令已复制到剪贴板',
                                        })}
                                    </>
                                )}
                            </div>
                        </TabPane>
                        <TabPane tab="我是 Human" key="human">
                            <div className="install-tab-panel">
                                {isInstallable ? (
                                    <>
                                        {renderInstallCommandCard({
                                            title: '先安装 Doraemon CLI',
                                            description:
                                                '当前项目仍使用占位说明，等待统一安装脚本地址补齐',
                                            command: cliInstallPlaceholderCommand,
                                            copyMessage: 'CLI 安装命令已复制到剪贴板',
                                        })}
                                        {renderInstallCommandCard({
                                            title: '安装当前技能',
                                            description: '复制后可直接在终端执行',
                                            command: skillInstallCommand,
                                            copyMessage: '技能安装命令已复制到剪贴板',
                                        })}
                                    </>
                                ) : (
                                    <>
                                        <Text strong>当前技能暂不支持 Doraemon CLI 直接安装</Text>
                                        <Text type="secondary">
                                            原因：{installUnavailableReason}
                                        </Text>
                                        {renderInstallCommandCard({
                                            title: '手动下载命令',
                                            description: '下载 zip 后手动解压到目标 skills 目录',
                                            command: downloadCommand,
                                            copyMessage: '下载命令已复制到剪贴板',
                                            disabled: !downloadCommand,
                                        })}
                                    </>
                                )}
                            </div>
                        </TabPane>
                    </Tabs>
                </Card>
            </div>

            <Row gutter={[16, 16]} className="detail-main-row">
                <Col xs={24} xl={16}>
                    <Card
                        className="file-tree-card"
                        title={
                            <Space>
                                <FolderOpenOutlined />
                                文件浏览
                            </Space>
                        }
                        bodyStyle={{ padding: '8px 0', maxHeight: 280, overflow: 'auto' }}
                    >
                        {fileTreeData.length === 0 ? (
                            <Empty description="暂无文件" />
                        ) : (
                            <Tree
                                treeData={fileTreeData}
                                selectedKeys={selectedFilePath ? [selectedFilePath] : []}
                                defaultExpandAll
                                onSelect={(keys, info) => {
                                    if (!info.node.isLeaf) return;
                                    const targetPath = String(keys[0] || '');
                                    if (targetPath) {
                                        setSelectedFilePath(targetPath);
                                    }
                                }}
                            />
                        )}
                    </Card>

                    <Card
                        className="file-viewer-card"
                        title={
                            <Space>
                                <ReadOutlined />
                                <Text>{selectedFilePath || '文件预览'}</Text>
                            </Space>
                        }
                        extra={
                            fileContent ? (
                                <Space>
                                    <Tag>{fileContent.language}</Tag>
                                    <Text type="secondary">{formatFileSize(fileContent.size)}</Text>
                                </Space>
                            ) : null
                        }
                    >
                        {renderFileViewer()}
                    </Card>
                </Col>

                <Col xs={24} xl={8}>
                    <Card
                        className="action-card download-card"
                        title="手动下载"
                        extra={<Text>manual</Text>}
                    >
                        <div className="download-buttons">
                            <Button
                                type="primary"
                                block
                                icon={<DownloadOutlined />}
                                onClick={() =>
                                    window.open(installMeta?.downloadUrl || downloadPath, '_blank')
                                }
                            >
                                下载 skill.zip
                            </Button>
                            <div className="command-block">
                                <code>{downloadCommand}</code>
                                <Button
                                    type="text"
                                    className="command-copy-btn"
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                        copyToClipboard(downloadCommand, '下载命令已复制到剪贴板')
                                    }
                                />
                            </div>
                            <Text type="secondary">
                                下载完整技能目录，包含 SKILL.md 与所有相关文件
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card className="related-card-list" title="相关技能推荐">
                {related.length === 0 ? (
                    <Empty description="暂无相关技能推荐" />
                ) : (
                    <Row gutter={[16, 16]}>
                        {related.map((item) => (
                            <Col key={item.slug} xs={24} sm={12} lg={8}>
                                <Card
                                    className="related-item-card"
                                    hoverable
                                    onClick={() => history.push(`/page/skills/${item.slug}`)}
                                >
                                    <div className="related-title">{item.name}</div>
                                    <Paragraph ellipsis={{ rows: 2 }}>
                                        {item.description || '暂无描述'}
                                    </Paragraph>
                                    <Text type="secondary">
                                        <StarOutlined /> {item.stars || 0}
                                    </Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Card>
        </div>
    );
};

export default SkillDetailContent;
