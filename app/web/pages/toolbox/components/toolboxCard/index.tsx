import * as React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Tooltip } from 'antd';
import { builtInApp } from './constant';
import UploadLogo from '../uplodadLogo';
import DtTag from '@/components/dtTag';
import './style.scss';

const ToolBoxCard = (props: any) => {
    const { tool } = props;
    const { id, appName, appTags, appDesc, appType, clickCount } = tool; // appType 0 内置 1 外置
    const helpUrl = getHelpUrl();

    // 内置应用的帮助文档链接
    function getHelpUrl() {
        if (appType === 0) {
            const app = builtInApp.find((item: any) => item.appName === appName);
            return app ? app.helpUrl : ''
        }
        return '';
    }

    // 点击操作
    const handleMenuClick = ({ key, domEvent }: any) => {
        domEvent.stopPropagation();
        switch (key) {
        case 'edit':
            props.onEdit(tool);
            return;
        case 'delete':
            props.onDelete(id);
            return;
        default:
            return;
        }
    }

    const menu = (
        <Menu className="tool-acitons-menu" onClick={handleMenuClick}>
            <Menu.Item key="edit"><i className="iconfont iconicon_edit" />编辑应用</Menu.Item>
            <Menu.Item key="delete"><i className="iconfont iconicon_delete" />删除应用</Menu.Item>
        </Menu >
    )

    return (
        <div className="c-toolbox__ant-card-body">
            <div className="body-header">
                <div className="tool-view">
                    <i className="iconfont iconicon_view" />
                    {clickCount}
                </div>
                {
                    appType === 0
                        ? (
                            helpUrl && (
                                <Tooltip title={`${appName}帮助文档`}>
                                    <QuestionCircleOutlined
                                        onClick={(e: any) => {
                                            e.preventDefault(); // 阻止页面跳转
                                            e.stopPropagation(); // 阻止事件冒泡（点击浏览量）
                                            const otherWindow: any = window.open(helpUrl, '_blank');
                                            otherWindow.opener = null;
                                        }} />
                                </Tooltip>
                            )
                        ) : (
                            <Dropdown trigger={['click']} placement="bottomRight" overlay={menu}>
                                <span className="ant-dropdown-link" onClick={(e: any) => e.stopPropagation()}>
                                    <i className="iconfont iconicon_more2" />
                                </span>
                            </Dropdown>
                        )
                }
            </div>
            <div className="body-content">
                <span onClick={(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}>
                    <UploadLogo tool={tool} />
                </span>
                <p className="tool-title">
                    {appName}
                    {appType === 0 && <i className="iconfont iconicon_star" />}
                </p>
                <Tooltip title={appDesc} mouseEnterDelay={1} placement="rightTop">
                    <p className="tool-desc text-ellipsis">{appDesc}</p>
                </Tooltip>
            </div>
            <div className="body-bottom">
                <div className="tool-tags">
                    {Array.isArray(appTags) && appTags.map((item: any) =>
                        <DtTag key={item.id} color={item.tagColor}>{item.tagName}</DtTag>
                    )}
                </div>
            </div>
        </div>
    );
}
export default ToolBoxCard;