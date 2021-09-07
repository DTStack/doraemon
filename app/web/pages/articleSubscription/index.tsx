import React, { Fragment, useEffect, useState } from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import SubscriptionModal from './components/subscriptionModal';
import { Divider, Table, Button, Breadcrumb, Input, Modal, Switch, message as Message } from 'antd';
import { API } from '@/api';

const { Search } = Input;

const ArticleSubscriptionList = (props: any) => {
    const [subscriptionList, setSubscriptionList] = useState({
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
        total: subscriptionList.totalElement,
        showTotal: (total: any) => <span>共<span style={{ color: '#3F87FF' }}>{subscriptionList.totalElement}</span>条数据，每页显示{reqParams.size}条</span>
    }
    const [tableLoading, setTableLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [editData, setEditData] = useState(null);
    const [topicList, setTopicList] = useState([]);

    useEffect(() => {
        getSubscriptionList();
    }, [reqParams]);

    useEffect(() => {
        getTopicList();
    }, []);

    // 初始化表格列
    const initColumns = () => {
        const columns: any = [
            {
                title: '钉钉群名称',
                dataIndex: 'groupName',
                key: 'groupName'
            },
            {
                title: '订阅项',
                dataIndex: 'topicList',
                key: 'topicList',
                render: (text: any) => text.join('、') || '-'
            },
            {
                title: '备注',
                dataIndex: 'remark',
                key: 'remark',
                render: (text: any) => text || '-'
            },
            {
                title: '推送时间',
                dataIndex: 'sendTime',
                key: 'sendTime'
            },
            {
                title: '状态',
                key: 'status',
                dataIndex: 'status',
                render: (text: any, record: any) => {
                    return <Switch defaultChecked={!!text} checkedChildren="开" unCheckedChildren="关" onChange={(e: any) => handleChangeStatus(e, record)} />
                }
            },
            {
                title: '操作',
                dataIndex: 'actions',
                key: 'actions',
                width: 200,
                render: (text: any, record: any) => {
                    const { id } = record
                    return (
                        <Fragment>
                            <a onClick={() => handleEdit(record)}>编辑</a>
                            <Fragment>
                                <Divider type="vertical" />
                                <a onClick={() => handleDelete(record)}>删除</a>
                            </Fragment>
                        </Fragment>
                    )
                }
            }
        ];
        return columns;
    }

    // 获取订阅项列表
    const getTopicList = () => {
        API.getTopicList().then(({ success, data, msg }) => {
            success ? setTopicList(data) : Message.error(msg)
        })
    }

    // 获取列表
    const getSubscriptionList = () => {
        setTableLoading(true);
        API.getSubscriptionList(reqParams).then(({ success, data, msg }) => {
            if (success) {
                setSubscriptionList({
                    data: data.data || [],
                    totalElement: data.count || 0
                });
            } else {
                Message.error(msg);
            }
            setTableLoading(false);
        })
    }

    // 改变订阅状态
    const handleChangeStatus = (check: any, record: any) => {
        console.log(222, check, record)
        // const { maintTableList, expandedRowKeys } = this.state;
        // const currentProxyServer = maintTableList.find((row: any) => row.id === expandedRowKeys[0]);
        // const { id } = record;
        // API.updateProxyRuleStatus({
        //     id,
        //     status: check ? 1 : 0
        // }).then((res: any) => {
        //     if (res.success) {
        //         Message.success(check ? '启用代理' : '禁用代理');
        //         this.loadSubTableData(currentProxyServer);
        //     }
        // })
    }

    // 编辑
    const handleEdit = (record: any) => {
        console.log(111, record)
    }

    // 删除
    const handleDelete = (record: any) => {
        console.log(333, record)
        const { id, status } = record
        if (status === 2) return Message.warning('请先将订阅关闭！')
        Modal.confirm({
            title: '删除后将不再给该钉钉群推送该订阅，是否要删除？',
            okButtonProps: { danger: true },
            okText: '删除',
            cancelText: '取消',
            onOk: () => {
                API.deleteSubscription({ id }).then(({ success }) => {
                    success && getSubscriptionList()
                })
            }
        })

    }

    // 新增
    const handleAdd = () => {
        setVisible(true)
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

    const onHandleOkModal = () => {
        setVisible(false)
        setEditData(null)
        getSubscriptionList()
    }

    const onHandleCancelModal = () => {
        setVisible(false)
        setEditData(null)
    }

    return (
        <div>
            <Breadcrumb>
                <Breadcrumb.Item href="/page/toolbox">应用中心</Breadcrumb.Item>
                <Breadcrumb.Item>订阅管理</Breadcrumb.Item>
            </Breadcrumb>
            <div className="clearfix mt-12 mb-12 title">
                <Search
                    placeholder="请输入钉钉群名称搜索"
                    style={{ width: 200, height: 32 }}
                    className="dt-form-shadow-bg"
                    onSearch={handleSearchGroup}
                />
                <Button className="fl-r" type="primary" icon={<PlusCircleOutlined />} onClick={handleAdd}>新增订阅</Button>
            </div>
            <Table
                rowKey="id"
                loading={tableLoading}
                className="dt-table-fixed-base"
                scroll={{ y: 'calc(100vh - 64px - 77px - 40px - 44px - 67px)' }}
                style={{ height: 'calc(100vh - 64px - 77px - 40px)' }}
                dataSource={subscriptionList.data}
                columns={initColumns()}
                pagination={pagination}
                onChange={handleTableChange}
            />

            <SubscriptionModal
                visible={visible}
                data={editData}
                topicList={topicList}
                onOk={onHandleOkModal}
                onCancel={onHandleCancelModal}
            />
        </div>
    );
}
export default ArticleSubscriptionList;
