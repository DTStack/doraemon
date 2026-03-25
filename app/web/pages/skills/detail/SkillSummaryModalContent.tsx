import React, { useEffect, useMemo, useState } from 'react';
import { CopyOutlined, LinkOutlined, ShareAltOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Spin, Tabs, Tag, Typography } from 'antd';

import { API } from '@/api';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillDetail, SkillInstallMeta } from '../types';
import './summaryModal.scss';

const { Paragraph, Text, Title } = Typography;
const { TabPane } = Tabs;

interface SkillSummaryModalContentProps {
    slug: string;
    history: any;
}

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

const formatDownloadCommand = (downloadUrl = '', fileName = 'skill.zip') => {
    if (!downloadUrl) return '';
    return `curl -L "${downloadUrl}" -o ${fileName}`;
};

const SkillSummaryModalContent: React.FC<SkillSummaryModalContentProps> = ({ slug, history }) => {
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<SkillDetail | null>(null);
    const [installMeta, setInstallMeta] = useState<SkillInstallMeta | null>(null);

    const sourceUrl = useMemo(
        () => normalizeSourceUrl(detail?.sourceRepo || ''),
        [detail?.sourceRepo]
    );
    const deepLinkPath = useMemo(() => `/page/skills/${encodeURIComponent(slug)}`, [slug]);
    const downloadPath = useMemo(
        () => `/api/skills/download?slug=${encodeURIComponent(slug)}`,
        [slug]
    );
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
                const detailRes = await API.getSkillDetail({ slug });
                if (cancelled) return;

                if (!detailRes.success) {
                    setDetail(null);
                    setInstallMeta(null);
                    return;
                }

                const detailData = detailRes.data as SkillDetail;
                setDetail(detailData);

                const installMetaRes = await API.getSkillInstallMeta({
                    installKey: detailData.installKey || slug,
                });
                if (!cancelled) {
                    setInstallMeta(
                        installMetaRes.success ? (installMetaRes.data as SkillInstallMeta) : null
                    );
                }
            } catch (error) {
                console.error('获取 Skill 弹窗详情失败:', error);
                if (!cancelled) {
                    setDetail(null);
                    setInstallMeta(null);
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
        <div className="summary-command-card">
            <div className="summary-command-header">
                <Text className="summary-command-title">{title}</Text>
                {description ? <Text type="secondary">{description}</Text> : null}
            </div>
            <div className="summary-command-block">
                <code>{command || '暂无可复制命令'}</code>
                <Button
                    type="text"
                    className="summary-command-copy-btn"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(command, copyMessage)}
                    disabled={disabled || !command}
                />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="skill-summary-modal skill-summary-loading">
                <Spin size="large" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="skill-summary-modal">
                <Empty description="Skill 不存在或已被删除" />
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
        <div className="skill-summary-modal">
            <div className="skill-summary-shell">
                <div className="summary-hero-card">
                    <div className="summary-hero-main">
                        <div className="summary-kicker-row">
                            <Tag color="blue">{detail.category || '未分类'}</Tag>
                            <span className="summary-install-key">安装标识 · {installKey}</span>
                        </div>

                        <div className="summary-title-row">
                            <div className="summary-title-group">
                                <Title level={2}>{detail.name}</Title>
                                <Paragraph className="summary-description" type="secondary">
                                    {detail.description || '暂无描述'}
                                </Paragraph>
                            </div>

                            <div className="summary-action-panel">
                                <Text className="summary-section-label">快捷操作</Text>
                                <div className="summary-actions">
                                    <Button
                                        type="primary"
                                        onClick={() => history.push(deepLinkPath)}
                                    >
                                        打开独立详情页
                                    </Button>
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
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="summary-hero-section">
                        <Text className="summary-section-label">快速概览</Text>
                        <div className="summary-meta-grid">
                            {detailMetaItems.map((item) => (
                                <div
                                    key={item.label}
                                    className={`summary-meta-card ${item.className || ''}`.trim()}
                                >
                                    <Text className="summary-meta-label">{item.label}</Text>
                                    <div className="summary-meta-value" title={item.value}>
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
                    </div>

                    {detailTags.length > 0 ? (
                        <div className="summary-hero-section summary-tags-section">
                            <Text className="summary-section-label">标签</Text>
                            <div className="summary-tag-list">
                                {detailTags.map((tag) => (
                                    <Tag key={tag}>{tag}</Tag>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="summary-install-card">
                    <div className="summary-install-header">
                        <div>
                            <Text className="summary-install-title">安装决策</Text>
                            <Paragraph className="summary-install-caption" type="secondary">
                                {isInstallable
                                    ? '弹窗只保留安装前所需的核心说明，全部命令继续基于 installKey 生成。'
                                    : '当前来源暂不支持 Doraemon CLI 直装，保留下载与手动接入的降级路径。'}
                            </Paragraph>
                        </div>
                        <span
                            className={`summary-status-tag ${
                                isInstallable ? 'is-ready' : 'is-fallback'
                            }`}
                        >
                            {isInstallable ? 'CLI 可安装' : '需手动接入'}
                        </span>
                    </div>

                    <Tabs defaultActiveKey="agent" className="summary-install-tabs">
                        <TabPane tab="我是 Agent" key="agent">
                            <div className="summary-install-panel">
                                {isInstallable
                                    ? renderInstallCommandCard({
                                          title: '发给 Agent 的安装提示',
                                          description: '包含 CLI 检查与技能安装两步说明',
                                          command: agentInstruction,
                                          copyMessage: 'Agent 指令已复制到剪贴板',
                                      })
                                    : renderInstallCommandCard({
                                          title: '发给 Agent 的降级说明',
                                          description: installUnavailableReason,
                                          command: agentFallbackInstruction,
                                          copyMessage: '降级指令已复制到剪贴板',
                                      })}
                            </div>
                        </TabPane>
                        <TabPane tab="我是 Human" key="human">
                            <div className="summary-install-panel">
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
                                    renderInstallCommandCard({
                                        title: '手动下载命令',
                                        description: `原因：${installUnavailableReason}`,
                                        command: downloadCommand,
                                        copyMessage: '下载命令已复制到剪贴板',
                                        disabled: !downloadCommand,
                                    })
                                )}
                            </div>
                        </TabPane>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default SkillSummaryModalContent;
