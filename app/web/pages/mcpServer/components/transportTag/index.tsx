import React from 'react';
import {
    ApiOutlined,
    CloudServerOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

import { TransportConfig, TransportType } from '../../types';
import './style.scss';

interface TransportTagProps {
    transport: TransportType | string;
}

const TransportTag: React.FC<TransportTagProps> = ({ transport }) => {
    // 获取传输类型配置
    const getTransportConfig = (transport: string): TransportConfig => {
        switch (transport) {
            case 'stdio':
                return {
                    color: 'blue',
                    icon: <ApiOutlined />,
                    name: 'STDIO',
                    description: '原始传输方式：标准输入输出',
                };
            case 'streamable-http':
                return {
                    color: 'green',
                    icon: <CloudServerOutlined />,
                    name: 'HTTP',
                    description: '原始传输方式：HTTP传输',
                };
            case 'sse':
                return {
                    color: 'orange',
                    icon: <ThunderboltOutlined />,
                    name: 'SSE',
                    description: '原始传输方式：SSE流式传输',
                };
            default:
                return {
                    color: 'default',
                    icon: <ExclamationCircleOutlined />,
                    name: 'UNKNOWN',
                    description: '未知传输方式',
                };
        }
    };

    const config = getTransportConfig(transport);

    return (
        <Tooltip title={config.description} placement="top">
            <Tag color={config.color} className="transport-tag" icon={config.icon}>
                {config.name}
            </Tag>
        </Tooltip>
    );
};

export default TransportTag;
