import React, { useEffect, useMemo, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {
    ArrowLeftOutlined,
    FolderOpenOutlined,
    ReadOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Row, Space, Spin, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/lib/tree';

import { API } from '@/api';
import MarkdownRenderer from '@/components/markdownRenderer';
import { SkillDetail as SkillDetailType, SkillFileContent, SkillItem } from '../types';
import './style.scss';

const { Title, Text, Paragraph } = Typography;

interface SkillTreeNode extends DataNode {
    children?: SkillTreeNode[];
    isFile?: boolean;
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
                    isFile: isLeaf,
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

const SkillDetail: React.FC<any> = ({ history, match }) => {
    const { slug } = match.params;
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetailType | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);

    const fileTreeData = useMemo(() => buildFileTreeData(detail?.fileList || []), [detail?.fileList]);

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
            return <MarkdownRenderer content={fileContent.content || ''} />;
        }

        return (
            <SyntaxHighlighter
                style={atomOneLight}
                language={fileContent.language || 'text'}
                customStyle={{ margin: 0, borderRadius: 6, minHeight: 420 }}
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
                <Col xs={24} md={8} lg={7}>
                    <Card
                        className="file-tree-card"
                        title={
                            <Space>
                                <FolderOpenOutlined />
                                文件浏览
                            </Space>
                        }
                        bodyStyle={{ padding: '8px 0' }}
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
                </Col>

                <Col xs={24} md={16} lg={17}>
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
