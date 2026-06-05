import React from 'react';
import { FileTextOutlined, FolderOutlined, StarOutlined } from '@ant-design/icons';
import { Card, Checkbox, Tag } from 'antd';

import type { SkillItem } from '@/pages/skills/types';

interface SkillCardProps {
    skill: SkillItem;
    onClick: (skill: SkillItem) => void;
    onEdit?: (skill: SkillItem) => void;
    showMeta?: boolean;
    showChildrenPreview?: boolean;
    childrenList?: SkillItem[];
    size?: 'default' | 'compact';
    selected?: boolean;
    onSelect?: (skill: SkillItem, selected: boolean) => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({
    skill,
    onClick,
    onEdit,
    showMeta = true,
    showChildrenPreview = false,
    childrenList = [],
    size = 'default',
    selected = false,
    onSelect,
}) => {
    const isPackage = skill.isPackage === 1;
    const isCompact = size === 'compact';

    return (
        <Card
            className={`skill-card-unified ${isPackage ? 'is-package' : ''} ${
                isCompact ? 'is-compact' : ''
            } ${selected ? 'is-selected' : ''}`}
            hoverable
            onClick={() => onClick(skill)}
        >
            <div className="card-main">
                <div className="card-icon-shell">
                    {isPackage ? (
                        <FolderOutlined className="card-icon is-package-icon" />
                    ) : (
                        <FileTextOutlined className="card-icon is-skill-icon" />
                    )}
                </div>
                <div className="card-content">
                    <div className="card-header-row">
                        <span className="card-name">{skill.name}</span>
                        <div className="card-badges">
                            {onSelect && (
                                <Checkbox
                                    className="select-checkbox"
                                    checked={selected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => onSelect(skill, e.target.checked)}
                                />
                            )}
                            {isPackage && (
                                <Tag color="magenta" className="package-badge">
                                    技能包
                                </Tag>
                            )}
                            <span className="stars-badge">
                                <StarOutlined /> {skill.stars || 0}
                            </span>
                            {onEdit && (
                                <button
                                    type="button"
                                    className="edit-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(skill);
                                    }}
                                    aria-label={`编辑 ${skill.name}`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path
                                            d="M9.916 2.334a1.65 1.65 0 1 1 2.334 2.332l-6.27 6.27a1.5 1.5 0 0 1-.707.39l-2.024.45.45-2.025a1.5 1.5 0 0 1 .39-.706l6.27-6.27Z"
                                            stroke="currentColor"
                                            strokeWidth="1.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="card-description">{skill.description || '暂无描述'}</p>
                    <div className="card-tags">
                        <Tag className="category-tag">{skill.category || '通用'}</Tag>
                        {skill.tags?.slice(0, 3).map((tag) => (
                            <Tag key={tag} className="skill-tag">
                                {tag}
                            </Tag>
                        ))}
                    </div>
                    {showChildrenPreview && isPackage && childrenList.length > 0 && (
                        <div className="children-preview">
                            <span className="children-label">包含:</span>
                            <span className="children-names">
                                {childrenList
                                    .slice(0, 3)
                                    .map((c) => c.name)
                                    .join(' · ')}
                                {childrenList.length > 3 && ` 等 ${childrenList.length} 个`}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {showMeta && (
                <div className="card-meta">
                    <span className="meta-item">
                        <span className="meta-label">来源</span>
                        <span
                            className="meta-value"
                            title={skill.sourceRepo || skill.sourcePath || '-'}
                        >
                            {skill.sourceRepo || skill.sourcePath || '-'}
                        </span>
                    </span>
                    <span className="meta-separator">·</span>
                    <span className="meta-item">
                        <span className="meta-label">更新</span>
                        <span className="meta-value">
                            {skill.updatedAt
                                ? new Date(skill.updatedAt).toLocaleDateString('zh-CN')
                                : '-'}
                        </span>
                    </span>
                </div>
            )}
        </Card>
    );
};
