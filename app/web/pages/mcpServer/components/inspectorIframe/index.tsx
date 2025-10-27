import React, { useMemo } from 'react';
import env from '@env';

const { mcpInspectorWebPort, mcpInspectorServerPort } = env;

interface InspectorConfig {
    transport?: string;
    serverCommand?: string;
    serverArgs?: string[];
    serverUrl?: string;
}

interface InspectorIframeProps {
    config?: InspectorConfig;
}

const createQueryString = (config?: InspectorConfig) => {
    const queryParams: Record<string, string> = {
        MCP_PROXY_PORT: mcpInspectorServerPort.toString(),
        transport: config?.transport || 'streamable-http',
        serverCommand: config?.serverCommand || 'npx',
        serverArgs: config?.serverArgs?.join(',') || '',
        serverUrl:
            config?.serverUrl ||
            `${location.protocol}//${location.hostname}:${env.mcpEndpointPort}/mcp-endpoint/your-server-id/mcp`,
    };
    const searchParams = new URLSearchParams(queryParams);
    return searchParams.toString();
};

const InspectorIframe = ({ config }: InspectorIframeProps) => {
    const queryString = useMemo(() => createQueryString(config), [config]);

    return (
        <div className="mcp-inspector-iframe" style={{ minHeight: 800, height: 800 }}>
            <iframe
                src={`${location.protocol}//${location.hostname}:${mcpInspectorWebPort}?${queryString}`}
                style={{ width: '100%', height: '100%' }}
            ></iframe>
        </div>
    );
};

export default InspectorIframe;
