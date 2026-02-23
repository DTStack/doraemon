import React, { useEffect, useMemo, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {
    ArrowLeftOutlined,
    CopyOutlined,
    DownloadOutlined,
    FolderOpenOutlined,
    HeartFilled,
    HeartOutlined,
    LinkOutlined,
    ReadOutlined,
    ShareAltOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Radio, Row, Space, Spin, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/lib/tree';

import { API } from '@/api';
import MarkdownRenderer from '@/components/markdownRenderer';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillDetail as SkillDetailType, SkillFileContent, SkillItem } from '../types';
import './style.scss';

const { Title, Text, Paragraph } = Typography;

interface SkillTreeNode extends DataNode {
    children?: SkillTreeNode[];
}

type InstallRuntime = 'npx' | 'bunx' | 'pnpm';

interface FrontmatterItem {
    key: string;
    value: string;
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

const getInstallArgs = (detail: SkillDetailType) => {
    const installCommand = detail.installCommand || '';
    const addPattern = /(?:npx|bunx|pnpm\s+dlx)\s+skills\s+add\s+(.+)$/i;
    const addMatch = installCommand.match(addPattern);
    if (addMatch && addMatch[1]) {
        return addMatch[1].trim();
    }
    if (detail.sourceRepo) {
        return `${detail.sourceRepo} --skill "${detail.name}"`;
    }
    return '';
};

const getInstallCommandByRuntime = (
    runtime: InstallRuntime,
    detail: SkillDetailType,
    installArgs: string
) => {
    if (!installArgs) return detail.installCommand || '';
    if (runtime === 'bunx') return `bunx skills add ${installArgs}`;
    if (runtime === 'pnpm') return `pnpm dlx skills add ${installArgs}`;
    return `npx skills add ${installArgs}`;
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

const SkillDetail: React.FC<any> = ({ history, match }) => {
    const { slug } = match.params;
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetailType | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);
    const [installRuntime, setInstallRuntime] = useState<InstallRuntime>('npx');
    const [favorited, setFavorited] = useState(false);

    const fileTreeData = useMemo(() => buildFileTreeData(detail?.fileList || []), [detail?.fileList]);
    const sourceUrl = useMemo(() => normalizeSourceUrl(detail?.sourceRepo || ''), [detail?.sourceRepo]);
    const installArgs = useMemo(() => (detail ? getInstallArgs(detail) : ''), [detail]);
    const installCommand = useMemo(() => {
        if (!detail) return '';
        return getInstallCommandByRuntime(installRuntime, detail, installArgs);
    }, [detail, installArgs, installRuntime]);

    const downloadPath = useMemo(() => `/api/skills/download?slug=${encodeURIComponent(slug)}`, [slug]);
    const archiveFileName = useMemo(() => {
        const rawName = detail?.name || slug || 'skill';
        const normalized = rawName
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `${normalized || 'skill'}.zip`;
    }, [detail?.name, slug]);
    const wgetCommand = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return `wget "${window.location.origin}${downloadPath}" -O ${archiveFileName}`;
    }, [archiveFileName, downloadPath]);

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

                if (detailRes.success) {
                    const detailData = detailRes.data as SkillDetailType;
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
                }
            } catch (error) {
                console.error('获取 Skill 详情失败:', error);
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

    return (
        <div className="page-skill-detail">
            <div className="detail-header">
                <Button
                    icon={<ArrowLeftOutlined />}
                    className="back-btn"
                    onClick={() => history.push('/page/skills')}
                >
                    返回列表
                </Button>
                <div className="title-group">
                    <Title level={2}>{detail.name}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {detail.description || '暂无描述'}
                    </Paragraph>
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
                    <Card className="action-card" title="$ install --global" extra={<Text>skills.sh</Text>}>
                        <Radio.Group
                            value={installRuntime}
                            onChange={(event) => setInstallRuntime(event.target.value)}
                            buttonStyle="solid"
                            className="runtime-switch"
                        >
                            <Radio.Button value="npx">npx</Radio.Button>
                            <Radio.Button value="bunx">bunx</Radio.Button>
                            <Radio.Button value="pnpm">pnpm</Radio.Button>
                        </Radio.Group>
                        <div className="command-block">
                            <code>{installCommand || '暂无可用安装命令'}</code>
                            <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() =>
                                    copyToClipboard(installCommand || '', '安装命令已复制到剪贴板')
                                }
                                disabled={!installCommand}
                            />
                        </div>
                    </Card>

                    <Card className="action-card" title="$ download --local" extra={<Text>man</Text>}>
                        <div className="download-buttons">
                            <Button
                                type="primary"
                                block
                                icon={<DownloadOutlined />}
                                onClick={() => window.open(downloadPath, '_blank')}
                            >
                                下载 skill.zip
                            </Button>
                            <div className="command-block">
                                <code>{wgetCommand || `wget "${downloadPath}" -O ${archiveFileName}`}</code>
                                <Button
                                    type="text"
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                        copyToClipboard(
                                            wgetCommand || `wget "${downloadPath}" -O ${archiveFileName}`,
                                            'wget 命令已复制到剪贴板'
                                        )
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
                                icon={favorited ? <HeartFilled /> : <HeartOutlined />}
                                onClick={() => setFavorited(!favorited)}
                            >
                                {favorited ? '已收藏' : '收藏'}
                            </Button>
                            <Button
                                block
                                icon={<ShareAltOutlined />}
                                onClick={() =>
                                    copyToClipboard(window.location.href, '详情页链接已复制到剪贴板')
                                }
                            >
                                分享
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

export default SkillDetail;
