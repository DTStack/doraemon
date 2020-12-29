import React, { useState, useEffect, Fragment } from 'react';
import { Row, Col, Icon, Button, Popconfirm, Card, Tooltip, Input, Select, Modal } from 'antd';
import Loading from '@/components/loading';
import { API } from '@/api';
import { urlReg } from '@/utils/reg';
import { Link } from 'react-router-dom';
import CreateApp from './components/CreateApp';
import ToolboxCard from './components/toolboxCard';
import './style.scss';
import ToolBoxCard from './components/toolboxCard';
const { Search } = Input;
const { Option } = Select;

const Toolbox = () => {
  const initApp = [
    {
      appName: 'Remote Hosts',
      appDesc: '袋鼠云内部团队host集中管理系统',
      appUrl: '/page/switch-hosts-list',
      helpUrl: 'https://dtstack.yuque.com/rd-center/sm6war/rinsoa'
    }
  ];
  const [tagList, setTagList] = useState([]);
  const [reqParams, setReqParams] = useState({
    appName: '',
    appTags: []
  });
  const [toolList, setToolList] = useState([]);
  const [appInfo, setAppInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [visible, setVisbile] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const loadMainData = () => {
    setLoading(true);
    API.getAppCentersList({}).then((response) => {
      setLoading(false);
      const { success, data } = response;
      if (success) {
        setToolList(data.data);
      }
    });
  }

  // 获取标签列表
  const getTagList = () => {
    API.getTagList({
      current: 1,
      size: 10000,
      searchText: ''
    }).then((res) => {
      const { success, data, msg } = res;
      if (success) {
        setTagList(data.data || []);
      } else {
        message.error(msg);
      }
    })
  }

  useEffect(() => {
    loadMainData();
    getTagList();
  }, []);

  useEffect(() => {
    API.getAppCentersList(reqParams).then((response) => {
      const { success, data } = response;
      if (success) {
        setToolList(data.data);
      }
    });
  }, [reqParams]);

  // 输入应用名称搜索
  const handleNameSearch = (appName) => {
    setReqParams({
      ...reqParams,
      appName
    })
  }

  // 标签筛选
  const handleTagSearch = (appTags) => {
    setReqParams({
      ...reqParams,
      appTags
    })
  }

  // 添加 | 编辑
  const updateApplication = (params) => {
    const { appName, appUrl, appDesc, appTags, id } = params
    setConfirmLoading(true)
    API.updateApplication({
      appName,
      appUrl,
      appDesc,
      appTags,
      id
    }).then((response) => {
      const { success } = response
      if (success) {
        setConfirmLoading(false)
        onHandleAddApp()
        setAppInfo({})
        loadMainData()
      }
    });
  }

  const deleteApplication = (id) => {
    Modal.confirm({
      title: '确认将该应用移除？',
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        API.deleteApplication({ id }).then((response) => {
          const { success } = response;
          if (success) {
            loadMainData()
          }
        })
      }
    })
  }

  const onHandleAddApp = () => {
    setVisbile(!visible)
    setAppInfo({})
  }

  const onHandleEditApp = (id) => {
    setVisbile(!visible)
    API.getApplicationById({ id }).then((response) => {
      const { success, data } = response
      if (success) {
        setAppInfo(data)
      }
    });
  }

  const onHandleClickApp = (params) => {
    API.clickApplication({ params });
    // 页面上显示的点击量也触发更改
    const newToolList = [...toolList];
    const toolIdx = newToolList.findIndex(item => item.id === params.id);
    const tool = {
      ...params,
      clickCount: params.clickCount + 1
    };
    newToolList.splice(toolIdx, 1, tool);
    setToolList(newToolList);
  }

  const handleEdit = (tool) => {
    onHandleEditApp(tool.id);
    onHandleClickApp(tool);
  }

  const renderCard = (list) => list.map((tool, index) => {
    const { id, appName, appUrl } = tool;
    const componentContent = (
      <ToolBoxCard
        type={urlReg.test(appUrl) ? 1 : 0}
        tool={tool}
        onEdit={handleEdit}
        onDelete={deleteApplication}
      />
    )
    return (
      <Col className="navigation-item-wrapper" key={id || appName} span={6}>
        <Card>
          {
            urlReg.test(appUrl)
              ? (
                <a
                  href={appUrl}
                  rel="noopener noreferrer"
                  target='_blank'
                  className="navigation-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHandleClickApp(tool)
                  }}
                >
                  {componentContent}
                </a>
              )
              : (
                <Link
                  to={appUrl}
                  className="navigation-item"
                >
                  {componentContent}
                </Link>
              )
          }
        </Card>
      </Col>
    )
  })
  return (<Loading loading={loading}>
    <div className="page-toolbox">
      <div className="toolbox-title mb-12">应用中心</div>
      <div className="toolbox-header">
        <div>
          <Search
            className="dt-form-shadow-bg"
            style={{ width: 200 }}
            placeholder="请输入应用名称搜索"
            onSearch={handleNameSearch}
          />
          <span className="ml-20">
            标签：
            <Select
              className="dt-form-shadow-bg"
              style={{ width: 200 }}
              placeholder="请选择标签"
              mode="multiple"
              onChange={handleTagSearch}
            >
              {tagList.map(item => <Option key={item.id}>{item.tagName}</Option>)}
            </Select>
          </span>
        </div>
        <Button type="primary" onClick={onHandleAddApp}>添加应用</Button>
      </div>
      <Row className="tool-list" gutter={10}>
        {
          renderCard(initApp)
        }
        {
          renderCard(toolList)
        }
      </Row>
      <CreateApp
        key={visible}
        visible={visible}
        appInfo={appInfo}
        tagList={tagList}
        confirmLoading={confirmLoading}
        onOk={updateApplication}
        onCancel={onHandleAddApp} />
    </div>
  </Loading>)
}
export default Toolbox;
