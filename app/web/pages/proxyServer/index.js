import React from 'react';
import { Input, Button, Typography, Tag, Table, message as Message, Divider, Modal, Badge, Popconfirm, Switch, Tooltip } from 'antd';
import { API } from '@/api';
import ProxyServerModal from './components/proxyServerModal';
import ProxyRuleModal from './components/proxyRuleModal';
import Cookies from 'js-cookie';
import { connect } from 'react-redux'
const { Paragraph } = Typography;
import './style.scss';

const confirm = Modal.confirm;
const { Search } = Input;
const { CheckableTag } = Tag;

const commonTags = JSON.parse(Cookies.get('common-tags') || '[]') || [];
class ProxyServer extends React.PureComponent {
  state = {
    //代理服务
    currentProxyServer: {},
    proxyServerModalVisible: false,
    proxyServerModalConfirmLoading: false,
    targetAddrs: [],
    //代理规则
    currentProxyRule: {},
    proxyRuleModalVisible: false,
    proxyRuleModalConfirmLoading: false,
    //主表格
    mainTableLoading: true,
    maintTableList: [],
    maintTableTotal: 10,
    search: '',
    mainTableParams: {
      search: '',
      pageNo: 1,
      pageSize: 20
    },
    expandedRowKeys: [],
    //子表格
    subTableData: [],
    subTableLoading: true,
    commonTagList: commonTags,
    selectedTag: ''
  }
  //获取页面主要数据
  loadMainData() {
    const { mainTableParams } = this.state;
    this.setState({
      mainTableLoading: true
    });
    API.getProxyServerList(mainTableParams).then((response) => {
      const { success, data } = response;
      if (success) {
        this.setState({
          maintTableList: data.data,
          maintTableTotal: data.count,
          mainTableLoading: false
        });
      } else {
        this.setState({
          mainTableLoading: false
        });
      }
    });
  }
  //获取子表格数据
  loadSubTableData(row) {
    const { id } = row;
    this.setState({
      subTableLoading: true
    });
    API.getProxyRuleList({
      proxy_server_id: id
    }).then((response) => {
      const { success, data } = response;
      if (success) {
        this.setState({
          subTableData: data.data,
          subTableLoading: false
        });
      } else {
        this.setState({
          subTableLoading: false
        });
      }
    });
  }
  handleChange(tag) {
    const { selectedTag } = this.state;
    const newTag = tag === selectedTag ? '' : tag
    this.setState({ selectedTag: newTag }, () => {
      this.onSearchProject(newTag)
    });
  }
  /**
   * 代理服务
   */
  //编辑
  handleProxyServerEdit = (row) => {
    const rowData = { ...row };
    // 获取关联的目标服务地址列表数据
    this.getTargetAddrs(
      row.id,
      (data) => {
        rowData.addrs = data.map((item, index) => ({ rowId: index, ...item }));
        this.setState({
          currentProxyServer: rowData,
          proxyServerModalVisible: true
        });
      }
    )
  }
  //删除
  handleProxyServerStatusChange = (row) => {
    const { status, id, name } = row;
    const statusStr = status === 1 ? '禁用' : '开启';
    confirm({
      title: '确认',
      content: `确认是否${statusStr}服务「${name}」`,
      onOk: () => {
        API.changeProxyServerStatus({
          status: status === 1 ? 0 : 1,
          id
        }).then((response) => {
          const { success } = response;
          if (success) {
            Message.success(`代理服务${statusStr}成功`);
            this.loadMainData();
          }
        });
      }
    })
  }
  handleProxyServerModalOk = (proxyServer) => {
    const { currentProxyServer, expandedRowKeys } = this.state;
    const { name, target, addrs } = proxyServer;
    this.setState({
      proxyServerModalConfirmLoading: true
    });
    API[proxyServer.id ? 'updateProxyServer' : 'addProxyServer']({
      proxyServer: proxyServer.id ? proxyServer : { name, target },
      targetAddrs: addrs
    }).then((response) => {
      const { success, message } = response;
      if (success) {
        Message.success(`${JSON.stringify(currentProxyServer) === '{}' ? '新增' : '编辑'}代理服务成功`)
        this.handleProxyServerModalCancel();
        this.loadMainData();
        if (expandedRowKeys.length) {
          this.getTargetAddrs(
            expandedRowKeys[0],
            (data) => {
              this.setState({ targetAddrs: data || [] })
            }
          );
        }
      } else {
        this.setState({
          proxyServerModalConfirmLoading: false
        });
      }
    });
  }
  handleProxyServerModalCancel = () => {
    this.ProxyServerModal.resetFields();
    this.setState({
      currentProxyServer: {},
      proxyServerModalConfirmLoading: false,
      proxyServerModalVisible: false
    });
  }
  handleProxyServerDelete = (row) => {
    const { id, name } = row;
    confirm({
      title: '确认',
      content: `确认是否删除服务「${name}」`,
      onOk: () => {
        API.deleteProxyServer({
          id
        }).then((response) => {
          const { success } = response;
          if (success) {
            Message.success('代理服务删除成功');
            this.loadMainData();
          }
        });
      }
    })
  }
  /**
   * 代理规则
   */
  handleProxyRuleEdit = (row) => {
    const { expandedRowKeys } = this.state;
    this.getTargetAddrs(
      expandedRowKeys[0],
      (data) => {
        this.setState({
          targetAddrs: data || [],
          currentProxyRule: row,
          proxyRuleModalVisible: true
        })
      }
    );
  }
  handleProxyRuleDelete = (row, mainTableRow) => {
    const { name } = mainTableRow;
    const { ip } = row;
    API.deleteProxyRule({
      id: row.id
    }).then((response) => {
      const { success } = response;
      if (success) {
        Message.success(`代理服务「${name}」下的代理规则「${ip}」删除成功`);
        this.loadSubTableData(mainTableRow);
      }
    });
  }
  handleProxyRuleModalOk = (proxyRule) => {
    let apiFunName, actionType;
    const { maintTableList, expandedRowKeys } = this.state;
    const currentProxyServer = maintTableList.find((row) => row.id === expandedRowKeys[0]);
    proxyRule['proxy_server_id'] = currentProxyServer.id;
    this.setState({
      proxyRuleModalConfirmLoading: true
    });
    if (proxyRule.id) {
      apiFunName = 'updateProxyRule';
      actionType = '编辑';
    } else {
      apiFunName = 'addProxyRule';
      actionType = '新增';
    }
    API[apiFunName](proxyRule).then((response) => {
      const { success } = response;
      if (success) {
        Message.success(`${actionType}代理规则成功`);
        this.loadSubTableData(currentProxyServer);
        this.handleProxyRuleModalCancel();
      } else {
        this.setState({
          proxyRuleModalConfirmLoading: false
        });
      }
    });
  }
  onHandleUpdateProxyRule = (record) => {
    const { ip, target, id } = record;
    const { localIp } = this.props;
    const { maintTableList, expandedRowKeys } = this.state;
    const currentProxyServer = maintTableList.find((row) => row.id === expandedRowKeys[0]);
    const urlReg = new RegExp(/(http|ftp|https):\/\/([\w\-_]+\.[\w\-_]+[\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/, 'i');
    let regResult = urlReg.exec(target);
    let tagetIp = target;
    if (regResult) {
      let tagetArrIPs = regResult[2].split(':') || [];
      tagetIp = tagetArrIPs[0] != ip ? target : `${regResult[1]}://${localIp}:${tagetArrIPs[1] || '8080'}`
    }
    API.updateProxyRule({
      id,
      ip: ip != localIp ? localIp : ip,
      target: tagetIp
    }).then((response) => {
      const { success, message } = response;
      if (success) {
        Message.success('更新代理规则成功');
        this.loadSubTableData(currentProxyServer);
        this.handleProxyRuleModalCancel();
      } else {
        Message.error(message);
        this.setState({
          proxyRuleModalConfirmLoading: false
        });
      }
    });
  }
  handleProxyRuleModalCancel = () => {
    this.ProxyRuleModal.resetFields();
    this.setState({
      currentProxyRule: {},
      proxyRuleModalConfirmLoading: false,
      proxyRuleModalVisible: false
    });
  }
  onChangeSearch = (e) => {
    const value = e.target.value;
    this.setState({
      search: value
    })
  }
  onSearchProject = (value) => {
    const { mainTableParams, selectedTag, search } = this.state;
    this.setState({
      mainTableParams: Object.assign({}, mainTableParams, {
        pageNo: 1,
        search: value
      }),
      selectedTag: search ? [] : selectedTag
    }, () => {
      this.loadMainData();
    });
  }
  handleTableChange = (pagination) => {
    const { current, pageSize } = pagination;
    const { mainTableParams } = this.state;
    this.setState({
      mainTableParams: Object.assign({}, mainTableParams, {
        pageNo: current,
        pageSize
      })
    }, () => {
      this.loadMainData();
    });
  }
  handleTableExpandChange = (expanded, record) => {
    if (expanded) {
      this.setState({
        expandedRowKeys: [record.id]
      });
      this.loadSubTableData(record);
    } else {
      this.setState({
        expandedRowKeys: []
      });
    }
  }
  handleChangeStatus = (check, record) => {
    const { maintTableList, expandedRowKeys } = this.state;
    const currentProxyServer = maintTableList.find((row) => row.id === expandedRowKeys[0]);
    const { id } = record;
    API.updateProxyRuleStatus({
      id,
      status: check ? 1 : 0
    }).then(res => {
      if (res.success) {
        Message.success(check ? '启用代理' : '禁用代理');
        this.loadSubTableData(currentProxyServer);
      }
    })
  }
  setCommonTag = (row, isCommon) => {
    const { name } = row;
    const { commonTagList } = this.state;
    let newList = [];
    if (isCommon) {
      newList = commonTagList.filter(item => item != name);
    } else {
      newList = Array.from(new Set([name, ...commonTagList])).splice(0, 4);
    }
    this.setState({
      commonTagList: newList
    });
    Cookies.set('common-tags', JSON.stringify(newList));
  };
  tableExpandedRowRender = (mainTableRow) => {
    const { subTableLoading, subTableData } = this.state;
    const columns = [{
      title: '序号',
      key: 'index',
      render: (value, row, index) => index + 1
    }, {
      title: 'IP',
      key: 'ip',
      dataIndex: 'ip',
      width: 200
    }, {
      title: '目标代理服务地址',
      key: 'target',
      dataIndex: 'target',
      width: '20%'
    }, {
      title: '备注',
      key: 'remark',
      width: '20%',
      dataIndex: 'remark'
    }, {
      title: '状态',
      key: 'status',
      width: 160,
      dataIndex: 'status',
      render: (text, record) => {
        return <Switch defaultChecked={!!text} checkedChildren="开" unCheckedChildren="关" onChange={(e) => this.handleChangeStatus(e, record)} />
      }
    }, {
      title: '操作',
      key: 'action',
      width: 160,
      render: (value, row, index) => {
        return (<React.Fragment>
          <Tooltip placement="topLeft" title={
            <div>
              <div>快速更新代理规则：</div>
              <div>1、根据IP及目标IP判断是否为同类型代理服务;</div>
              <div>2、当ip与本地ip不一致时，更新IP为本机ip；</div>
              <div>3、根据是否为同类型，决定是否更新目标代理服务</div>
            </div>
          }>
            <a onClick={() => this.onHandleUpdateProxyRule(row)}>更新</a>
          </Tooltip>
          <Divider type="vertical" />
          <a onClick={this.handleProxyRuleEdit.bind(this, row)}>编辑</a>
          <Divider type="vertical" />
          <Popconfirm placement="right" title="确认是否删除该代理规则" onConfirm={this.handleProxyRuleDelete.bind(this, row, mainTableRow)}>
            <a>删除</a>
          </Popconfirm>
        </React.Fragment>)
      }
    }]
    return <div style={{ padding: '0 10px' }}>
      <div className="text-right marginBottom12"><Button icon="plus" size="small" type="primary" onClick={this.handleAddRule}>添加规则</Button></div>
      <Table
        size="small"
        rowKey={(row) => row.id}
        loading={subTableLoading}
        columns={columns}
        dataSource={subTableData}
        pagination={false} />
    </div>
  }

  // 添加规则
  handleAddRule = () => {
    const { expandedRowKeys } = this.state;
    this.getTargetAddrs(
      expandedRowKeys[0],
      (data) => {
        this.setState({
          targetAddrs: data || [],
          proxyRuleModalVisible: true
        })
      }
    );
  }

  // 获取已有目标服务列表
  getTargetAddrs = (id, callback) => {
    API.getTargetAddrs({ id }).then((response) => {
      const { success, data, message } = response;
      if (!success) {
        Message.error(message);
      }
      callback && callback(data);
    })
  }

  componentDidMount() {
    this.loadMainData();
  }
  render() {
    const {
      maintTableList,
      mainTableParams,
      maintTableTotal,
      mainTableLoading,
      expandedRowKeys,
      currentProxyServer,
      proxyServerModalVisible,
      proxyServerModalConfirmLoading,
      currentProxyRule,
      proxyRuleModalVisible,
      proxyRuleModalConfirmLoading,
      commonTagList,
      selectedTag,
      search
    } = this.state;
    const columns = [{
      title: '序号',
      key: 'index',
      render: (value, row, index) => index + 1,
      width: 80
    }, {
      title: '项目名称',
      key: 'name',
      dataIndex: 'name',
      width: 200
    }, {
      title: '代理服务地址',
      key: 'proxy_server_address',
      dataIndex: 'proxy_server_address',
      render: (value) => <Paragraph copyable>{value}</Paragraph>
    }, {
      title: '默认代理目标',
      key: 'target',
      dataIndex: 'target',
      render: (value, record) => (
        <span>
          {value}
          {record.api_doc_url && <a href={record.api_doc_url} rel="noopener noreferrer" target='_blank'>&nbsp;[接口文档]</a>}
        </span>
      )
    }, {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      width: 140,
      render: (value, row) => {
        return <React.Fragment><Badge status={Boolean(value) ? 'success' : 'error'} text={Boolean(value) ? '已开启' : '已禁用'} /></React.Fragment>
      }
    }, {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (value, row) => {
        const { status, name } = row;
        const isCommon = commonTagList.includes(name);
        return (<React.Fragment>
          <a onClick={this.handleProxyServerEdit.bind(this, row)}>编辑</a>
          <Divider type="vertical" />
          <a onClick={this.handleProxyServerDelete.bind(this, row)}>删除</a>
          {/* <Divider type="vertical" />
          <a onClick={this.handleProxyServerStatusChange.bind(this, row)}>{Boolean(status) ? '禁用' : '重启'}</a> */}
          <Divider type="vertical" />
          <Tooltip placement="topLeft" title={
            <div>
              <div>设置为常用项目</div>
              <div>最多可设置4个常用项目</div>
            </div>
          }>
            <a onClick={() => this.setCommonTag(row, isCommon)}>{isCommon ? '取消收藏' : '收藏'}</a>
          </Tooltip>
        </React.Fragment>)
      }
    }];

    return (<div className="page-proxy-server">
      <div className="title_wrap">
        <div>
          <Search
            placeholder="请输入项目名称搜索"
            value={search}
            onChange={this.onChangeSearch}
            onSearch={this.onSearchProject}
            className="search dt-form-shadow-bg" />
          {
            commonTagList.length ? (<span style={{ marginRight: 8, marginLeft: 20 }}>常用项目:</span>) : null
          }
          {commonTagList.map(tag => (
            <CheckableTag
              key={tag}
              checked={tag == selectedTag}
              onChange={checked => this.handleChange(tag, checked)}
            >
              {tag}
            </CheckableTag>
          ))}
        </div>
        <Button type="primary" icon="plus" onClick={() => { this.setState({ proxyServerModalVisible: true }) }}>添加服务</Button>
      </div>
      <Table
        rowKey={(row) => row.id}
        loading={mainTableLoading}
        columns={columns}
        scroll={{ y: true }}
        style={{ height: 'calc(100vh - 64px - 40px - 44px)' }}
        dataSource={maintTableList}
        className="dt-table-fixed-base"
        expandedRowKeys={expandedRowKeys}
        expandedRowRender={this.tableExpandedRowRender}
        onExpand={this.handleTableExpandChange}
        onChange={this.handleTableChange}
        pagination={{
          size: 'small',
          total: maintTableTotal,
          current: mainTableParams.pageNo,
          pageSize: mainTableParams.pageSize,
          showTotal: (total) => <span>共<span style={{ color: '#3F87FF' }}>{total}</span>条数据，每页显示{mainTableParams.pageSize}条</span>
        }} />

      {proxyServerModalVisible && <ProxyServerModal
        ref={(modal) => this.ProxyServerModal = modal}
        editable={JSON.stringify(currentProxyServer) !== '{}'}
        proxyServer={currentProxyServer}
        confirmLoading={proxyServerModalConfirmLoading}
        visible={proxyServerModalVisible}
        onOk={this.handleProxyServerModalOk}
        onCancel={this.handleProxyServerModalCancel} />}
      <ProxyRuleModal
        ref={(modal) => this.ProxyRuleModal = modal}
        editable={JSON.stringify(currentProxyRule) !== '{}'}
        proxyServer={currentProxyRule}
        targetAddrs={this.state.targetAddrs}
        confirmLoading={proxyRuleModalConfirmLoading}
        visible={proxyRuleModalVisible}
        onOk={this.handleProxyRuleModalOk}
        onCancel={this.handleProxyRuleModalCancel} />
    </div>)
  }
}
function mapStateToProps(state) {
  return {
    localIp: state.global.localIp
  }
}
export default connect(mapStateToProps)(ProxyServer)