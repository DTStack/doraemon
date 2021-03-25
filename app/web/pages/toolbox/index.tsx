import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Card, Input, Select, Modal, Spin, Empty, message } from 'antd';
import { API } from '@/api';
import { Link } from 'react-router-dom';
import CreateApp from './components/CreateApp';
import ToolBoxCard from './components/toolboxCard';
import emptyImg from '@/asset/images/empty.png';
import './style.scss';
const { Search } = Input;
const { Option } = Select;

const Toolbox = () => {
    const [tagList, setTagList] = useState([]);
    const [reqParams, setReqParams] = useState({
        appName: '',
        appTags: []
    });
    const [toolList, setToolList] = useState([]);
    const [appInfo, setAppInfo] = useState({});
    const [loading, setLoading] = useState(true);
    const [visible, setVisbile] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const loadMainData = () => {
        setLoading(true);
        API.getAppCentersList(reqParams).then((response: any) => {
            setLoading(false);
            const { success, data } = response;
            if (success) {
                setToolList(data.data);
            }
        });
    }

    // 获取标签列表
    const getTagList = () => {
        API.getTagList({
            current: 1,
            size: 10000,
            searchText: ''
        }).then((res: any) => {
            const { success, data, msg } = res;
            if (success) {
                setTagList(data.data || []);
            } else {
                message.error(msg);
            }
        })
    }

    useEffect(() => {
        getTagList();
    }, []);

    useEffect(() => {
        loadMainData();
    }, [reqParams]);

    // 输入应用名称搜索
    const handleNameSearch = (appName: any) => {
        setReqParams({
            ...reqParams,
            appName
        })
    }

    // 标签筛选
    const handleTagSearch = (appTags: any) => {
        setReqParams({
            ...reqParams,
            appTags
        })
    }

    // 添加 | 编辑
    const updateApplication = (params: any) => {
        const { appName, appUrl, appDesc, appTags, id } = params
        setConfirmLoading(true)
        API.updateApplication({
            appName,
            appUrl,
            appDesc,
            appTags,
            id
        }).then((response: any) => {
            const { success } = response
            if (success) {
                setConfirmLoading(false)
                onHandleAddApp()
                setAppInfo({})
                loadMainData()
            }
        });
    }

    const deleteApplication = (id: any) => {
        Modal.confirm({
            title: '确认将该应用移除？',
            okButtonProps: { danger: true },
            okText: '删除',
            cancelText: '取消',
            onOk: () => {
                API.deleteApplication({ id }).then((response: any) => {
                    const { success } = response;
                    if (success) {
                        loadMainData()
                    }
                })
            }
        })
    }

    const onHandleAddApp = () => {
        setVisbile(!visible)
        setAppInfo({})
    }

    // 获取appInfo
    const onHandleEditApp = (id: any) => {
        API.getApplicationById({ id }).then((response: any) => {
            const { success, data } = response
            if (success) {
                setAppInfo(data)
            }
            setVisbile(!visible)
        });
    }

    const onHandleClickApp = (params: any) => {
        API.clickApplication({ params });
        // 页面上显示的点击量也触发更改
        const newToolList: any = [...toolList];
        const toolIdx = newToolList.findIndex((item: any) => item.id === params.id);
        const tool: any = {
            ...params,
            clickCount: params.clickCount + 1
        };
        newToolList.splice(toolIdx, 1, tool);
        setToolList(newToolList);
    }

    const handleEdit = (tool: any) => {
        onHandleEditApp(tool.id);
        onHandleClickApp(tool);
    }

    const renderCard = (list: any) => list.map((tool: any, index: any) => {
        const { id, appName, appUrl, appType } = tool;
        const componentContent = (
            <ToolBoxCard
                tool={tool}
                onEdit={handleEdit}
                onDelete={deleteApplication}
            />
        )
        return (
            <Col className="navigation-item-wrapper" key={id || appName} span={6}>
                <Card bordered={false} onClick={() => onHandleClickApp(tool)}>
                    {
                        appType
                            ? (
                                <a
                                    href={appUrl}
                                    rel="noopener noreferrer"
                                    target='_blank'
                                    className="navigation-item"
                                >
                                    {componentContent}
                                </a>
                            )
                            : (
                                <Link
                                    to={appUrl}
                                    className="navigation-item"
                                >
                                    {componentContent}
                                </Link>
                            )
                    }
                </Card>
            </Col>
        )
    })
    return (
        <div className="page-toolbox">
            <div className="toolbox-header mb-12">
                <div className="toolbox-title">应用中心</div>
                <div>
                    <Search
                        className="dt-form-shadow-bg"
                        style={{ width: 220 }}
                        placeholder="请输入应用名称搜索"
                        onSearch={handleNameSearch}
                    />
                    <span className="ml-20">
                        选择标签：
                        <Select
                            className="dt-form-shadow-bg"
                            style={{ width: 220 }}
                            placeholder="请选择标签"
                            mode="multiple"
                            onChange={handleTagSearch}
                        >
                            {tagList.map((item: any) => <Option key={item.id} value={item.id}>{item.tagName}</Option>)}
                        </Select>
                    </span>
                    <Button className="ml-20" type="primary" onClick={onHandleAddApp}>添加应用</Button>
                </div>
            </div>
            <Spin wrapperClassName="tool-list__ant-spin" spinning={loading}>
                {
                    Array(toolList) && toolList.length
                        ? (
                            <Row className="tool-list" gutter={20}>
                                {
                                    renderCard(toolList)
                                }
                            </Row>
                        ) : <Empty className="tool-empty" image={emptyImg} imageStyle={{ height: 200 }} description="无符合条件的应用" />
                }

            </Spin>
            {visible && <CreateApp
                visible={visible}
                appInfo={appInfo}
                tagList={tagList}
                confirmLoading={confirmLoading}
                onOk={updateApplication}
                onCancel={onHandleAddApp}
            />}
        </div>
    )
}
export default Toolbox;
