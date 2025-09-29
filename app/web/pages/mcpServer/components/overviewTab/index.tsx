import React from 'react';
import {
    Card,
    Typography,
} from 'antd';
import { McpServerDetail } from '../../types';
import MarkdownRenderer from '@/components/markdownRenderer';

const { Title } = Typography;

interface OverviewTabProps {
    serverDetail: McpServerDetail;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ serverDetail }) => {

    return (
        <Card className="overview-card">
            <Title level={4}>描述</Title>
            <div style={{ marginBottom: 16 }}>
                <MarkdownRenderer content={serverDetail.description} />
            </div>
        </Card>
    );
};

export default OverviewTab;
