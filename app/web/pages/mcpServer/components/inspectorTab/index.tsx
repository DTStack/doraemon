import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const InspectorTab: React.FC = () => {
    return (
        <Card className="inspector-card">
            <div className="inspector-placeholder">
                <Title level={4}>Inspector 功能</Title>
                <Paragraph>Inspector 功能正在开发中，敬请期待...</Paragraph>
                <div className="inspector-features">
                    <h5>即将支持的功能：</h5>
                    <ul>
                        <li>在线调用MCP服务器方法</li>
                        <li>实时查看请求和响应</li>
                        <li>智能诊断和监控信息</li>
                        <li>性能监控和日志查看</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default InspectorTab;
