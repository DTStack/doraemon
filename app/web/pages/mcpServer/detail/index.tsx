import React, { useEffect, useState } from 'react';
import { ArrowLeftOutlined, GithubOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, message, Space, Spin, Tabs, Tag, Typography } from 'antd';

import { API } from '@/api';
import ConfigTab from '../components/configTab';
import InspectorTab from '../components/inspectorTab';
import OverviewTab from '../components/overviewTab';
import StatusBadge from '../components/statusBadge';
import ToolsResourcesTab from '../components/toolsResourcesTab';
import TransportTag from '../components/transportTag';
import { McpServerDetail } from '../types';
import './style.scss';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const McpServerDetailPage: React.FC = (props: any) => {
    const { serverId } = props.match.params;
    const { history } = props;
    const [loading, setLoading] = useState(true);
    const [serverDetail, setServerDetail] = useState<McpServerDetail | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    // 获取服务器详情
    const fetchServerDetail = async () => {
        setLoading(true);
        try {
            const response = await API.getMCPServerDetail({ serverId });
            if (response.success) {
                setServerDetail(response.data);
            } else {
                message.error(response.msg || '获取服务器详情失败');
            }
        } catch (error) {
            message.error('获取服务器详情失败');
            console.error('获取服务器详情错误:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServerDetail();
    }, [serverId]);

    const handleBack = () => {
        history.push('/page/mcp-server-market');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-CN');
    };

    const renderServerActions = () => {
        return (
            <Space>
                {serverDetail?.git_url && (
                    <Button
                        icon={<GithubOutlined />}
                        onClick={() => window.open(serverDetail.git_url, '_blank')}
                    >
                        GitHub
                    </Button>
                )}

                <Button icon={<SettingOutlined />} onClick={() => setActiveTab('inspector')}>
                    调试
                </Button>
            </Space>
        );
    };

    if (loading) {
        return (
            <div className="mcp-server-detail loading">
                <Spin size="large" />
            </div>
        );
    }

    if (!serverDetail) {
        return (
            <div className="mcp-server-detail error">
                <Title level={3}>服务器详情不存在</Title>
                <Button onClick={handleBack}>返回列表</Button>
            </div>
        );
    }

    return (
        <div className="mcp-server-detail">
            <div className="detail-header">
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack} className="back-button">
                    返回列表
                </Button>

                <div className="server-info">
                    <div className="title-section">
                        <Title level={2} className="server-title">
                            {serverDetail.title}
                        </Title>
                        <div className="status-tags">
                            <TransportTag transport={serverDetail.transport} />
                            <StatusBadge
                                status={serverDetail.status}
                                errorMsg={serverDetail.ping_error}
                            />
                        </div>
                    </div>

                    <div className="server-name-section">
                        <Text code className="server-name">
                            id: {serverDetail.server_id}
                        </Text>
                        <div className="tags">
                            {serverDetail.tags.map((tag) => (
                                <Tag key={tag}>{tag}</Tag>
                            ))}
                        </div>
                    </div>

                    <div className="meta-info">
                        <Space size="large">
                            <span>版本: v{serverDetail.version}</span>
                            <span>调用次数: {serverDetail.use_count} 次</span>
                            <span>作者: {serverDetail.author}</span>
                            <span>创建于: {formatDate(serverDetail.created_at)}</span>
                            <span>上次状态更新: {formatDate(serverDetail.updated_at)}</span>
                        </Space>
                    </div>
                </div>

                <div className="action-buttons">{renderServerActions()}</div>
            </div>

            <div className="detail-content">
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab="概览" key="overview">
                        <OverviewTab serverDetail={serverDetail} />
                    </TabPane>

                    <TabPane tab="配置示例" key="config">
                        <ConfigTab serverDetail={serverDetail} />
                    </TabPane>

                    <TabPane tab="工具与资源" key="tools-resources">
                        <ToolsResourcesTab serverDetail={serverDetail} />
                    </TabPane>

                    <TabPane tab="调试" key="inspector">
                        <InspectorTab serverDetail={serverDetail} />
                    </TabPane>
                </Tabs>
            </div>
        </div>
    );
};

export default McpServerDetailPage;
