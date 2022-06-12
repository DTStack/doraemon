import React, { Fragment, useEffect, useState } from 'react';
import moment from 'moment';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Divider, Table, Button, Breadcrumb, Input, Modal, message as Message, TablePaginationConfig } from 'antd';
import AddTagModal from './components/addTagModal'
import DtTag from '@/components/dtTag';
import { API } from '@/api';
import './style.scss';
const { Search } = Input;

const TagsManagement = (props: any) => {
    const [tableLoading, setTableLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [editData, setEditData] = useState(null);
    const [tagList, setTagList] = useState({
        data: [],
        totalElement: 0
    });
    const [reqParams, setReqParams] = useState({
        current: 1,
        size: 20,
        searchText: ''
    })
    const pagination: TablePaginationConfig = {
        size: 'small',
        showSizeChanger: false,
        current: reqParams.current,
        pageSize: reqParams.size,
        total: tagList.totalElement,
        showTotal: (total: any) => <span>共<span style={{ color: '#3F87FF' }}>{tagList.totalElement}</span>条数据，每页显示{reqParams.size}条</span>
    }
    useEffect(() => {
        getTagList();
    }, [reqParams]);

    // 获取列表数据
    const getTagList = () => {
        setTableLoading(true);
        API.getTagList(reqParams).then((res: any) => {
            const { success, data, msg } = res;
            if (success) {
                setTagList({
                    data: data.data || [],
                    totalElement: data.count || 0
                });
            } else {
                Message.error(msg);
            }
        }).finally(() => {
            setTableLoading(false);
        })
    }

    // 初始化表格列
    const initColumns = () => {
        const columns: any = [
            {
                title: '标签名称',
                dataIndex: 'tagName',
                key: 'tagName'
            }, {
                title: '标签标识',
                dataIndex: 'tagColor',
                key: 'tagColor',
                render: (text: any, record: any) => {
                    return <DtTag color={text}>{record.tagName}</DtTag>
                }
            },
            {
                title: '标签描述',
                dataIndex: 'tagDesc',
                key: 'tagDesc'
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
                        <a onClick={() => handleEditTag(record)}>编辑</a>
                        {
                            record.isAdmin ? null : (<Fragment>
                                <Divider type="vertical" />
                                <a onClick={() => handleDeleteTag(record)}>删除</a>
                            </Fragment>)
                        }

                    </Fragment>
                }
            }
        ];
        return columns;
    }

    // 编辑
    const handleEditTag = (record: any) => {
        setVisible(true);
        setEditData(record)
    }

    // 删除
    const handleDeleteTag = (record: any) => {
        Modal.confirm({
            title: '删除后标签将无法使用，是否要删除该标签？',
            okButtonProps: { danger: true },
            okText: '删除',
            cancelText: '取消',
            onOk: () => {
                API.deleteTag({
                    id: record.id
                }).then((res: any) => {
                    const { success } = res;
                    if (success) {
                        Message.success('删除成功！');
                        getTagList();
                    }
                })
            }
        })

    }

    // 添加标签
    const handleAddTag = () => {
        setVisible(true);
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
        });
    }
    const onHandleOkModal = () => {
        setVisible(false);
        setEditData(null);
        getTagList()
    }
    const onHandleCancelModal = () => {
        setVisible(false);
        setEditData(null);
    }
    return (
        <div className="tagsManagement">
            <div className="clearfix mb-12 title">
                <Search
                    placeholder="请输入标签名称搜索"
                    style={{ width: 200, height: 32 }}
                    className="dt-form-shadow-bg"
                    onSearch={handleSearchGroup}
                />
                <Button className="fl-r" type="primary" icon={<PlusCircleOutlined />} onClick={handleAddTag}>新增标签</Button>
            </div>
            <Table
                rowKey="id"
                loading={tableLoading}
                className="dt-table-fixed-base"
                scroll={{ y: 'calc(100vh - 64px - 21px - 24px - 40px - 44px - 67px)' }}
                style={{ height: 'calc(100vh - 64px - 21px - 24px - 40px)' }}
                dataSource={tagList.data}
                columns={initColumns()}
                pagination={pagination}
                onChange={handleTableChange}
            />
            {visible && <AddTagModal visible={visible} data={editData} onOk={onHandleOkModal} onCancel={onHandleCancelModal} />}
        </div>
    );
}
export default TagsManagement;