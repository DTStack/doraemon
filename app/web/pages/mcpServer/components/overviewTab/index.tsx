import React from 'react';
import { Card } from 'antd';

import MarkdownRenderer from '@/components/markdownRenderer';
import { McpServerDetail } from '../../types';

interface OverviewTabProps {
    serverDetail: McpServerDetail;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ serverDetail }) => {
    return (
        <Card className="overview-card" style={{ minHeight: 400 }}>
            {serverDetail.short_description && (
                <>
                    <div
                        style={{
                            marginBottom: 24,
                            padding: '12px 16px',
                            background: '#f5f7fa',
                            borderRadius: '8px',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#333',
                            }}
                        >
                            {serverDetail.short_description}
                        </p>
                    </div>
                </>
            )}
            <div style={{ marginBottom: 16 }}>
                <MarkdownRenderer content={serverDetail.description} />
            </div>
        </Card>
    );
};

export default OverviewTab;
