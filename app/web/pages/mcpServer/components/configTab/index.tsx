import React from 'react';
import { CopyOutlined } from '@ant-design/icons';
import env from '@env';
import { Button, Card } from 'antd';

import { generateMCPClientConfig } from '@/utils/common';
import { copyToClipboard } from '@/utils/copyUtils';
import { McpServerDetail } from '../../types';

interface ConfigTabProps {
    serverDetail: McpServerDetail;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ serverDetail }) => {
    const config = generateMCPClientConfig({
        name: serverDetail.server_id,
        transport: serverDetail.transport === 'sse' ? 'sse' : 'streamable-http',
        httpUrl: `${location.protocol}//${location.hostname}:${env.mcpEndpointPort}/mcp-endpoint/${serverDetail.server_id}/mcp`,
        sseUrl: `${location.protocol}//${location.hostname}:${env.mcpEndpointPort}/mcp-endpoint/${serverDetail.server_id}/sse`,
    });

    const handleCopyConfig = () => {
        copyToClipboard(config, '配置已复制到剪贴板');
    };

    return (
        <Card
            className="config-card"
            title="MCP Client 配置示例"
            extra={
                <Button icon={<CopyOutlined />} onClick={handleCopyConfig} size="small">
                    复制配置
                </Button>
            }
        >
            <pre className="config-code">
                <code>{config}</code>
            </pre>
        </Card>
    );
};

export default ConfigTab;
