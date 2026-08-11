import React, { useEffect, useMemo, useState } from 'react';
import {
    MessageOutlined,
    OrderedListOutlined,
    QuestionCircleOutlined,
    ReadOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, message, Space, Spin, Tabs, Tag, Typography } from 'antd';

import { API } from '@/api';
import type { AgentCapability, AgentDetail, AgentItem, AgentSkillRelation } from '../types';
import './style.scss';

const { Paragraph, Text, Title } = Typography;
const { TabPane } = Tabs;
const { normalizeAgentCapabilities } = require('./capability-utils');
const { buildAgentIntroBlocks } = require('./intro-utils');

interface AgentDetailContentProps {
    name: string;
    history: { push: (path: string) => void };
}

const SkillRelationCard: React.FC<{
    item: AgentSkillRelation;
    history: { push: (path: string) => void };
}> = ({ item, history }) => {
    const clickable = Boolean(item.collected && item.path);

    return (
        <Card
            size="small"
            hoverable={clickable}
            className={`agent-skill-card ${clickable ? 'is-clickable' : 'is-disabled'}`}
            onClick={() => {
                if (!clickable) return;
                if (typeof window !== 'undefined') {
                    window.open(item.path as string, '_blank', 'noopener,noreferrer');
                    return;
                }
                history.push(item.path as string);
            }}
        >
            <div className="agent-skill-card-title">
                <span>{item.name}</span>
                {!item.collected ? <Tag>暂未收录</Tag> : null}
            </div>
            <Paragraph ellipsis={{ rows: 2 }} className="agent-skill-card-description">
                {item.description || '暂无描述'}
            </Paragraph>
        </Card>
    );
};

const RelatedAgentCard: React.FC<{
    item: AgentItem;
    history: { push: (path: string) => void };
}> = ({ item, history }) => (
    <Card
        size="small"
        hoverable
        className="related-agent-card"
        onClick={() => history.push(`/page/agents/${item.name}`)}
    >
        <div className="related-agent-head">
            <img
                className="related-agent-logo"
                src={item.logoUrl}
                alt={item.displayName}
                onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                }}
            />
            <div className="related-agent-meta">
                <Text strong>{item.displayName}</Text>
                <Paragraph ellipsis={{ rows: 2 }}>{item.description || '暂无描述'}</Paragraph>
            </div>
        </div>
    </Card>
);

const AgentDetailContent: React.FC<AgentDetailContentProps> = ({ name, history }) => {
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<AgentDetail | null>(null);
    const [related, setRelated] = useState<AgentItem[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const [detailRes, relatedRes] = await Promise.all([
                    API.getAgentDetail({ name }),
                    API.getRelatedAgents({ name, limit: 3 }),
                ]);

                if (cancelled) return;
                setDetail(detailRes.success ? (detailRes.data as AgentDetail) : null);
                setRelated(relatedRes.success ? relatedRes.data || [] : []);
            } catch (error) {
                console.error('获取 Agent 详情失败:', error);
                if (!cancelled) {
                    setDetail(null);
                    setRelated([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [name]);

    const introBlocks = useMemo(
        () =>
            buildAgentIntroBlocks({
                profile: detail?.profile || '',
                description: detail?.description || '',
                summary: detail?.description || '',
                prompts: detail?.prompts || [],
            }),
        [detail?.description, detail?.profile, detail?.prompts]
    );
    const normalizedCapabilities = useMemo(
        () => normalizeAgentCapabilities(detail?.capabilities || []),
        [detail?.capabilities]
    );

    if (loading) {
        return (
            <div className="page-agent-detail loading-wrap">
                <Spin size="large" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="page-agent-detail page-agent-detail-empty">
                <Empty description="Agent 不存在或已被删除">
                    <Button onClick={() => history.push('/page/agents')}>返回 Agent 列表</Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className="page-agent-detail">
            <div className="agent-detail-shell">
                <main className="agent-detail-main">
                    <div className="agent-hero">
                        <div className="agent-hero-brand">
                            <img
                                className="agent-hero-logo"
                                src={detail.logoUrl}
                                alt={detail.displayName}
                                onError={(event) => {
                                    event.currentTarget.style.visibility = 'hidden';
                                }}
                            />
                            <div className="agent-hero-meta">
                                <Title level={2}>{detail.displayName}</Title>
                                <div className="agent-hero-subline">
                                    <Text>{detail.authorName || '未知作者'}</Text>
                                    <span className="dot">•</span>
                                    <Text>版本 {detail.version || '-'}</Text>
                                    <span className="dot">•</span>
                                    <Text>{detail.category}</Text>
                                </div>
                                <div className="agent-hero-tags">
                                    {detail.tags.map((tag) => (
                                        <Tag key={tag}>{tag}</Tag>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultActiveKey="overview" className="agent-detail-tabs">
                        <TabPane
                            tab={
                                <span>
                                    <ReadOutlined />
                                    概览
                                </span>
                            }
                            key="overview"
                        >
                            <div className="agent-section-stack">
                                <Card className="agent-section-card">
                                    <Title level={4}>你可以使用该 Agent 做什么</Title>
                                    <Paragraph className="agent-overview-description">
                                        {detail.description || '暂无描述'}
                                    </Paragraph>
                                </Card>

                                <Card className="agent-section-card">
                                    <Title level={4}>Agent 能力</Title>
                                    {normalizedCapabilities.length > 0 ? (
                                        <div className="agent-capability-grid">
                                            {normalizedCapabilities.map(
                                                (item: AgentCapability, index: number) => (
                                                    <div
                                                        key={`${item.id || item.name}-${index}`}
                                                        className="agent-capability-card"
                                                    >
                                                        <Text strong>{item.name}</Text>
                                                        {item.description ? (
                                                            <Paragraph>
                                                                {item.description}
                                                            </Paragraph>
                                                        ) : null}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="暂无能力描述"
                                        />
                                    )}
                                </Card>

                                <Card className="agent-section-card">
                                    <Title level={4}>Demo</Title>
                                    <div className="agent-demo-images">
                                        {(detail.demoImages || []).map((item) => (
                                            <div key={item.path} className="agent-demo-image-item">
                                                <img
                                                    src={item.url}
                                                    alt={item.alt || detail.displayName}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </TabPane>

                        <TabPane
                            tab={
                                <span>
                                    <UserOutlined />
                                    Agent 简介
                                </span>
                            }
                            key="profile"
                        >
                            <Card className="agent-section-card">
                                <div className="agent-intro-sections">
                                    <div className="agent-intro-block">
                                        <div className="agent-intro-block-head">
                                            <Title level={4}>Agent 简介</Title>
                                        </div>
                                        <div className="agent-intro-panel agent-profile-copy">
                                            {introBlocks.introParagraphs.map(
                                                (item: string, index: number) => (
                                                    <Paragraph
                                                        key={`${index}-${item.slice(0, 12)}`}
                                                    >
                                                        {item}
                                                    </Paragraph>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="agent-intro-block">
                                        <div className="agent-intro-block-head">
                                            <Title level={4}>开场消息</Title>
                                        </div>
                                        <Card
                                            size="small"
                                            className="agent-intro-panel agent-message-card"
                                        >
                                            <div className="agent-message-card-body">
                                                <div className="agent-intro-icon-wrap is-message">
                                                    <MessageOutlined />
                                                </div>
                                                <Paragraph>
                                                    {introBlocks.openingMessage || '暂无开场消息'}
                                                </Paragraph>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="agent-intro-block">
                                        <div className="agent-intro-block-head">
                                            <Title level={4}>开场问题</Title>
                                            <Tag className="agent-intro-count">
                                                {introBlocks.openingQuestions.length} 个
                                            </Tag>
                                        </div>
                                        <div className="agent-prompts agent-prompts-compact">
                                            {introBlocks.openingQuestions.length > 0 ? (
                                                introBlocks.openingQuestions.map(
                                                    (item: any, index: number) => (
                                                        <Card
                                                            key={`${item.title}-${index}`}
                                                            size="small"
                                                            className="agent-intro-panel agent-question-card"
                                                        >
                                                            <div className="agent-question-card-body">
                                                                <div className="agent-intro-icon-wrap is-question">
                                                                    <QuestionCircleOutlined />
                                                                </div>
                                                                <div className="agent-question-copy">
                                                                    <Text strong>{item.title}</Text>
                                                                    <Paragraph>
                                                                        {item.prompt}
                                                                    </Paragraph>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    )
                                                )
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description="暂无开场问题"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </TabPane>

                        <TabPane
                            tab={
                                <span>
                                    <OrderedListOutlined />
                                    Agent 能力
                                </span>
                            }
                            key="skills"
                        >
                            <div className="agent-section-stack">
                                <Card className="agent-section-card">
                                    <Title level={4}>核心工作流</Title>
                                    {detail.entrypoint ? (
                                        <SkillRelationCard
                                            item={detail.entrypoint}
                                            history={history}
                                        />
                                    ) : (
                                        <Empty description="未配置核心工作流" />
                                    )}
                                </Card>

                                <Card className="agent-section-card">
                                    <Title level={4}>内置 Skills</Title>
                                    {detail.dependencies.length > 0 ? (
                                        <div className="agent-skill-grid">
                                            {detail.dependencies.map((item) => (
                                                <SkillRelationCard
                                                    key={`${item.slug}-${item.name}`}
                                                    item={item}
                                                    history={history}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <Empty description="暂无内置 Skills" />
                                    )}
                                </Card>
                            </div>
                        </TabPane>
                    </Tabs>
                </main>

                <aside className="agent-detail-side">
                    <Card className="agent-side-actions">
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            <Button block onClick={() => message.info('敬请期待')}>
                                安装
                            </Button>
                            <Button type="primary" block onClick={() => message.info('敬请期待')}>
                                敬请期待
                            </Button>
                        </Space>
                    </Card>

                    <Card className="agent-side-related" title="相关 Agent">
                        <div className="related-agent-list">
                            {related.length > 0 ? (
                                related.map((item) => (
                                    <RelatedAgentCard
                                        key={item.name}
                                        item={item}
                                        history={history}
                                    />
                                ))
                            ) : (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无相关 Agent"
                                />
                            )}
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
};

export default AgentDetailContent;
