import React, { useState } from 'react';
import { Icon, Tag, Dropdown, Menu, Tooltip } from 'antd';
import { builtInApp } from './constant';
import UploadLogo from '../uplodadLogo';
import './style.scss';

const ToolBoxCard = (props) => {
  const { tool } = props;
  const { id, appName, appTags, appDesc, appType, clickCount } = tool; // appType 0 内置 1 外置
  const helpUrl = getHelpUrl();

  // 内置应用的帮助文档链接
  function getHelpUrl () {
    if (appType === 0) {
      const app = builtInApp.find(item => item.appName === appName);
      return app ? app.helpUrl : ''
    }
    return '';
  }

  // 点击操作
  const handleMenuClick = ({ key, domEvent }) => {
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
        {
          appType === 0
            ? (
              helpUrl && (
                <Tooltip title={`${appName}帮助文档`}>
                  <Icon
                    type="question-circle"
                    onClick={(e) => {
                      e.preventDefault(); // 阻止页面跳转
                      e.stopPropagation(); // 阻止事件冒泡（点击浏览量）
                      const otherWindow = window.open(helpUrl, '_blank');
                      otherWindow.opener = null;
                    }}
                  />
                </Tooltip>
              )
            ) : (
              <Dropdown trigger={['click']} overlay={menu} onClick={e => e.stopPropagation()}>
                <span className="ant-dropdown-link">
                  <i className="iconfont iconicon_more" />
                </span>
              </Dropdown>
            )
        }
      </div>
      <div className="body-content">
        <div className="clearfix" onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}>
          <UploadLogo tool={tool} />
        </div>
        <div>
          <p className="title">
            {appName}
            {appType === 0 && <i className="iconfont iconicon_star" />}
          </p>
          <p className="desc">{appDesc}</p>
        </div>
      </div>
      <div className="body-bottom">
        <div className="tags">
          {Array.isArray(appTags) && appTags.map(item =>
            <Tag
              style={{ color: item.tagColor, background: `${item.tagColor}1c` }}
              key={item.id}
            >
              {item.tagName}
            </Tag>
          )}
        </div>
        <div className="page-view">
          <i className="iconfont iconicon_view" />
          {clickCount}
        </div>
      </div>
    </div >
  )
}
export default ToolBoxCard;