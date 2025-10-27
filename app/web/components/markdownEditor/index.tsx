import React, { useState } from 'react';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Card, Input, Tabs } from 'antd';

import MarkdownRenderer from '../markdownRenderer';
import './style.scss';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface MarkdownEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    height?: number;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value = '',
    onChange,
    placeholder = '请输入Markdown内容...',
    height = 300,
    disabled = false,
    className = '',
    style,
}) => {
    const [activeTab, setActiveTab] = useState<string>('edit');

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange?.(newValue);
    };

    return (
        <div className={`markdown-editor ${className}`} style={style}>
            <Card className="markdown-editor-card" bodyStyle={{ padding: 0 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    size="small"
                    className="markdown-editor-tabs"
                >
                    <TabPane
                        tab={
                            <span>
                                <EditOutlined />
                                编写
                            </span>
                        }
                        key="edit"
                    >
                        <div className="markdown-editor-container">
                            <TextArea
                                value={value}
                                onChange={handleContentChange}
                                placeholder={placeholder}
                                disabled={disabled}
                                style={{
                                    height,
                                    resize: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    boxShadow: 'none',
                                }}
                                className="markdown-textarea"
                            />
                        </div>
                    </TabPane>
                    <TabPane
                        tab={
                            <span>
                                <EyeOutlined />
                                预览
                            </span>
                        }
                        key="preview"
                    >
                        <div
                            className="markdown-preview-container"
                            style={{ height, overflow: 'auto' }}
                        >
                            {value ? (
                                <MarkdownRenderer content={value} />
                            ) : (
                                <div className="markdown-preview-empty">
                                    <span>暂无内容，请在编写模式下输入Markdown内容</span>
                                </div>
                            )}
                        </div>
                    </TabPane>
                </Tabs>
            </Card>

            {/* 帮助提示 */}
            <div className="markdown-editor-tips">
                <span className="tip-text">
                    支持Markdown语法：**粗体**、*斜体*、`代码`、[链接](url)、## 标题 等
                </span>
            </div>
        </div>
    );
};

export default MarkdownEditor;
