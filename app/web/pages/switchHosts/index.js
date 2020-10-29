import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import { Divider, Table, Button } from 'antd';
import { API } from '@/api';

const SwitchHostsList = (props) => {
    const [hostsList, setHostsList] = useState({
        data: [],
        totalElement: 0
    })
    const [pagination, setPagination] = useState({
        size: 'small',
        current: 1,
        pageSize: 20,
        total: 0,
        hideOnSinglePage: true
    })
    const [tableLoading, setTableLoading] = useState(false);

    useEffect(() => {
        getHostsList();
    }, []);

    // 获取列表数据
    const getHostsList = () => {
        const { current, pageSize } = pagination;
        setTableLoading(true);
        API.getHostsList({
            current,
            size: pageSize
        }).then((res) => {
            const { success, data, msg } = res;
            if (success) {
                setHostsList(data);
                setPagination({
                    ...pagination,
                    total: data.totalElement
                })
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
            }, {
                title: '群组ID',
                dataIndex: 'groupId',
                key: 'groupId'
            }, {
                title: '群组API',
                dataIndex: 'groupApi',
                key: 'groupApi'
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
                        {
                            !record.is_push && <Fragment>
                                <Divider type="vertical" />
                                <a onClick={() => handlePushHosts(record)}>推送</a>
                            </Fragment>
                        }
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
    }

    // 添加群组
    const handleAddHosts = () => {
        props.history.push('/page/switch-hosts-edit/0/add');
    }

    return (
        <div>
            <div style={{ textAlign: 'right' }}>
                <Button type="primary" icon="plus-circle" onClick={handleAddHosts}>新增群组</Button>
            </div>
            <Table
                rowKey="id"
                loading={tableLoading}
                dataSource={hostsList.data}
                columns={initColumns()}
                pagination={pagination}
            />
        </div>
    )
}
export default SwitchHostsList;