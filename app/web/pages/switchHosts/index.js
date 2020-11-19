import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import { Divider, Table, Button, Breadcrumb, Input, Typography, Modal, Icon } from 'antd';
import { API } from '@/api';

const { Paragraph } = Typography;
const { Search } = Input;

const SwitchHostsList = (props) => {
  const [hostsList, setHostsList] = useState({
    data: [],
    totalElement: 0
  });
  const [reqParams, setReqParams] = useState({
    current: 1,
    size: 20,
    searchText: ''
  })
  const pagination = {
    size: 'small',
    current: reqParams.current,
    pageSize: reqParams.size,
    total: hostsList.totalElement,
    showTotal: (total) => <span>共<span style={{ color: '#3F87FF' }}>{hostsList.totalElement}</span>条数据，每页显示{reqParams.size}条</span>
  }
  const [tableLoading, setTableLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState('');

  useEffect(() => {
    getHostsList();
    getServerInfo();
  }, [reqParams]);

  // 获取IP
  const getServerInfo = () => {
    API.getServerInfo().then((res) => {
      const { success, data } = res;
      if (success) {
        setServerInfo(data)
      }
    })
  }

  // 获取列表数据
  const getHostsList = () => {
    setTableLoading(true);
    API.getHostsList(reqParams).then((res) => {
      const { success, data, msg } = res;
      if (success) {
        setHostsList({
          data: data.data || [],
          totalElement: data.count || 0
        });
      } else {
        message.error(msg);
      }
      setTableLoading(false);
    })
  }

  // 初始化表格列
  const initColumns = () => {
    const columns = [
      {
        title: '群组名称',
        dataIndex: 'groupName',
        key: 'groupName'
      },
      // {
      //   title: '群组ID',
      //   dataIndex: 'groupId',
      //   key: 'groupId',
      //   render: text => text || '--'
      // }, 
      {
        title: '群组API',
        dataIndex: 'groupApi',
        key: 'groupApi',
        width: '25%',
        render: text => <Paragraph copyable>{`${serverInfo.protocol}://${serverInfo.host}${text}`}</Paragraph>
      }, {
        title: '描述',
        dataIndex: 'groupDesc',
        key: 'groupDesc',
        render: text => text || '--'
      }, {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (value, record) => {
          return moment(value).format('YYYY-MM-DD HH:mm:ss')
        }
      }, {
        title: '更新时间',
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (value, record) => {
          return moment(value).format('YYYY-MM-DD HH:mm:ss')
        }
      }, {
        title: '操作',
        dataIndex: 'actions',
        key: 'actions',
        render: (text, record) => {
          return <Fragment>
            <a onClick={() => handleEditHosts(record)}>编辑</a>
            {/* {
              !record.is_push && <Fragment>
                <Divider type="vertical" />
                <a onClick={() => handlePushHosts(record)}>推送</a>
              </Fragment>
            } */}
            <Fragment>
              <Divider type="vertical" />
              <a onClick={() => handleDeleteHosts(record)}>删除</a>
            </Fragment>
          </Fragment>
        }
      }
    ];
    return columns;
  }

  // 编辑
  const handleEditHosts = (record) => {
    props.history.push(`/page/switch-hosts-edit/${record.id}/edit`);
  }

  // 推送
  const handlePushHosts = (record) => {
    API.pushHosts({
      id: record.id
    }).then(res => {
      const { success } = res;
      if (success) {
        getHostsList();
      }
    })
  }

  // 删除
  const handleDeleteHosts = (record) => {
    Modal.confirm({
      title: '删除后群组将无法使用，是否要删除该群组？',
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        API.deleteHosts({
          id: record.id
        }).then(res => {
          const { success } = res;
          if (success) {
            getHostsList();
          }
        })
      }
    })

  }

  // 添加群组
  const handleAddHosts = () => {
    props.history.push('/page/switch-hosts-edit/0/add');
  }

  // 表格分页
  const handleTableChange = (pagination, filters, sorter) => {
    setReqParams({
      ...reqParams,
      current: pagination.current
    })
  }

  // 搜索
  const handleSearchGroup = (value) => {
    setReqParams({
      ...reqParams,
      current: 1,
      searchText: value
    })
  }

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item href="/page/toolbox">应用中心</Breadcrumb.Item>
        <Breadcrumb.Item>Hosts群组管理</Breadcrumb.Item>
      </Breadcrumb>
      <div className="clearfix mt-12 mb-12 title">
        <Search
          placeholder="请输入群组名称搜索"
          style={{ width: 200, height: 32 }}
          className="dt-form-shadow-bg"
          onSearch={handleSearchGroup}
        />
        <Button className="fl-r" type="primary" icon="plus-circle" onClick={handleAddHosts}>新增群组</Button>
      </div>
      <Table
        rowKey="id"
        loading={tableLoading}
        className="dt-table-fixed-base"
        scroll={{ y: true }}
        style={{ height: 'calc(100vh - 64px - 21px - 24px - 32px - 40px)' }}
        dataSource={hostsList.data}
        columns={initColumns()}
        pagination={pagination}
        onChange={handleTableChange}
      />
    </div>
  )
}
export default SwitchHostsList;