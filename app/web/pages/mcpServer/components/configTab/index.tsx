import React from 'react';
import { Card, Divider, Typography, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { McpServerDetail } from '../../types';
import { copyToClipboard } from '@/utils/copyUtils';

const { Title } = Typography;

interface ConfigTabProps {
    serverDetail: McpServerDetail;
}

const generateConfigExample = (server: McpServerDetail) => {
    const config: any = {
        mcpServers: {
            [server.server_id]: {
                url: `${location.origin}/mcp-endpoint/${server.server_id}${
                    server.transport === 'sse' ? '/sse' : '/mcp'
                }`,
            },
        },
    };

    return JSON.stringify(config, null, 2);
};

const ConfigTab: React.FC<ConfigTabProps> = ({ serverDetail }) => {
    const handleCopyConfig = () => {
        const config = generateConfigExample(serverDetail);
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
                <code>{generateConfigExample(serverDetail)}</code>
            </pre>

            <Divider />

            <Title level={5}>配置说明</Title>
            <ul>
                {serverDetail.transport === 'stdio' && (
                    <>
                        <li>
                            <strong>command</strong>: 启动MCP服务器的命令
                        </li>
                        <li>
                            <strong>args</strong>: 命令行参数数组
                        </li>
                        <li>
                            <strong>env</strong>: 环境变量配置（可选）
                        </li>
                    </>
                )}
                {(serverDetail.transport === 'streamable-http' ||
                    serverDetail.transport === 'sse') && (
                    <li>
                        <strong>url</strong>: 服务器访问地址
                    </li>
                )}
            </ul>
        </Card>
    );
};

export default ConfigTab;
