import React from 'react';
import { Button } from 'antd';

import agentIcon from '@/asset/images/skills-detail-figma/agent.svg';
import chevronDownIcon from '@/asset/images/skills-detail-figma/chevron-down.svg';
import chevronRightIcon from '@/asset/images/skills-detail-figma/chevron-right.svg';
import contributorOne from '@/asset/images/skills-detail-figma/contributor-1.png';
import contributorTwo from '@/asset/images/skills-detail-figma/contributor-2.png';
import copyDarkIcon from '@/asset/images/skills-detail-figma/copy-dark.svg';
import downloadIcon from '@/asset/images/skills-detail-figma/download.svg';
import emptyRelatedIcon from '@/asset/images/skills-detail-figma/empty-related.svg';
import externalLinkXsIcon from '@/asset/images/skills-detail-figma/external-link-xs.svg';
import humanIcon from '@/asset/images/skills-detail-figma/human.svg';
import relatedSkillDocsIcon from '@/asset/images/skills-detail-figma/related-skill-docs.svg';
import relatedSkillSecurityIcon from '@/asset/images/skills-detail-figma/related-skill-security.svg';
import relatedSkillSqlIcon from '@/asset/images/skills-detail-figma/related-skill-sql.svg';
import { copyToClipboard } from '@/utils/copyUtils';
import { SkillFileContent, SkillItem } from '../../types';
import type { SkillDetailHistory } from '../utils/skillDetailUtils';
import { formatFileSize } from '../utils/skillDetailUtils';
import { DetailIcon } from './DetailIcon';

export type InstallPanelKey = 'agent' | 'human' | null;

const relatedSkillIconUrls = [relatedSkillSqlIcon, relatedSkillSecurityIcon, relatedSkillDocsIcon];
const relatedSkillShellClasses = ['is-blue', 'is-green', 'is-orange'];
const browseMarketPath = '/page/skills';
const cliInstallPlaceholderCommand =
    '# 待补齐 Doraemon CLI 安装脚本 URL，例如 curl -fsSL <install.sh> | bash';

interface SkillInstallPanelProps {
    slug: string;
    history: SkillDetailHistory;
    related: SkillItem[];
    fileContent: SkillFileContent | null;
    activeInstallPanel: InstallPanelKey;
    onActiveInstallPanelChange: (panel: InstallPanelKey) => void;
    isInstallable: boolean;
    skillInstallCommand: string;
    downloadCommand: string;
    agentTerminalCommand: string;
    manualDownloadUrl: string;
}

const renderInlineCommand = (command: string, copyMessage: string, compact = false) => (
    <div className={`command-surface is-light ${compact ? 'is-compact' : ''}`.trim()}>
        <div className="command-surface-inline">
            <div className="command-inline-code-wrap">
                <code>{command || '暂无可复制命令'}</code>
            </div>
            <Button
                type="text"
                className="command-copy-btn is-inline-copy"
                icon={<DetailIcon src={copyDarkIcon} className="is-copy-dark" />}
                onClick={() => copyToClipboard(command, copyMessage)}
                disabled={!command}
            />
        </div>
    </div>
);

const renderTerminalCommand = (command: string, copyMessage: string) => (
    <div className="command-surface is-dark is-terminal">
        <div className="terminal-head">
            <div className="terminal-dots">
                <span />
                <span />
                <span />
            </div>
            <span className="terminal-label">BASH</span>
        </div>
        <div className="terminal-body">
            <span className="terminal-prompt">$</span>
            <code>{command || '暂无可复制命令'}</code>
            <Button
                type="text"
                className="command-copy-btn is-terminal-copy"
                icon={<DetailIcon src={copyDarkIcon} className="is-copy-dark" />}
                onClick={() => copyToClipboard(command, copyMessage)}
                disabled={!command}
            />
        </div>
    </div>
);

export const SkillInstallPanel: React.FC<SkillInstallPanelProps> = ({
    slug,
    history,
    related,
    fileContent,
    activeInstallPanel,
    onActiveInstallPanelChange,
    isInstallable,
    skillInstallCommand,
    downloadCommand,
    agentTerminalCommand,
    manualDownloadUrl,
}) => (
    <aside className="detail-right-sidebar">
        <section className="install-panel">
            <div className="sidebar-section-title">
                安装方式
                <span className="install-soon-badge">SOON</span>
            </div>

            <div
                className={`install-option-card ${
                    activeInstallPanel === 'agent' ? 'is-active' : ''
                }`.trim()}
            >
                <button
                    type="button"
                    className="install-option-trigger"
                    onClick={() =>
                        onActiveInstallPanelChange(activeInstallPanel === 'agent' ? null : 'agent')
                    }
                    aria-expanded={activeInstallPanel === 'agent'}
                >
                    <div className="install-option-meta">
                        <span className="install-option-icon-shell is-agent" aria-hidden="true">
                            <DetailIcon src={agentIcon} className="is-option-icon is-agent-icon" />
                        </span>
                        <div>
                            <div className="install-option-title">智能体</div>
                            <div className="install-option-description">
                                {isInstallable ? '自动化安装' : '下载后安装'}
                            </div>
                        </div>
                    </div>
                    <DetailIcon
                        src={activeInstallPanel === 'agent' ? chevronDownIcon : chevronRightIcon}
                        className={
                            activeInstallPanel === 'agent' ? 'is-chevron' : 'is-chevron-right'
                        }
                    />
                </button>
                <div
                    className={`install-option-body ${
                        activeInstallPanel === 'agent' ? 'is-open' : 'is-closed'
                    }`.trim()}
                >
                    <div className="install-option-body-inner">
                        {renderTerminalCommand(
                            agentTerminalCommand,
                            isInstallable
                                ? 'Agent 安装命令已复制到剪贴板'
                                : '下载命令已复制到剪贴板'
                        )}
                    </div>
                </div>
            </div>

            <div
                className={`install-option-card is-collapsed ${
                    activeInstallPanel === 'human' ? 'is-active' : ''
                }`.trim()}
            >
                <button
                    type="button"
                    className="install-option-trigger"
                    onClick={() =>
                        onActiveInstallPanelChange(activeInstallPanel === 'human' ? null : 'human')
                    }
                    aria-expanded={activeInstallPanel === 'human'}
                >
                    <div className="install-option-meta">
                        <span className="install-option-icon-shell is-human" aria-hidden="true">
                            <DetailIcon src={humanIcon} className="is-option-icon is-human-icon" />
                        </span>
                        <div>
                            <div className="install-option-title">手动安装</div>
                            <div className="install-option-description">手动配置</div>
                        </div>
                    </div>
                    <DetailIcon
                        src={activeInstallPanel === 'human' ? chevronDownIcon : chevronRightIcon}
                        className={
                            activeInstallPanel === 'human' ? 'is-chevron' : 'is-chevron-right'
                        }
                    />
                </button>
                <div
                    className={`install-option-body ${
                        activeInstallPanel === 'human' ? 'is-open' : 'is-closed'
                    }`.trim()}
                >
                    <div className="install-option-body-inner">
                        <div className="human-command-card">
                            <div className="human-command-title">先安装 Doraemon CLI</div>
                            {renderInlineCommand(
                                cliInstallPlaceholderCommand,
                                'CLI 安装命令已复制到剪贴板',
                                false
                            )}
                        </div>
                        <div className="human-command-card">
                            <div className="human-command-title">再安装当前技能</div>
                            {renderInlineCommand(
                                isInstallable ? skillInstallCommand : downloadCommand,
                                isInstallable
                                    ? '技能安装命令已复制到剪贴板'
                                    : '下载命令已复制到剪贴板',
                                false
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="download-panel">
            <div className="sidebar-section-title">手动下载</div>
            <Button
                type="default"
                block
                className="download-btn"
                onClick={() => window.open(manualDownloadUrl, '_blank')}
            >
                <DetailIcon src={downloadIcon} className="is-download" />
                下载 .zip
            </Button>
            {renderInlineCommand(downloadCommand, '下载命令已复制到剪贴板', true)}
        </section>

        <section className="related-panel">
            <div className="sidebar-section-title">相关技能</div>
            {related.length === 0 ? (
                <div className="related-empty-state">
                    <DetailIcon src={emptyRelatedIcon} className="is-empty-related" />
                    <span>暂无相关技能</span>
                </div>
            ) : (
                <>
                    <div className="related-list">
                        {related.map((item, index) => (
                            <button
                                key={item.slug}
                                type="button"
                                className="related-item"
                                onClick={() => {
                                    if (item.slug === slug) return;
                                    history.push(`/page/skills/${item.slug}`);
                                }}
                            >
                                <span
                                    className={`related-item-icon-shell ${
                                        relatedSkillShellClasses[
                                            index % relatedSkillShellClasses.length
                                        ]
                                    }`}
                                    aria-hidden="true"
                                >
                                    <DetailIcon
                                        src={
                                            relatedSkillIconUrls[
                                                index % relatedSkillIconUrls.length
                                            ]
                                        }
                                        className="is-related-skill-icon"
                                    />
                                </span>
                                <div className="related-item-copy">
                                    <strong>{item.name}</strong>
                                    <span className="related-item-description">
                                        {item.description || '暂无描述'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="browse-market-link"
                        onClick={() => history.push(browseMarketPath)}
                    >
                        <span>浏览市场</span>
                        <DetailIcon
                            src={externalLinkXsIcon}
                            className="is-browse-market-arrow"
                        />
                    </button>
                </>
            )}
        </section>

        <section className="meta-panel">
            <div className="meta-row">
                <span>仓库大小</span>
                <strong>{fileContent ? formatFileSize(fileContent.size) : '1.2 MB'}</strong>
            </div>
            <div className="meta-row">
                <span>近 30 天下载</span>
                <strong>842</strong>
            </div>
            <div className="meta-row is-contributors">
                <span>贡献者</span>
                <div className="contributors-stack">
                    <img alt="contributor 1" src={contributorOne} />
                    <img alt="contributor 2" src={contributorTwo} />
                    <span>+3</span>
                </div>
            </div>
        </section>
    </aside>
);
