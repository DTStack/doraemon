import React, { useEffect, useMemo, useState } from 'react';
import {
    CodeOutlined,
    CopyOutlined,
    DownloadOutlined,
    MessageOutlined,
    OrderedListOutlined,
    QuestionCircleOutlined,
    ReadOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, message, Spin, Tabs, Tag, Typography } from 'antd';

import { API } from '@/api';
import { copyToClipboard } from '@/utils/copyUtils';
import { safeOpenUrl } from '@/utils/safeOpenUrl';
import { buildAgentDetailCodexPrompt, buildCodexNewThreadUrl } from '../codex-button-utils';
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
    const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setSelectedDemoIndex(0);
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
    const currentOrigin = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.origin;
    }, []);
    const installCommand = detail
        ? `curl -fsSL ${currentOrigin}/agent-market/install.sh | bash -s -- ${detail.name}`
        : '';

    const openCodexInstall = (selectedPrompt?: { title?: string; prompt?: string }) => {
        if (!detail) return;

        const originUrl = typeof window !== 'undefined' ? window.location.href : '';
        const prompt = buildAgentDetailCodexPrompt(detail, originUrl, selectedPrompt);
        const codexUrl = buildCodexNewThreadUrl({ prompt, originUrl });

        window.location.href = codexUrl;
    };

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
                                    <div className="agent-intro-panel agent-profile-copy agent-overview-description">
                                        <Paragraph>{detail.description || '暂无描述'}</Paragraph>
                                    </div>
                                </Card>

                                <Card className="agent-section-card">
                                    <Title level={4}>能力范围</Title>
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
                                    <Title level={4}>Agent 演示</Title>
                                    {detail.demoImages.length > 0 ? (
                                        <div className="agent-demo-gallery">
                                            <div className="agent-demo-thumbnails">
                                                {detail.demoImages.map((item, index) => (
                                                    <button
                                                        key={item.path}
                                                        type="button"
                                                        className={`agent-demo-thumbnail ${
                                                            selectedDemoIndex === index
                                                                ? 'is-active'
                                                                : ''
                                                        }`}
                                                        onClick={() => setSelectedDemoIndex(index)}
                                                        aria-label={`查看演示图片 ${index + 1}`}
                                                    >
                                                        <img
                                                            src={item.url}
                                                            alt={
                                                                item.alt ||
                                                                `${detail.displayName} 演示 ${
                                                                    index + 1
                                                                }`
                                                            }
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="agent-demo-preview">
                                                <img
                                                    src={detail.demoImages[selectedDemoIndex].url}
                                                    alt={
                                                        detail.demoImages[selectedDemoIndex].alt ||
                                                        detail.displayName
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="暂无演示图片"
                                        />
                                    )}
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
                                                                <Button
                                                                    size="small"
                                                                    className="agent-question-quick-use"
                                                                    icon={
                                                                        <span className="agent-question-quick-use-icon">
                                                                            <CodeOutlined />
                                                                        </span>
                                                                    }
                                                                    onClick={() =>
                                                                        openCodexInstall(item)
                                                                    }
                                                                >
                                                                    快捷使用
                                                                </Button>
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
                    <Card className="agent-side-actions" title="安装命令">
                        <div className="agent-install-terminal">
                            <div className="agent-install-terminal-head">
                                <span className="agent-install-terminal-dots">
                                    <i />
                                    <i />
                                    <i />
                                </span>
                                <span>BASH</span>
                            </div>
                            <div className="agent-install-terminal-body">
                                <span className="agent-install-prompt">$</span>
                                <code>{installCommand}</code>
                                <Button
                                    type="text"
                                    className="agent-install-copy"
                                    icon={<CopyOutlined />}
                                    aria-label="复制 Agent 安装命令"
                                    onClick={() =>
                                        copyToClipboard(
                                            installCommand,
                                            'Agent 安装命令已复制到剪贴板'
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <Button
                            block
                            className="agent-archive-download"
                            icon={<DownloadOutlined />}
                            onClick={() => {
                                safeOpenUrl(
                                    `/api/agents/download?name=${encodeURIComponent(detail.name)}`,
                                    '_self'
                                );
                                message.info('Agent ZIP 下载已开始');
                            }}
                        >
                            下载 Agent ZIP
                        </Button>
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
