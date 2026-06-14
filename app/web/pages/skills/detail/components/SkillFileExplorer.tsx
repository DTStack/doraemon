import React from 'react';
import { ArrowLeftOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Empty, Tree } from 'antd';

import fileDocIcon from '@/asset/images/skills-detail-figma/file-doc.svg';
import folderOpenBlueIcon from '@/asset/images/skills-detail-figma/folder-open-blue.svg';
import { copyToClipboard } from '@/utils/copyUtils';

import type { SkillDetailHistory, SkillTreeNode } from '../utils/skillDetailUtils';
import { DetailIcon } from './DetailIcon';

interface SkillFileExplorerProps {
    version?: string;
    parentSlug?: string | null;
    routeParentSlug?: string;
    history: SkillDetailHistory;
    fileTreeData: SkillTreeNode[];
    selectedFilePath: string;
    onSelectFile: (path: string) => void;
    isInstallable: boolean;
    skillInstallCommand: string;
    downloadCommand: string;
    sourceUrl: string;
    onFocusInstallPanel: () => void;
}

export const SkillFileExplorer: React.FC<SkillFileExplorerProps> = ({
    version,
    parentSlug,
    routeParentSlug,
    history,
    fileTreeData,
    selectedFilePath,
    onSelectFile,
    isInstallable,
    skillInstallCommand,
    downloadCommand,
    sourceUrl,
    onFocusInstallPanel,
}) => {
    const handleBack = () => {
        const parent = parentSlug || routeParentSlug;
        if (parent) {
            history.push(`/page/skills/${parent}`);
            return;
        }
        history.push('/page/skills');
    };

    return (
        <aside className="detail-left-sidebar">
            <div className="sidebar-head">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    className="back-btn"
                />
                <div className="sidebar-title-group">
                    <span>技能目录</span>
                    <strong>{version || '-'}</strong>
                </div>
            </div>

            <div className="sidebar-tree-wrap">
                {fileTreeData.length === 0 ? (
                    <Empty description="暂无文件" />
                ) : (
                    <Tree
                        treeData={fileTreeData}
                        defaultExpandAll
                        selectable={false}
                        titleRender={(node) => (
                            <span
                                className={`explorer-tree-item ${
                                    node.key === selectedFilePath ? 'is-selected' : ''
                                }`.trim()}
                                role={node.isLeaf ? 'button' : undefined}
                                tabIndex={node.isLeaf ? 0 : -1}
                                onClick={() => {
                                    if (!node.isLeaf) return;
                                    onSelectFile(String(node.key));
                                }}
                                onKeyDown={(event) => {
                                    if (!node.isLeaf) return;
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelectFile(String(node.key));
                                    }
                                }}
                            >
                                <DetailIcon
                                    src={node.isLeaf ? fileDocIcon : folderOpenBlueIcon}
                                    className={`is-tree-node ${node.isLeaf ? 'is-leaf' : 'is-folder'}`}
                                />
                                <span>{String(node.title)}</span>
                            </span>
                        )}
                    />
                )}
            </div>

            <div className="sidebar-foot">
                <Button
                    type="primary"
                    block
                    disabled={isInstallable}
                    className={`install-primary-btn ${isInstallable ? 'is-disabled' : ''}`}
                    onClick={() => {
                        onFocusInstallPanel();
                        copyToClipboard(
                            isInstallable ? skillInstallCommand : downloadCommand,
                            isInstallable
                                ? '技能安装命令已复制到剪贴板'
                                : '下载命令已复制到剪贴板'
                        );
                    }}
                >
                    {isInstallable ? '变更日志' : '下载技能'}
                </Button>
                <button
                    type="button"
                    className="sidebar-help-btn"
                    onClick={() =>
                        window.open(
                            sourceUrl || 'https://github.com/JackWang032/doraemon-proxy-tool',
                            '_blank'
                        )
                    }
                >
                    <QuestionCircleOutlined />
                    <span>帮助</span>
                </button>
            </div>
        </aside>
    );
};
