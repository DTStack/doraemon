import React from 'react';
import { Breadcrumb } from 'antd';

import InspectorIframe from '../components/inspectorIframe';
import './style.scss';

const McpServerInspector = () => {
    return (
        <div className="mcp-server-inspector">
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>
                    <a href="/page/mcp-server-market">MCP市场</a>
                </Breadcrumb.Item>
                <Breadcrumb.Item>在线调试</Breadcrumb.Item>
            </Breadcrumb>
            <div className="inspector-content">
                <InspectorIframe />
            </div>
        </div>
    );
};

export default McpServerInspector;
