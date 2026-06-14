import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Spin } from 'antd';

import { API } from '@/api';
import { SkillDetail, SkillFileContent, SkillInstallMeta, SkillItem } from '../types';
import { SkillDetailHero } from './components/SkillDetailHero';
import { SkillDocViewer } from './components/SkillDocViewer';
import { SkillFileExplorer } from './components/SkillFileExplorer';
import { InstallPanelKey, SkillInstallPanel } from './components/SkillInstallPanel';
import {
    buildFileTreeData,
    formatDownloadCommand,
    normalizeSourceUrl,
    SkillDetailHistory,
} from './utils/skillDetailUtils';
import './style.scss';

interface SkillDetailContentProps {
    slug: string;
    parentSlug?: string;
    history: SkillDetailHistory;
}

const SkillDetailContent: React.FC<SkillDetailContentProps> = ({
    slug,
    parentSlug: routeParentSlug,
    history,
}) => {
    const [loading, setLoading] = useState(true);
    const [fileLoading, setFileLoading] = useState(false);
    const [detail, setDetail] = useState<SkillDetail | null>(null);
    const [installMeta, setInstallMeta] = useState<SkillInstallMeta | null>(null);
    const [related, setRelated] = useState<SkillItem[]>([]);
    const [uiSelectedFilePath, setUiSelectedFilePath] = useState('');
    const [selectedFilePath, setSelectedFilePath] = useState('');
    const [fileContent, setFileContent] = useState<SkillFileContent | null>(null);
    const [activeInstallPanel, setActiveInstallPanel] = useState<InstallPanelKey>('agent');
    const [likeStatus, setLikeStatus] = useState({ liked: false, likeCount: 0 });
    const [likeLoading, setLikeLoading] = useState(false);

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
        () => `npx dt-skill install ${installKey} --registry ${currentOrigin}`,
        [installKey, currentOrigin]
    );
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

    const fetchLikeStatus = async () => {
        try {
            const res = await API.getSkillLikeStatus({ slug });
            if (res.success) {
                setLikeStatus({
                    liked: res.data.liked,
                    likeCount: res.data.likeCount,
                });
            }
        } catch (error) {
            console.error('获取点赞状态失败:', error);
        }
    };

    const handleLike = async () => {
        if (likeLoading) return;
        setLikeLoading(true);
        try {
            if (likeStatus.liked) {
                const res = await API.unlikeSkill({ slug });
                if (res.success) {
                    setLikeStatus({ liked: false, likeCount: res.data.likeCount });
                }
            } else {
                const res = await API.likeSkill({ slug });
                if (res.success) {
                    setLikeStatus({ liked: true, likeCount: res.data.likeCount });
                }
            }
        } catch (error) {
            console.error('点赞操作失败:', error);
        } finally {
            setLikeLoading(false);
        }
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
        fetchLikeStatus();

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

    const isPackage = detail.isPackage === 1;

    return (
        <div className="page-skill-detail">
            <div className={`skill-detail-shell ${isPackage ? 'is-package' : ''}`}>
                {!isPackage ? (
                    <SkillFileExplorer
                        version={detail.version}
                        parentSlug={detail.parentSlug}
                        routeParentSlug={routeParentSlug}
                        history={history}
                        fileTreeData={fileTreeData}
                        selectedFilePath={uiSelectedFilePath}
                        onSelectFile={handleSelectFile}
                        isInstallable={isInstallable}
                        skillInstallCommand={skillInstallCommand}
                        downloadCommand={downloadCommand}
                        sourceUrl={sourceUrl}
                        onFocusInstallPanel={() => setActiveInstallPanel('agent')}
                    />
                ) : null}

                <main className={`detail-main-column ${isPackage ? 'is-package' : ''}`}>
                    <SkillDetailHero
                        detail={detail}
                        slug={slug}
                        history={history}
                        heroSummary={heroSummary}
                        likeStatus={likeStatus}
                        likeLoading={likeLoading}
                        onLike={handleLike}
                    />

                    {!isPackage ? (
                        <SkillDocViewer
                            selectedFilePath={uiSelectedFilePath}
                            fileLoading={fileLoading}
                            fileContent={fileContent}
                        />
                    ) : null}
                </main>

                {!isPackage ? (
                    <SkillInstallPanel
                        slug={slug}
                        history={history}
                        related={related}
                        fileContent={fileContent}
                        activeInstallPanel={activeInstallPanel}
                        onActiveInstallPanelChange={setActiveInstallPanel}
                        isInstallable={isInstallable}
                        skillInstallCommand={skillInstallCommand}
                        downloadCommand={downloadCommand}
                        agentTerminalCommand={agentTerminalCommand}
                        manualDownloadUrl={manualDownloadUrl}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default SkillDetailContent;
