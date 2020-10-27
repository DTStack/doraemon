import React, { Fragment, useEffect, useState } from 'react';
import { Divider, Table } from 'antd';
import { API } from '@/api';
 
const SwitchHostsList = () => {
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

    useEffect(() => {
        getHostsList();
    }, []);

    // 获取列表数据
    const getHostsList = () => {
        API.getHostsList().then((res) => {
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
                dataIndex: 'desc',
                key: 'desc',
                render: text => text || '--'
            }, {
                title: '创建时间',
                dataIndex: 'created_at',
                key: 'created_at'
            }, {
                title: '更新时间',
                dataIndex: 'updated_at',
                key: 'updated_at'
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
    }

    // 推送
    const handlePushHosts = (record) => {
    }

    return (
        <div>
            <Table
                rowKey="id"
                dataSource={hostsList.data}
                columns={initColumns()}
                pagination={pagination}
            />
        </div>
    )
}
export default SwitchHostsList;