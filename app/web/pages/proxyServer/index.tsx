import * as React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Input, Button, Typography, Tag, Table, message as Message, Divider, Modal, Badge, Popconfirm, Switch, Tooltip, notification } from 'antd';
import { API } from '@/api';
import ProxyServerModal from './components/proxyServerModal';
import ProxyRuleModal from './components/proxyRuleModal';
import Cookies from 'js-cookie';
import { connect } from 'react-redux'
const { Paragraph } = Typography;
import helpIcon from '../../asset/images/help-icon.png';
import './style.scss';

const confirm = Modal.confirm;
const { Search } = Input;
const { CheckableTag } = Tag;

const commonTags = JSON.parse(Cookies.get('common-tags') || '[]') || [];
class ProxyServer extends React.PureComponent<any, any> {
    state: any = {
        //代理服务
        localIp: '',
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
    ProxyServerModal: any
    ProxyRuleModal: any
    componentDidMount() {
        this.loadMainData();
    }
    //获取页面主要数据
    loadMainData = () => {
        this.getProxyServerList()
        this.getLocalIp()
    }
    getLocalIp = () => {
        API.getLocalIp().then((response: any) => {
            const { success, data, message } = response;
            if (success) {
                const localIp = data.localIp;
                const rememberIp = Cookies.get('rememberIp') || ''
                if (rememberIp && rememberIp !== localIp) {
                    notification.warning({
                        message: 'IP地址变更',
                        description: '您的IP地址【较上次登录时】已发生变更、请留意代理服务配置！',
                        duration: 30,
                        onClose: () => {
                            Cookies.set('rememberIp', localIp)
                        }
                    });
                }

                this.setState({
                    localIp
                })
            }
        })
    }
    getProxyServerList = () => {
        const { mainTableParams } = this.state;
        this.setState({
            mainTableLoading: true
        });
        API.getProxyServerList(mainTableParams).then((response: any) => {
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
    loadSubTableData(row: any) {
        const { id } = row;
        this.setState({
            subTableLoading: true
        });
        API.getProxyRuleList({
            proxy_server_id: id
        }).then((response: any) => {
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
    handleChange(tag: any, checked: any) {
        const { selectedTag } = this.state;
        const newTag = tag === selectedTag ? '' : tag
        this.setState({ selectedTag: newTag }, () => {
            this.onSearchProject(newTag)
        });
    }
    // 点击帮助文档
    handleHelpIcon() {
        window.open('https://dtstack.github.io/doraemon/docsify/#/zh-cn/guide/%E4%BB%A3%E7%90%86%E6%9C%8D%E5%8A%A1')
    }
    /**
     * 代理服务
     */
    //编辑
    handleProxyServerEdit = (row: any) => {
        const rowData: any = { ...row };
        // 获取关联的目标服务地址列表数据
        this.getTargetAddrs(
            row.id,
            (data: any) => {
                rowData.addrs = data.map((item: any, index: any) => ({ rowId: index, ...item }));
                this.setState({
                    currentProxyServer: rowData,
                    proxyServerModalVisible: true
                });
            }
        )
    }
    //删除
    handleProxyServerStatusChange = (row: any) => {
        const { status, id, name } = row;
        const statusStr = status === 1 ? '禁用' : '开启';
        confirm({
            title: '确认',
            content: `确认是否${statusStr}服务「${name}」`,
            onOk: () => {
                API.changeProxyServerStatus({
                    status: status === 1 ? 0 : 1,
                    id
                }).then((response: any) => {
                    const { success } = response;
                    if (success) {
                        Message.success(`代理服务${statusStr}成功`);
                        this.getProxyServerList();
                    }
                });
            }
        })
    }
    handleProxyServerModalOk = (proxyServer: any) => {
        const { currentProxyServer, expandedRowKeys } = this.state;
        const { addrs, ...rest } = proxyServer;
        this.setState({
            proxyServerModalConfirmLoading: true
        });
        API[proxyServer.id ? 'updateProxyServer' : 'addProxyServer']({
            proxyServer: proxyServer.id ? proxyServer : rest,
            targetAddrs: addrs
        }).then((response: any) => {
            const { success, message } = response;
            if (success) {
                Message.success(`${JSON.stringify(currentProxyServer) === '{}' ? '新增' : '编辑'}代理服务成功`)
                this.handleProxyServerModalCancel();
                this.getProxyServerList();
                if (expandedRowKeys.length) {
                    this.getTargetAddrs(
                        expandedRowKeys[0],
                        (data: any) => {
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
        this.ProxyServerModal.formRef.resetFields();
        this.setState({
            currentProxyServer: {},
            proxyServerModalConfirmLoading: false,
            proxyServerModalVisible: false
        });
    }
    handleProxyServerDelete = (row: any) => {
        const { id, name } = row;
        confirm({
            title: '确认',
            content: `确认是否删除服务「${name}」`,
            onOk: () => {
                API.deleteProxyServer({
                    id
                }).then((response: any) => {
                    const { success } = response;
                    if (success) {
                        Message.success('代理服务删除成功');
                        this.getProxyServerList();
                    }
                });
            }
        })
    }
    /**
     * 代理规则
     */
    handleProxyRuleEdit = (row: any) => {
        const { expandedRowKeys } = this.state;
        this.getTargetAddrs(
            expandedRowKeys[0],
            (data: any) => {
                this.setState({
                    targetAddrs: data || [],
                    currentProxyRule: row,
                    proxyRuleModalVisible: true
                })
            }
        );
    }
    handleProxyRuleDelete = (row: any, mainTableRow: any) => {
        const { name } = mainTableRow;
        const { ip } = row;
        API.deleteProxyRule({
            id: row.id
        }).then((response: any) => {
            const { success } = response;
            if (success) {
                Message.success(`代理服务「${name}」下的代理规则「${ip}」删除成功`);
                this.loadSubTableData(mainTableRow);
            }
        });
    }
    handleProxyRuleModalOk = (proxyRule: any) => {
        let apiFunName, actionType: any;
        const { maintTableList, expandedRowKeys } = this.state;
        const currentProxyServer = maintTableList.find((row: any) => row.id === expandedRowKeys[0]);
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
        API[apiFunName](proxyRule).then((response: any) => {
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
    onHandleUpdateProxyRule = (record: any) => {
        const { ip, target, id } = record;
        const { localIp } = this.props;
        const { maintTableList, expandedRowKeys } = this.state;
        const currentProxyServer = maintTableList.find((row: any) => row.id === expandedRowKeys[0]);
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
        }).then((response: any) => {
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
        this.ProxyRuleModal.formRef.resetFields();
        this.setState({
            currentProxyRule: {},
            proxyRuleModalConfirmLoading: false,
            proxyRuleModalVisible: false
        });
    }
    onChangeSearch = (e: any) => {
        const value = e.target.value;
        this.setState({
            search: value
        })
    }
    onSearchProject = (value: any) => {
        const { mainTableParams, selectedTag, search } = this.state;
        this.setState({
            mainTableParams: Object.assign({}, mainTableParams, {
                pageNo: 1,
                search: value
            }),
            selectedTag: search ? [] : selectedTag
        }, () => {
            this.getProxyServerList();
        });
    }
    handleTableChange = (pagination: any) => {
        const { current, pageSize } = pagination;
        const { mainTableParams } = this.state;
        this.setState({
            mainTableParams: Object.assign({}, mainTableParams, {
                pageNo: current,
                pageSize
            })
        }, () => {
            this.getProxyServerList();
        });
    }
    handleTableExpandChange = (expanded: any, record: any) => {
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
    handleChangeStatus = (check: any, record: any) => {
        const { maintTableList, expandedRowKeys } = this.state;
        const currentProxyServer = maintTableList.find((row: any) => row.id === expandedRowKeys[0]);
        const { id } = record;
        API.updateProxyRuleStatus({
            id,
            status: check ? 1 : 0
        }).then((res: any) => {
            if (res.success) {
                Message.success(check ? '启用代理' : '禁用代理');
                this.loadSubTableData(currentProxyServer);
            }
        })
    }
    setCommonTag = (row: any, isCommon: any) => {
        const { name } = row;
        const { commonTagList } = this.state;
        let newList: any = [];
        if (isCommon) {
            newList = commonTagList.filter((item: any) => item != name);
        } else {
            newList = Array.from(new Set([name, ...commonTagList])).splice(0, 4);
        }
        this.setState({
            commonTagList: newList
        });
        Cookies.set('common-tags', JSON.stringify(newList));
    };
    tableExpandedRowRender = (mainTableRow: any) => {
        const { subTableLoading, subTableData, localIp } = this.state;
        const columns: any = [{
            title: '序号',
            key: 'index',
            width: 100,
            render: (value: any, row: any, index: any) => index + 1
        }, {
            title: 'IP',
            key: 'ip',
            dataIndex: 'ip',
            width: '15%',
            render: (text: any) => {
                return text === localIp ? <Tooltip placement="topLeft" title={`当前用户 IP:${localIp}`}>
                    <span className="ip-wrap"><i className="iconfont iconicon_star" />{text}</span>
                </Tooltip> : text
            }
        }, {
            title: '目标代理服务地址',
            key: 'target',
            dataIndex: 'target',
            width: '25%'
        }, {
            title: '备注',
            key: 'remark',
            dataIndex: 'remark',
            width: '20%'
        }, {
            title: '状态',
            key: 'status',
            width: 160,
            dataIndex: 'status',
            render: (text: any, record: any) => {
                return <Switch defaultChecked={!!text} checkedChildren="开" unCheckedChildren="关" onChange={(e: any) => this.handleChangeStatus(e, record)} />
            }
        }, {
            title: '操作',
            key: 'action',
            width: 160,
            render: (value: any, row: any, index: any) => {
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
        return (
            <div style={{ padding: '0 10px' }}>
                <div className="text-right marginBottom12"><Button icon={<PlusOutlined />} size="small" type="primary" onClick={this.handleAddRule}>添加规则</Button></div>
                <Table
                    size="small"
                    rowKey={(row: any) => row.id}
                    loading={subTableLoading}
                    columns={columns}
                    dataSource={subTableData}
                    pagination={false} />
            </div>
        );
    }

    // 添加规则
    handleAddRule = () => {
        const { expandedRowKeys } = this.state;
        this.getTargetAddrs(
            expandedRowKeys[0],
            (data: any) => {
                this.setState({
                    targetAddrs: data || [],
                    proxyRuleModalVisible: true
                })
            }
        );
    }

    // 获取已有目标服务列表
    getTargetAddrs = (id: any, callback: any) => {
        API.getTargetAddrs({ id }).then((response: any) => {
            const { success, data, message } = response;
            if (!success) {
                Message.error(message);
            }
            callback && callback(data);
        })
    }
    render() {
        const {
            localIp,
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
        const columns: any = [{
            title: '序号',
            key: 'index',
            render: (value: any, row: any, index: any) => index + 1,
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
            render: (value: any) => <Paragraph copyable>{value}</Paragraph>
        }, {
            title: '默认代理目标',
            key: 'target',
            dataIndex: 'target',
            render: (value: any, record: any) => (
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
            render: (value: any, row: any) => {
                return <React.Fragment><Badge status={Boolean(value) ? 'success' : 'error'} text={Boolean(value) ? '已开启' : '已禁用'} /></React.Fragment>
            }
        }, {
            title: '操作',
            key: 'actions',
            width: 200,
            render: (value: any, row: any) => {
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

        return (
            <div className="page-proxy-server">
                <div className="title_wrap">
                    <div>
                        <Search
                            placeholder="请输入项目名称搜索"
                            value={search}
                            onChange={this.onChangeSearch}
                            onSearch={this.onSearchProject}
                            className="search dt-form-shadow-bg" />
                        {
                            commonTagList.length ? (<span style={{ marginRight: 8, marginLeft: 20, lineHeight: '32px' }}>常用项目:</span>) : null
                        }
                        {commonTagList.map((tag: any) => (
                            <CheckableTag
                                key={tag}
                                checked={tag == selectedTag}
                                onChange={(checked: any) => this.handleChange(tag, checked)}
                            >
                                {tag}
                            </CheckableTag>
                        ))}
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { this.setState({ proxyServerModalVisible: true }) }}>添加服务</Button>
                </div>
                
                <img className="help-icon" src={helpIcon} onClick={this.handleHelpIcon} alt="帮助文档" />

                <Table
                    rowKey={(row: any) => row.id}
                    loading={mainTableLoading}
                    columns={columns}
                    scroll={{ y: 'calc(100vh - 64px - 40px - 44px - 44px - 67px)' }}
                    style={{ height: 'calc(100vh - 64px - 40px - 44px)' }}
                    dataSource={maintTableList}
                    className="dt-table-fixed-base"
                    expandedRowKeys={expandedRowKeys}
                    expandedRowRender={this.tableExpandedRowRender}
                    onExpand={this.handleTableExpandChange}
                    onChange={this.handleTableChange}
                    pagination={{
                        size: 'small',
                        showSizeChanger: false,
                        total: maintTableTotal,
                        current: mainTableParams.pageNo,
                        pageSize: mainTableParams.pageSize,
                        showTotal: (total: any) => <span>共<span style={{ color: '#3F87FF' }}>{total}</span>条数据，每页显示{mainTableParams.pageSize}条</span>
                    }} />

                {proxyServerModalVisible && <ProxyServerModal
                    ref={(modal: any) => this.ProxyServerModal = modal}
                    editable={JSON.stringify(currentProxyServer) !== '{}'}
                    proxyServer={currentProxyServer}
                    confirmLoading={proxyServerModalConfirmLoading}
                    visible={proxyServerModalVisible}
                    onOk={this.handleProxyServerModalOk}
                    onCancel={this.handleProxyServerModalCancel} />}
                {proxyRuleModalVisible && <ProxyRuleModal
                    ref={(modal: any) => this.ProxyRuleModal = modal}
                    localIp={localIp}
                    editable={JSON.stringify(currentProxyRule) !== '{}'}
                    proxyServer={currentProxyRule}
                    targetAddrs={this.state.targetAddrs}
                    confirmLoading={proxyRuleModalConfirmLoading}
                    visible={proxyRuleModalVisible}
                    onOk={this.handleProxyRuleModalOk}
                    onCancel={this.handleProxyRuleModalCancel} />}
            </div>
        );
    }
}
function mapStateToProps(state: any) {
    return {
        localIp: state.global.localIp
    }
}
export default connect(mapStateToProps)(ProxyServer)
