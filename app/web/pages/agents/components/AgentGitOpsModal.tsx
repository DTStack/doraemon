import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Space, Typography } from 'antd';

const { Text } = Typography;
const { Option } = Select;

const categoryOptions = [
    '通用',
    '前端',
    '后端',
    '数据与AI',
    '运维与系统',
    '工程效率',
    '安全',
    '其他',
];

interface AgentGitOpsModalProps {
    visible: boolean;
    title: string;
    description: string;
    mode: 'import' | 'setting';
    loading?: boolean;
    initialUrl?: string;
    initialBranch?: string;
    initialCategory?: string;
    onCancel: () => void;
    onOk: (data: { gitUrl: string; gitBranch: string; category: string }) => void;
}

// 统一封装的 Agent Git 配置与导入弹窗组件
export const AgentGitOpsModal: React.FC<AgentGitOpsModalProps> = ({
    visible,
    title,
    description,
    mode,
    loading = false,
    initialUrl = '',
    initialBranch = 'master',
    initialCategory = '工程效率',
    onCancel,
    onOk,
}) => {
    const [gitUrl, setGitUrl] = useState(initialUrl);
    const [gitBranch, setGitBranch] = useState(initialBranch);
    const [category, setCategory] = useState(initialCategory);

    useEffect(() => {
        if (visible) {
            setGitUrl(initialUrl || '');
            setGitBranch(initialBranch || 'master');
            setCategory(initialCategory || '工程效率');
        }
    }, [visible, initialUrl, initialBranch, initialCategory]);

    // 触发提交回调
    const handleOk = () => {
        // 清洗用户输入的仓库地址与分支名称，移除尾部锚点和空格
        const cleanUrl = (gitUrl || '').trim().replace(/#.*$/, '').replace(/\/+$/, '');
        const cleanBranch = (gitBranch || '').trim() || 'master';
        onOk({ gitUrl: cleanUrl, gitBranch: cleanBranch, category });
    };

    // 根据模式生成弹窗底部操作栏
    const renderFooter = () => {
        if (mode === 'import') return undefined;
        return [
            <Button key="cancel" disabled={loading} onClick={onCancel}>
                取消
            </Button>,
            <Button
                key="save"
                type="primary"
                loading={loading}
                disabled={loading}
                onClick={handleOk}
            >
                保存
            </Button>,
        ];
    };

    const footer = renderFooter();

    return (
        <Modal
            title={title}
            visible={visible}
            width={680}
            confirmLoading={loading}
            okText={mode === 'import' ? '开始导入' : undefined}
            cancelText={mode === 'import' ? '取消' : undefined}
            onCancel={onCancel}
            onOk={handleOk}
            footer={footer}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Text type="secondary">{description}</Text>
                <div>
                    <div style={{ marginBottom: 8 }}>GitLab 仓库地址:</div>
                    <Input
                        placeholder="如: http://gitlab.prod.dtstack.cn/xxx/my-agent.git"
                        value={gitUrl}
                        allowClear
                        onChange={(e) => setGitUrl(e.target.value.trim())}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 8 }}>Git 分支:</div>
                    <Input
                        placeholder="master"
                        value={gitBranch}
                        allowClear
                        onChange={(e) => setGitBranch(e.target.value.trim())}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 8 }}>分类:</div>
                    <Select
                        style={{ width: '100%' }}
                        value={category}
                        onChange={(value) => setCategory(value)}
                    >
                        {categoryOptions.map((item) => (
                            <Option key={item} value={item}>
                                {item}
                            </Option>
                        ))}
                    </Select>
                </div>
            </Space>
        </Modal>
    );
};
