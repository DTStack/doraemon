import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Table, Popconfirm, Divider, Typography, Button, message as Message, Input } from 'antd';
import { API } from '@/api';
import EnvModal from './components/envModal';
import DtTag from '@/components/dtTag';
import './style.scss';
const { Search } = Input;
const { Paragraph } = Typography;

export default (props: any) => {
    const [searchStr, setSearchStr] = useState('');
    const [tableLoading, setTableLoading] = useState(false);
    const [envList, setEnvList] = useState([]);
    const [envModalVisible, setEnvModalVisible] = useState(false);
    const [currentEnv, setCurrentEnv] = useState({});
    const [tagList, setTagList] = useState([])

    useEffect(() => {
        const searchStr = new URLSearchParams(props?.location?.search).get('envName');

        if (searchStr) {
            setSearchStr(searchStr)
            loadTableData({ search: searchStr })
        } else {
            loadTableData()
        }
    }, []);

    useEffect(() => {
        getTagList()
    }, [])

    const getTagList = () => {
        API.getAllTagList().then((response: any) => {
            const { success, data } = response;
            if (success) {
                setTagList(data.data)
            }
        })
    }

    const handleOpenUrl = (url) => {
        window.open(url);
    }

    const getColumns = () => {
        const columns: any = [{
            title: '环境名称',
            key: 'envName',
            width: 220,
            dataIndex: 'envName'
        }, {
            title: '主机IP',
            key: 'hostIp',
            width: 160,
            dataIndex: 'hostIp'
        }, {
            title: '访问地址',
            key: 'url',
            dataIndex: 'url',
            ellipsis: true,
            render: (value: any) => {
                return <Paragraph copyable onClick={handleOpenUrl.bind(this, value)} ellipsis style={{ color: '#3F87FF', cursor: 'pointer' }}>{value}</Paragraph>
            }
        }, {
            title: '标签',
            key: 'tags',
            dataIndex: 'tags',
            width: 160,
            filterMultiple: true,
            filters: tagList.map((item: any) => {
                return {
                    text: item.tagName,
                    value: item.id
                }
            }),
            render: (value: any) => {
                return value.map((item: any) => <DtTag key={item.id} color={item.tagColor}>{item.tagName}</DtTag>)
            }
        }, {
            title: '备注',
            key: 'remark',
            dataIndex: 'remark',
            ellipsis: true,
            render: (text) => <pre className='remark-content'>{text||'--'}</pre>
        }, {
            title: '操作',
            key: 'operation',
            width: 200,
            render: (value: any, row: any) => {
                return <span>
                    <a onClick={handleTableRowEdit.bind(this, row)}>编辑</a>
                    <Divider type="vertical" />
                    <Popconfirm title={`确认是否删除该环境「${row.envName}」?`} onConfirm={handleTableRowDelete.bind(this, row)}>
                        <a>删除</a>
                    </Popconfirm>
                </span>
            }
        }];
        return columns;
    }

    const handleEnvModalAction = (type: any) => {
        if (type === 'ok') {
            loadTableData();
        }
        setEnvModalVisible(false);
    }
    //新增环境
    const handleEnvAdd = () => {
        setCurrentEnv({});
        setEnvModalVisible(true);
        loadTableData();
    }
    //编辑环境
    const handleTableRowEdit = (row: any) => {
        setCurrentEnv(row);
        setEnvModalVisible(true);
        loadTableData();
    }
    //删除环境
    const handleTableRowDelete = (row: any) => {
        const { id } = row;
        API.deleteEnv({
            id
        }).then((response: any) => {
            const { success } = response;
            if (success) {
                Message.success('环境删除成功');
                loadTableData();
            }
        });
    }
    const loadTableData = (params = {}) => {
        setTableLoading(true);
        API.getEnvList(params).then((response: any) => {
            const { success, data } = response;
            if (success) {
                setEnvList(data);
            }
        }).finally(() => {
            setTableLoading(false);
        });
    }
    const onTableChange = (pagination: any, filters: any, sorter: any) => {
        loadTableData(filters)
    }

    return (
        <div className="page-env-management">
            <div className="title_wrap">
                <Search
                    placeholder="请输入环境名称或IP搜索"
                    value={searchStr}
                    onChange={(e) => setSearchStr(e.target.value)}
                    onSearch={() => loadTableData({ search: searchStr })}
                    className="dt-form-shadow-bg"
                    style={{ width: 220 }}
                />
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={handleEnvAdd}>新增环境</Button>
            </div>
            <Table
                rowKey="id"
                columns={getColumns()}
                className="dt-table-fixed-base"
                scroll={{ y: 'calc(100vh - 64px - 40px - 44px - 44px)' }}
                style={{ height: 'calc(100vh - 64px - 40px - 44px)' }}
                loading={tableLoading}
                dataSource={envList}
                pagination={false}
                onChange={onTableChange}
            />
            {envModalVisible && <EnvModal
                tagList={tagList}
                value={currentEnv}
                visible={envModalVisible}
                onOk={handleEnvModalAction.bind(this, 'ok')}
                onCancel={handleEnvModalAction.bind(this, 'cancel')} />}
        </div>
    );
}
