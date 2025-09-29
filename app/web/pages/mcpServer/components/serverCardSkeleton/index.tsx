import React from 'react';
import { Card, Skeleton, Col } from 'antd';
import './style.scss';

const ServerCardSkeleton: React.FC = () => (
    <Col xs={24} sm={12} lg={8} xl={6}>
        <Card className="server-card skeleton-card">
            <div className="card-cover-skeleton">
                <Skeleton.Button active size="small" style={{ width: 60, height: 20 }} />
                <Skeleton.Button active size="small" style={{ width: 40, height: 20 }} />
            </div>
            <div className="card-content">
                <div className="card-header">
                    <Skeleton.Input active size="small" style={{ width: '70%', height: 24 }} />
                    <Skeleton.Button active size="small" style={{ width: 40, height: 16 }} />
                </div>
                <Skeleton.Input active size="small" style={{ width: '100%', height: 16, marginBottom: 8 }} />
                <Skeleton active paragraph={{ rows: 2, width: ['100%', '80%'] }} title={false} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Skeleton.Button active size="small" style={{ width: 50, height: 20 }} />
                    <Skeleton.Button active size="small" style={{ width: 60, height: 20 }} />
                    <Skeleton.Button active size="small" style={{ width: 40, height: 20 }} />
                </div>
            </div>
        </Card>
    </Col>
);

export default ServerCardSkeleton;
