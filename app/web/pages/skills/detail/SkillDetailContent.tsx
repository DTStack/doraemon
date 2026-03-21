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
import {
    Button,
    Card,
    Col,
    Empty,
    Row,
    Space,
    Spin,
    Tabs,
    Tag,
    Tree,
    Typography,
} from 'antd';
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
    mode?: 'page' | 'modal';
    history?: any;
    onClose?: () => void;
    onOpenSkill?: (nextSlug: string) => void;
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

const parseMarkdownFrontmatter = (markdown = ''): { frontmatter: FrontmatterItem[]; body: string } => {
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

const SkillDetailContent: React.FC<SkillDetailContentProps> = ({
    slug,
    mode = 'page',
    history,
    onClose,
    onOpenSkill,
}) => {
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetail | null>(null);
    const [installMeta, setInstallMeta] = useState<SkillInstallMeta | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);

    const isModal = mode === 'modal';
    const fileTreeData = useMemo(() => buildFileTreeData(detail?.fileList || []), [detail?.fileList]);
    const sourceUrl = useMemo(() => normalizeSourceUrl(detail?.sourceRepo || ''), [detail?.sourceRepo]);
    const downloadPath = useMemo(() => `/api/skills/download?slug=${encodeURIComponent(slug)}`, [slug]);
    const deepLinkPath = useMemo(() => `/page/skills/${encodeURIComponent(slug)}`, [slug]);
    const currentOrigin = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);
    const deepLinkUrl = useMemo(() => {
        if (!currentOrigin) return deepLinkPath;
        return `${currentOrigin}${deepLinkPath}`;
    }, [currentOrigin, deepLinkPath]);
    const serverArg = currentOrigin || '<current origin>';
    const skillInstallCommand = useMemo(
        () => `doraemon-skills install ${slug} --server ${serverArg}`,
        [slug, serverArg]
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
                '若未安装，请先执行 Human 区的 Doraemon CLI 安装步骤（当前安装脚本 URL 待提供）。',
                `安装当前技能：${skillInstallCommand}`,
                '若安装目录不明确，请先询问用户，可使用 --dir <path> 指定目标目录。',
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
                const [detailRes, relatedRes, installMetaRes] = await Promise.all([
                    API.getSkillDetail({ slug }),
                    API.getRelatedSkills({ slug, limit: 6 }),
                    API.getSkillInstallMeta({ slug }),
                ]);

                if (cancelled) return;

                if (detailRes.success) {
                    const detailData = detailRes.data as SkillDetail;
                    setDetail(detailData);
                    const defaultFile = detailData.fileList.includes('SKILL.md')
                        ? 'SKILL.md'
                        : detailData.fileList[0] || '';
                    setSelectedFilePath(defaultFile);
                } else {
                    setDetail(null);
                    setSelectedFilePath('');
                }

                if (relatedRes.success) {
                    setRelated(relatedRes.data || []);
                } else {
                    setRelated([]);
                }

                if (installMetaRes.success) {
                    setInstallMeta(installMetaRes.data as SkillInstallMeta);
                } else {
                    setInstallMeta(null);
                }
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

    if (loading) {
        return (
            <div className={`page-skill-detail${isModal ? ' modal-skill-detail' : ''} loading-wrap`}>
                <Spin size="large" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className={`page-skill-detail${isModal ? ' modal-skill-detail' : ''}`}>
                <Empty description="Skill 不存在或已被删除">
                    {isModal ? (
                        <Button onClick={onClose}>关闭</Button>
                    ) : (
                        <Button onClick={() => history.push('/page/skills')}>返回 Skills 列表</Button>
                    )}
                </Empty>
            </div>
        );
    }

    return (
        <div className={`page-skill-detail${isModal ? ' modal-skill-detail' : ''}`}>
            <div className="detail-header">
                {!isModal ? (
                    <Button
                        icon={<ArrowLeftOutlined />}
                        className="back-btn"
                        onClick={() => history.push('/page/skills')}
                    >
                        返回列表
                    </Button>
                ) : null}
                <div className="title-group">
                    <Title level={2}>{detail.name}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {detail.description || '暂无描述'}
                    </Paragraph>
                    <Text type="secondary">slug: {detail.slug}</Text>
                </div>
            </div>

            <Card className="meta-card">
                <Space size={20} wrap>
                    <Text>
                        <StarOutlined /> Stars: {detail.stars || 0}
                    </Text>
                    <Text>分类: {detail.category || '未分类'}</Text>
                    <Text>更新: {new Date(detail.updatedAt).toLocaleString('zh-CN')}</Text>
                    <Text>来源: {detail.sourceRepo || detail.sourcePath}</Text>
                </Space>
                <div className="tags-wrap">
                    {(detail.tags || []).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </div>
            </Card>

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
                    <Card className="action-card" title="安装方式">
                        <Tabs defaultActiveKey="human">
                            <TabPane tab="我是 Human" key="human">
                                {isInstallable ? (
                                    <div className="install-tab-panel">
                                        <Text type="secondary">先安装 Doraemon CLI（脚本地址当前待提供）</Text>
                                        <div className="command-block">
                                            <code>{cliInstallPlaceholderCommand}</code>
                                            <Button
                                                type="text"
                                                className="command-copy-btn"
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        cliInstallPlaceholderCommand,
                                                        'CLI 安装说明已复制到剪贴板'
                                                    )
                                                }
                                            />
                                        </div>
                                        <Text type="secondary">安装当前技能</Text>
                                        <div className="command-block">
                                            <code>{skillInstallCommand}</code>
                                            <Button
                                                type="text"
                                                className="command-copy-btn"
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        skillInstallCommand,
                                                        '技能安装命令已复制到剪贴板'
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="install-tab-panel">
                                        <Text strong>当前技能暂不支持 Doraemon CLI 直接安装</Text>
                                        <Text type="secondary">
                                            {`原因：${installUnavailableReason}`}
                                        </Text>
                                        <div className="command-block">
                                            <code>{downloadCommand}</code>
                                            <Button
                                                type="text"
                                                className="command-copy-btn"
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        downloadCommand,
                                                        '下载命令已复制到剪贴板'
                                                    )
                                                }
                                                disabled={!downloadCommand}
                                            />
                                        </div>
                                        <Text type="secondary">
                                            请下载 zip 后手动解压到目标 skills 目录，再按本地流程接入。
                                        </Text>
                                    </div>
                                )}
                            </TabPane>
                            <TabPane tab="我是 Agent" key="agent">
                                {isInstallable ? (
                                    <div className="install-tab-panel">
                                        <Text type="secondary">复制以下指令给 Agent 执行</Text>
                                        <div className="command-block">
                                            <code>{agentInstruction}</code>
                                            <Button
                                                type="text"
                                                className="command-copy-btn"
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        agentInstruction,
                                                        'Agent 指令已复制到剪贴板'
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="install-tab-panel">
                                        <Text strong>Agent 请走降级路径</Text>
                                        <div className="command-block">
                                            <code>
                                                {[
                                                    '当前 skill 不支持 doraemon-skills 直接安装。',
                                                    `请先下载 zip：${downloadCommand}`,
                                                    `原因：${installUnavailableReason}`,
                                                    '然后手动解压并确认技能目录结构（需包含 SKILL.md）。',
                                                ].join('\n')}
                                            </code>
                                            <Button
                                                type="text"
                                                className="command-copy-btn"
                                                icon={<CopyOutlined />}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        [
                                                            '当前 skill 不支持 doraemon-skills 直接安装。',
                                                            `请先下载 zip：${downloadCommand}`,
                                                            `原因：${installUnavailableReason}`,
                                                            '然后手动解压并确认技能目录结构（需包含 SKILL.md）。',
                                                        ].join('\n'),
                                                        '降级指令已复制到剪贴板'
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabPane>
                        </Tabs>
                    </Card>

                    <Card className="action-card" title="$ download --local" extra={<Text>manual</Text>}>
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

                    <Card className="action-card" title="源码与分享">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                block
                                icon={<LinkOutlined />}
                                onClick={() => window.open(sourceUrl, '_blank')}
                                disabled={!sourceUrl}
                            >
                                源码跳转
                            </Button>
                            <Button
                                block
                                icon={<ShareAltOutlined />}
                                onClick={() =>
                                    copyToClipboard(deepLinkUrl, '详情页深链已复制到剪贴板')
                                }
                            >
                                复制深链
                            </Button>
                        </Space>
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
                                                onClick={() => {
                                                    if (isModal && onOpenSkill) {
                                                        onOpenSkill(item.slug);
                                                        return;
                                                    }
                                                    if (history) {
                                                        history.push(`/page/skills/${item.slug}`);
                                                    }
                                                }}
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
