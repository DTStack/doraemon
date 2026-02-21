import React, { useEffect, useState } from 'react';
import {
    ArrowLeftOutlined,
    CopyOutlined,
    EyeOutlined,
    FolderOpenOutlined,
    ProfileOutlined,
    ReadOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Divider, Empty, List, Row, Space, Spin, Tabs, Tag, Typography } from 'antd';

import { API } from '@/api';
import MarkdownRenderer from '@/components/markdownRenderer';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillDetail as SkillDetailType, SkillItem } from '../types';
import './style.scss';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const SkillDetail: React.FC<any> = ({ history, match }) => {
    const { slug } = match.params;
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<SkillDetailType | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const [detailRes, relatedRes] = await Promise.all([
                API.getSkillDetail({ slug }),
                API.getRelatedSkills({ slug, limit: 6 }),
            ]);

            if (detailRes.success) {
                setDetail(detailRes.data);
            } else {
                setDetail(null);
            }

            if (relatedRes.success) {
                setRelated(relatedRes.data || []);
            }
        } catch (error) {
            console.error('获取 Skill 详情失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [slug]);

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
                <Space>
                    <Button
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(detail.installCommand, '安装命令已复制')}
                    >
                        复制安装命令
                    </Button>
                </Space>
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

            <Tabs defaultActiveKey="overview">
                <TabPane
                    key="overview"
                    tab={
                        <span>
                            <EyeOutlined />
                            概览
                        </span>
                    }
                >
                    <Card>
                        <Paragraph>
                            <Text strong>技能名称：</Text>
                            {detail.name}
                        </Paragraph>
                        <Paragraph>
                            <Text strong>技能描述：</Text>
                            {detail.description || '-'}
                        </Paragraph>
                        <Paragraph>
                            <Text strong>可用工具：</Text>
                            {(detail.allowedTools && detail.allowedTools.length > 0
                                ? detail.allowedTools.join(', ')
                                : '未声明') || '未声明'}
                        </Paragraph>
                        <Paragraph>
                            <Text strong>安装命令：</Text>
                        </Paragraph>
                        <Paragraph code copyable={{ text: detail.installCommand }}>
                            {detail.installCommand}
                        </Paragraph>
                    </Card>
                </TabPane>

                <TabPane
                    key="skill-md"
                    tab={
                        <span>
                            <ReadOutlined />
                            SKILL.md
                        </span>
                    }
                >
                    <Card className="markdown-card">
                        <MarkdownRenderer content={detail.skillMd || ''} />
                    </Card>
                </TabPane>

                <TabPane
                    key="files"
                    tab={
                        <span>
                            <FolderOpenOutlined />
                            文件列表
                        </span>
                    }
                >
                    <Card>
                        <List
                            size="small"
                            dataSource={detail.fileList || []}
                            renderItem={(file) => (
                                <List.Item>
                                    <Text code>{file}</Text>
                                </List.Item>
                            )}
                        />
                    </Card>
                </TabPane>

                <TabPane
                    key="related"
                    tab={
                        <span>
                            <ProfileOutlined />
                            相关技能
                        </span>
                    }
                >
                    {related.length === 0 ? (
                        <Empty description="暂无相关技能推荐" />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {related.map((item) => (
                                <Col key={item.slug} xs={24} sm={12} lg={8}>
                                    <Card
                                        className="related-card"
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
                </TabPane>
            </Tabs>

            <Divider />
        </div>
    );
};

export default SkillDetail;
