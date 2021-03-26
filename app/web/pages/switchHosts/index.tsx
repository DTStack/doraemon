import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Divider, Table, Button, Breadcrumb, Input, Typography, Modal, Row, Col, Popconfirm, message } from 'antd';
import { API } from '@/api';
import { useSelector } from 'react-redux';

const { Paragraph } = Typography;
const { Search } = Input;

const SwitchHostsList = (props: any) => {
    const [hostsList, setHostsList] = useState({
        data: [],
        totalElement: 0
    });
    const [reqParams, setReqParams] = useState({
        current: 1,
        size: 20,
        searchText: ''
    })
    const pagination: any = {
        size: 'small',
        showSizeChanger: false,
        current: reqParams.current,
        pageSize: reqParams.size,
        total: hostsList.totalElement,
        showTotal: (total: any) => <span>共<span style={{ color: '#3F87FF' }}>{hostsList.totalElement}</span>条数据，每页显示{reqParams.size}条</span>
    }
    const [tableLoading, setTableLoading] = useState(false);
    const { serverInfo } = useSelector((state: any) => state.global);
    const [modalVisibile, setModalVisibile] = useState(false)
    const [dingTalkList,setDingTalkList] = useState([])
    const [dingHooks, setDingHooks] = useState('')
    const [talkListLoading, setTalkListLoading] = useState(false)
    const [hostId, setHostId] = useState()

    useEffect(() => {
        getHostsList();
    }, [reqParams]);

    // 获取列表数据
    const getHostsList = () => {
        setTableLoading(true);
        API.getHostsList(reqParams).then((res: any) => {
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

    const loadHostsNoticeUrlList = (id) => {
        setTalkListLoading(true)
        API.getConfigNoticeUrlList({id, type: 'switch-hosts'}).then((res)=>{
          const {success,data} = res;
          setTalkListLoading(false)
          if(success){
            setDingTalkList(data)
          }
        })
      }
    
      const handleConfigDingTalk = (id) => {
        setModalVisibile(true)
        setHostId(id)
        loadHostsNoticeUrlList(id)
      }
    
      const delDingTalk = (id) => {
        API.delNoticeUrl({id, type: 'switch-hosts'}).then((res)=>{
          const {success} = res;
          if(success){
            loadHostsNoticeUrlList(hostId)
          }
        })
      }    

    // 初始化表格列
    const initColumns = () => {
        const columns: any = [
            {
                title: '分组名称',
                dataIndex: 'groupName',
                key: 'groupName'
            },
            // {
            //   title: '分组ID',
            //   dataIndex: 'groupId',
            //   key: 'groupId',
            //   render: (text: any) => text || '--'
            // }, 
            {
                title: 'API',
                dataIndex: 'groupApi',
                key: 'groupApi',
                render: (text: any) => <Paragraph copyable>{`${serverInfo.protocol}://${serverInfo.host}${text}`}</Paragraph>
            }, {
                title: '描述',
                dataIndex: 'groupDesc',
                key: 'groupDesc',
                render: (text: any) => text || '--'
            }, {
                title: '创建时间',
                dataIndex: 'created_at',
                key: 'created_at',
                render: (value: any, record: any) => {
                    return moment(value).format('YYYY-MM-DD HH:mm:ss')
                }
            }, {
                title: '更新时间',
                dataIndex: 'updated_at',
                key: 'updated_at',
                render: (value: any, record: any) => {
                    return moment(value).format('YYYY-MM-DD HH:mm:ss')
                }
            }, {
                title: '操作',
                dataIndex: 'actions',
                key: 'actions',
                width: 200,
                render: (text: any, record: any) => {
                    const { id } = record
                    return (
                        <Fragment>
                            <a onClick={() => handleEditHosts(record)}>编辑</a>
                            <Fragment>
                                <Divider type="vertical" />
                                <a onClick={() => handleDeleteHosts(record)}>删除</a>
                            </Fragment>
                            <Divider type="vertical" />
                            <a onClick={() => handleConfigDingTalk(id)}>钉钉webhooks</a>
                        </Fragment>
                    )
                }
            }
        ];
        return columns;
    }

    const dingHooksColumns = [
        {
          title: 'url',
          key: 'url',
          dataIndex: 'url',
          width: '70%'
        },
        {
          title: '操作',
          key: 'operation',
          dataIndex: 'operation',
          width: '30%',
          render: (value, record) => {
            const { id } = record
    
            return (
              <Popconfirm title='确认是否删除？' onConfirm={() => delDingTalk(id)}>
                <a >删除</a>
              </Popconfirm>
          )
          }
        }
      ]    

    // 编辑
    const handleEditHosts = (record: any) => {
        props.history.push(`/page/switch-hosts-edit/${record.id}/edit`);
    }

    // 推送
    const handlePushHosts = (record: any) => {
        API.pushHosts({
            id: record.id
        }).then((res: any) => {
            const { success } = res;
            if (success) {
                getHostsList();
            }
        })
    }

    // 删除
    const handleDeleteHosts = (record: any) => {
        Modal.confirm({
            title: '删除后分组将无法使用，是否要删除该分组？',
            okButtonProps: { danger: true },
            okText: '删除',
            cancelText: '取消',
            onOk: () => {
                API.deleteHosts({
                    id: record.id
                }).then((res: any) => {
                    const { success } = res;
                    if (success) {
                        getHostsList();
                    }
                })
            }
        })

    }

    // 添加分组
    const handleAddHosts = () => {
        props.history.push('/page/switch-hosts-edit/0/add');
    }

    // 表格分页
    const handleTableChange = (pagination: any, filters: any, sorter: any) => {
        setReqParams({
            ...reqParams,
            current: pagination.current
        })
    }

    // 搜索
    const handleSearchGroup = (value: any) => {
        setReqParams({
            ...reqParams,
            current: 1,
            searchText: value
        })
    }

    const addDingHooks = () => {
        if(!dingHooks.includes('https://oapi.dingtalk.com/robot/send?access_token=')){
          message.error('url格式异常')
          return
        }
        if (dingHooks.length > 255) {
          message.error('url长度不能超过255')
          return
        }
        API.addConfigNoticeUrl({id: hostId,url: dingHooks,type: 'switch-hosts'}).then((res)=>{
          const { success } = res;
          if(success){
            setDingHooks('');
            loadHostsNoticeUrlList(hostId)
          }
        })
      }
    
      const handleCloseModal = () => {
        setModalVisibile(false)
        setDingTalkList([])
        setDingHooks('')
      }    

    return (
        <div>
            <Breadcrumb>
                <Breadcrumb.Item href="/page/toolbox">应用中心</Breadcrumb.Item>
                <Breadcrumb.Item>Hosts管理</Breadcrumb.Item>
            </Breadcrumb>
            <div className="clearfix mt-12 mb-12 title">
                <Search
                    placeholder="请输入分组名称搜索"
                    style={{ width: 200, height: 32 }}
                    className="dt-form-shadow-bg"
                    onSearch={handleSearchGroup}
                />
                <Button className="fl-r" type="primary" icon={<PlusCircleOutlined />} onClick={handleAddHosts}>新增分组</Button>
            </div>
            <Table
                rowKey="id"
                loading={tableLoading}
                className="dt-table-fixed-base"
                scroll={{ y: 'calc(100vh - 64px - 77px - 40px - 44px - 67px)' }}
                style={{ height: 'calc(100vh - 64px - 77px - 40px)' }}
                dataSource={hostsList.data}
                columns={initColumns()}
                pagination={pagination}
                onChange={handleTableChange}
            />
            <Modal
                title="钉钉webhooks配置"
                visible={modalVisibile}
                width={650}
                onOk={handleCloseModal}
                onCancel={handleCloseModal}
            >
                <Row align="middle" className="flex">
                    <Col span={5} className="text-right">
                        webhook：
                    </Col>
                    <Col span={16} className="flex">
                        <Input 
                            value={dingHooks}
                            placeholder="请输入webhook" 
                            onChange={({target:{value}}) => setDingHooks(value)}
                        />
                        <Button 
                            type="primary" 
                            className="ml-10"
                            onClick={addDingHooks}
                        >
                            添加
                        </Button>
                    </Col>
                </Row>
                <Row className="mt-12">
                    <Col offset={5} span={16}>
                        <Table
                            rowKey="id"
                            columns={dingHooksColumns}
                            dataSource={dingTalkList}
                            pagination={false}
                            loading={talkListLoading}
                            scroll={{ y: 'calc(100vh - 550px)' }}
                            className="dt-table-border dt-table-last-row-noborder"
                        />
                    </Col>
                </Row>
            </Modal>
        </div>
    );
}
export default SwitchHostsList;