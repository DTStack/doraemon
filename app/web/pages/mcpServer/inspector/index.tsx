import React from 'react';
import { Card, Result, Button } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import './style.scss';

const McpServerInspector: React.FC = (props: any) => {
    const { id } = props.match.params;
    const { history } = props;

    const handleBack = () => {
        history.push(`/page/mcp-server-detail/${id}`);
    };

    const handleBackToList = () => {
        history.push('/page/mcp-server-market');
    };

    return (
        <div className="mcp-server-debug">
            <div className="debug-header">
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack} className="back-button">
                    返回详情
                </Button>
                <h2>MCP-Server Inspector</h2>
            </div>

            <div className="debug-content">
                <Card className="debug-placeholder-card">
                    <Result
                        icon={<EyeOutlined />}
                        title="Inspector 功能开发中"
                        subTitle="MCP-Server Inspector 功能正在开发中，敬请期待更强大的检查和监控体验。"
                        extra={[
                            <Button type="primary" key="back-detail" onClick={handleBack}>
                                返回详情页
                            </Button>,
                            <Button key="back-list" onClick={handleBackToList}>
                                返回列表
                            </Button>,
                        ]}
                    >
                        <div className="debug-features-preview">
                            <h4>即将推出的功能：</h4>
                            <div className="features-grid">
                                <div className="feature-item">
                                    <div className="feature-icon">🔧</div>
                                    <div className="feature-text">
                                        <strong>在线检查</strong>
                                        <p>直接在浏览器中检查MCP服务器</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">📡</div>
                                    <div className="feature-text">
                                        <strong>实时通信</strong>
                                        <p>实时查看请求和响应数据</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">📊</div>
                                    <div className="feature-text">
                                        <strong>性能监控</strong>
                                        <p>监控服务器性能和响应时间</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon">🐛</div>
                                    <div className="feature-text">
                                        <strong>智能诊断</strong>
                                        <p>自动检测和诊断常见问题</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Result>
                </Card>
            </div>
        </div>
    );
};

export default McpServerInspector;
