import React, { useMemo } from 'react';
import env from '@env';
import { Card } from 'antd';

import { McpServerDetail } from '../../types';
import InspectorIframe from '../inspectorIframe';

interface InspectorTabProps {
    serverDetail: McpServerDetail;
}

const InspectorTab = ({ serverDetail }: InspectorTabProps) => {
    const initConfig = useMemo(() => {
        return {
            transport: serverDetail.transport === 'sse' ? 'sse' : 'streamable-http',
            serverUrl: `${location.protocol}//${location.hostname}:${
                env.mcpEndpointPort
            }/mcp-endpoint/${serverDetail.server_id}${
                serverDetail.transport === 'sse' ? '/sse' : '/mcp'
            }`,
        };
    }, [serverDetail]);

    return (
        <Card className="inspector-card">
            <InspectorIframe config={initConfig} />
        </Card>
    );
};

export default InspectorTab;
