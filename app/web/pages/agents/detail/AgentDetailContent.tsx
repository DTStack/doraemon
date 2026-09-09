import React, { useEffect, useMemo, useState } from 'react';
import {
    CodeOutlined,
    CopyOutlined,
    DownloadOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, message, Spin, Tag, Typography } from 'antd';

import { API } from '@/api';
import { copyToClipboard } from '@/utils/copyUtils';
import { safeOpenUrl } from '@/utils/safeOpenUrl';
import { buildAgentDetailCodexPrompt, buildCodexNewThreadUrl } from '../codex-button-utils';
import type { AgentCapability, AgentDetail, AgentItem, AgentSkill } from '../types';
import './style.scss';

const { Paragraph, Text, Title } = Typography;
const { normalizeAgentCapabilities } = require('./capability-utils');
const { buildAgentIntroBlocks } = require('./intro-utils');

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
            {item.logoUrl ? (
                <img
                    className="related-agent-logo"
                    src={item.logoUrl}
                    alt={item.displayName}
                    onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                    }}
                />
            ) : null}
            <div className="related-agent-meta">
                <Text strong>{item.displayName}</Text>
                <Paragraph ellipsis={{ rows: 2 }}>{item.description || '暂无描述'}</Paragraph>
            </div>
        </div>
    </Card>
);

interface AgentDetailContentProps {
    name: string;
    history: { push: (path: string) => void };
}

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
                longDescription: detail?.longDescription || '',
                defaultPrompt: detail?.defaultPrompt || [],
            }),
        [detail?.longDescription, detail?.defaultPrompt]
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
                            {detail.logoUrl ? (
                                <img
                                    className="agent-hero-logo"
                                    src={detail.logoUrl}
                                    alt={detail.displayName}
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : null}
                            <div className="agent-hero-meta">
                                <Title level={2}>{detail.displayName}</Title>
                                <div className="agent-hero-subline">
                                    <Text>{detail.authorName || '未知作者'}</Text>
                                    <span className="dot">•</span>
                                    <Text>版本 {detail.version || '-'}</Text>
                                    <span className="dot">•</span>
                                    <Text>{detail.category}</Text>
                                </div>
                                <div className="agent-hero-capabilities">
                                    <Text className="agent-hero-capabilities-label">功能：</Text>
                                    {normalizedCapabilities.map(
                                        (item: AgentCapability, index: number) => (
                                            <Tag key={`${item.id || item.name}-${index}`}>
                                                {item.name}
                                            </Tag>
                                        )
                                    )}
                                </div>
                                {detail.tags && detail.tags.length > 0 ? (
                                    <div className="agent-hero-capabilities">
                                        <Text className="agent-hero-capabilities-label">
                                            关键词：
                                        </Text>
                                        {detail.tags.map((tag) => (
                                            <Tag key={tag}>{tag}</Tag>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="agent-detail-content">
                        <div className="agent-section-stack">
                            <Card className="agent-section-card">
                                <Title level={4}>功能概览</Title>
                                <div className="agent-intro-panel agent-profile-copy agent-overview-description">
                                    <Paragraph>{detail.description || '暂无描述'}</Paragraph>
                                </div>
                            </Card>

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
                                            <Title level={4}>快速使用</Title>
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
                                                    description="暂无数据"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="agent-section-card">
                                <div className="agent-skills-head">
                                    <Title level={4}>Skills</Title>
                                    <Tag className="agent-intro-count">
                                        {detail.skills ? detail.skills.length : 0} 个
                                    </Tag>
                                </div>
                                {detail.skills && detail.skills.length > 0 ? (
                                    <div className="agent-skill-grid">
                                        {detail.skills.map((skill: AgentSkill, index: number) => (
                                            <Card
                                                key={`${skill.slug}-${index}`}
                                                size="small"
                                                hoverable={skill.installed}
                                                className={`agent-skill-card ${
                                                    skill.installed ? 'is-clickable' : 'is-disabled'
                                                }`}
                                                onClick={() => {
                                                    if (!skill.installed) return;
                                                    if (typeof window !== 'undefined') {
                                                        const base =
                                                            skill.parentSlug &&
                                                            skill.parentSlug !== skill.slug
                                                                ? `/page/skills/${skill.parentSlug}/${skill.slug}`
                                                                : `/page/skills/${skill.slug}`;
                                                        window.open(
                                                            base,
                                                            '_blank',
                                                            'noopener,noreferrer'
                                                        );
                                                    }
                                                }}
                                            >
                                                <div className="agent-skill-card-title">
                                                    <span>{skill.name}</span>
                                                    {!skill.installed ? <Tag>暂未收录</Tag> : null}
                                                </div>
                                                <Paragraph
                                                    ellipsis={{ rows: 2 }}
                                                    className="agent-skill-card-description"
                                                >
                                                    {skill.description || '暂无描述'}
                                                </Paragraph>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="暂无 Skills"
                                    />
                                )}
                            </Card>
                        </div>
                    </div>
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
