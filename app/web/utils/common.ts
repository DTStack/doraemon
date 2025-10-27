import { TransportType } from '@/pages/mcpServer/types';

interface MCPServerConfig {
    name: string;
    transport: TransportType;
    command?: string;
    args?: string;
    env?: Array<{ key: string; value: string }>;
    httpUrl?: string;
    sseUrl?: string;
}

export const generateMCPClientConfig = (config: MCPServerConfig) => {
    const { name, transport, command, args, env, httpUrl, sseUrl } = config;

    if (transport === 'stdio') {
        const envObj: Record<string, string> = {};

        // 添加环境变量
        if (env && env.length > 0) {
            env.forEach((item: { key: string; value: string }) => {
                if (item.key && item.value) {
                    envObj[item.key] = item.value;
                }
            });
        }

        // 处理参数：支持空格和换行符切分
        const parseArgs = (argsStr: string) => {
            return argsStr
                .split(/[\s\n]+/) // 使用空格和换行符切分
                .map((arg: string) => arg.trim())
                .filter((arg: string) => arg.length > 0);
        };

        const mcpConfig: any = {
            mcpServers: {
                [name || 'your-server-name']: {
                    command: command || 'node',
                    args: args ? parseArgs(args) : ['path/to/your/server.js'],
                    env: Object.keys(envObj).length > 0 ? envObj : undefined,
                },
            },
        };

        return JSON.stringify(mcpConfig, null, 2);
    } else if (transport === 'streamable-http') {
        return JSON.stringify(
            {
                mcpServers: {
                    [name || 'your-server-name']: {
                        url: httpUrl,
                    },
                },
            },
            null,
            2
        );
    } else if (transport === 'sse') {
        return JSON.stringify(
            {
                mcpServers: {
                    [name || 'your-server-name']: {
                        url: sseUrl,
                    },
                },
            },
            null,
            2
        );
    }

    return '{}';
};
