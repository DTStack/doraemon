import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Badge, Tooltip } from 'antd';

export type MCPServerStatus = 'running' | 'stopped' | 'error';

export interface StatusBadgeProps {
    status: MCPServerStatus;
    errorMsg?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, errorMsg }) => {
    const getBadgeConfig = () => {
        switch (status) {
            case 'running':
                return <Badge status="success" text="运行中" />;
            case 'stopped':
                return <Badge status="default" text="已停止" />;
            case 'error':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Badge status="error" text="运行错误" />
                        {!!errorMsg && (
                            <Tooltip title={errorMsg}>
                                <InfoCircleOutlined style={{ color: '#999' }} />
                            </Tooltip>
                        )}
                    </span>
                );
            default:
                return <Badge status="warning" text="未知" />;
        }
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {getBadgeConfig()}
        </div>
    );
};

export default StatusBadge;
