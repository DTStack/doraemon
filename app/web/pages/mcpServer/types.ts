import { MCPServerStatus } from './components/statusBadge';

export type TransportType = 'stdio' | 'streamable-http' | 'sse';

export interface McpServerItem {
    id: number;
    server_id: string;
    title: string;
    description: string;
    short_description?: string;
    author: string;
    version: string;
    transport: TransportType;
    tags: string[];
    use_count: number;
    status: MCPServerStatus;
    created_at: string;
    updated_at: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    http_url?: string;
    sse_url?: string;
    git_url?: string;
    deploy_path?: string;
    ping_error?: string;
    last_ping_at?: string;
}

export interface McpServerDetail extends McpServerItem {
    tools?: any[];
    prompts?: any[];
    resources?: any[];
    capabilities?: any;
    last_sync_at?: string;
}

export interface TransportConfig {
    color: string;
    icon: React.ReactNode;
    name: string;
    description: string;
}

export interface StatusConfig {
    status: 'success' | 'error' | 'default';
    text: string;
    icon: React.ReactNode;
    color: string;
    description: string;
}
