import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Divider, Table, Button, Breadcrumb, Input, Typography, Modal, message } from 'antd';
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
                width: 160,
                render: (text: any, record: any) => {
                    return <Fragment>
                        <a onClick={() => handleEditHosts(record)}>编辑</a>
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
            okType: 'danger',
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
        </div>
    );
}
export default SwitchHostsList;