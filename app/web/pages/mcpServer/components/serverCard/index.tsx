import React from 'react';
import { Card, Col, Tag } from 'antd';

import { McpServerItem } from '../../types';
import StatusBadge from '../statusBadge';
import TransportTag from '../transportTag';
import './style.scss';

interface ServerCardProps {
    server: McpServerItem;
    index: number;
    loading?: boolean;
    onViewDetail: (serverId: string) => void;
}

const ServerCard: React.FC<ServerCardProps> = ({
    server,
    index,
    loading = false,
    onViewDetail,
}) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-CN');
    };

    return (
        <Col xs={24} sm={12} lg={8} xl={8}>
            <Card
                className="server-card"
                hoverable
                style={{
                    animationDelay: `${index * 0.1}s`,
                    opacity: loading ? 0 : 1,
                }}
            >
                <div className="card-content" onClick={() => onViewDetail(server.server_id)}>
                    <div className="card-header">
                        <div className="header-left">
                            <h3
                                className="server-title"
                                title={server.title}
                                onClick={() => onViewDetail(server.server_id)}
                            >
                                {server.title}
                            </h3>
                            <div className="author-info">
                                <span className="author-label">作者:</span>
                                <span className="author-name" title={server.author}>
                                    {server.author}
                                </span>
                            </div>
                        </div>
                        <div className="header-right">
                            <TransportTag transport={server.transport} />
                            <StatusBadge status={server.status} errorMsg={server.ping_error} />
                        </div>
                    </div>

                    <div className="description-section">
                        <p
                            className="description"
                            title={server.short_description || server.description}
                        >
                            {server.short_description || server.description || '暂无描述'}
                        </p>
                    </div>

                    <div className="card-footer">
                        <div className="footer-date">
                            <span>创建于: {formatDate(server.created_at)}</span>
                            <span>调用次数: {server.use_count}</span>
                        </div>
                        <div className="tags-section">
                            {server.tags.map((tag, tagIndex) => (
                                <Tag key={tagIndex} className="server-tag">
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </Col>
    );
};

export default ServerCard;
