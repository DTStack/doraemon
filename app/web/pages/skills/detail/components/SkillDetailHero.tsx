import React from 'react';
import { LikeOutlined, StarOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Col, Row, Typography } from 'antd';

import heroSkillIcon from '@/asset/images/skills-detail-figma/hero-skill.svg';
import { SkillCard } from '@/components/skills/SkillCard';
import { SkillDetail, SkillItem } from '../../types';
import type { SkillDetailHistory } from '../utils/skillDetailUtils';
import { formatCompactDate } from '../utils/skillDetailUtils';
import { DetailIcon } from './DetailIcon';

const { Title, Paragraph } = Typography;

interface SkillDetailHeroProps {
    detail: SkillDetail;
    slug: string;
    history: SkillDetailHistory;
    heroSummary: string;
    likeStatus: { liked: boolean; likeCount: number };
    likeLoading: boolean;
    onLike: () => void;
}

export const SkillDetailHero: React.FC<SkillDetailHeroProps> = ({
    detail,
    slug,
    history,
    heroSummary,
    likeStatus,
    likeLoading,
    onLike,
}) => {
    const heroMetaItems = [
        {
            label: '分类',
            value: detail.category || '通用',
        },
        {
            label: '最近更新',
            value: formatCompactDate(detail.updatedAt),
        },
    ];

    return (
        <>
            <Breadcrumb className="skill-breadcrumb">
                {detail.parentSlug ? (
                    <Breadcrumb.Item
                        className="breadcrumb-link"
                        onClick={() => history.push(`/page/skills/${detail.parentSlug}`)}
                    >
                        {detail.parentSlug}
                    </Breadcrumb.Item>
                ) : (
                    <Breadcrumb.Item
                        className="breadcrumb-link"
                        onClick={() => history.push('/page/skills')}
                    >
                        技能列表
                    </Breadcrumb.Item>
                )}
                <Breadcrumb.Item>{detail.name}</Breadcrumb.Item>
            </Breadcrumb>

            <section className="detail-hero-main">
                <div className="hero-head-row">
                    <div className="hero-title-block">
                        <div className="skill-title-icon" aria-hidden="true">
                            <DetailIcon src={heroSkillIcon} className="is-hero" />
                        </div>
                        <div className="hero-copy">
                            <Title level={2}>{detail.name}</Title>
                            <Paragraph className="hero-description">{heroSummary}</Paragraph>
                        </div>
                    </div>

                    <div className="hero-actions">
                        <Button
                            type="text"
                            onClick={onLike}
                            className={`like-btn ${likeStatus.liked ? 'is-liked' : ''}`}
                            aria-pressed={likeStatus.liked}
                            disabled={likeLoading}
                        >
                            {likeStatus.liked ? <LikeOutlined /> : <StarOutlined />}
                            {likeStatus.likeCount}
                        </Button>
                    </div>
                </div>

                <div className="hero-meta-row">
                    {heroMetaItems.map((item) => (
                        <div key={item.label} className="hero-meta-item">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                        </div>
                    ))}
                </div>
            </section>

            {detail.isPackage === 1 && detail.children && detail.children.length > 0 ? (
                <section className="package-children-section">
                    <div className="package-children-header">
                        <span className="package-badge">📦</span>
                        <span className="package-title">包含 {detail.children.length} 个子技能</span>
                    </div>
                    <Row gutter={[16, 16]}>
                        {detail.children.map((child: SkillItem) => (
                            <Col key={child.slug} xs={24} sm={12} lg={8}>
                                <SkillCard
                                    skill={child}
                                    onClick={(s) => history.push(`/page/skills/${slug}/${s.slug}`)}
                                    showMeta={false}
                                    size="compact"
                                />
                            </Col>
                        ))}
                    </Row>
                </section>
            ) : null}
        </>
    );
};
