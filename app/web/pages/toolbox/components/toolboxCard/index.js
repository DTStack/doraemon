import React, { useState } from 'react';
import { Icon, Tag, Dropdown, Menu, Tooltip } from 'antd';
import UploadLogo from '../uplodadLogo';
import './style.scss';

const ToolBoxCard = (props) => {
  const { tool, type } = props; // type 0 内置 1 外置
  const { id, appName, appTags, appDesc, helpUrl, clickCount } = tool;

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
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="edit">编辑</Menu.Item>
      <Menu.Item key="delete">删除</Menu.Item>
    </Menu >
  )

  return (
    <div className="c-toolbox__ant-card-body">
      {
        type === 0
          ? (
            <div className="body-header">
              <Icon type="link" />
              {helpUrl && (
                <Tooltip title={`${appName}帮助文档`}>
                  <Icon
                    type="question-circle"
                    onClick={(e) => {
                      e.preventDefault(); // 阻止页面跳转
                      e.stopPropagation(); // 阻止事件冒泡（点击浏览量）
                      var otherWindow = window.open(helpUrl, '_blank');
                      otherWindow.opener = null;
                    }}
                  />
                </Tooltip>
              )}
            </div>
          ) : (
            <div className="body-header flex-end">
              <Dropdown trigger={['click']} overlay={menu} onClick={e => e.stopPropagation()}>
                <span className="ant-dropdown-link" >
                  <Icon type="setting" />
                </span>
              </Dropdown>
            </div>
          )
      }
      <div className="body-content">
        <div className="clearfix" onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}>
          <UploadLogo tool={tool} />
        </div>
        <div className="ml-20">
          <p className="title">{appName}</p>
          <p className="desc">{appDesc}</p>
        </div>
      </div>
      <div className="body-bottom">
        <div className="tags">
          {Array.isArray(appTags) && appTags.map(item =>
            <Tag
              style={{ color: item.tagColor, background: `${item.tagColor}24`, borderColor: item.tagColor }}
              key={item.id}
            >
              {item.tagName}
            </Tag>
          )}
        </div>
        <div className="page-view">
          <Icon type="eye" />&nbsp;
          {clickCount}
        </div>
      </div>
    </div >
  )
}
export default ToolBoxCard;