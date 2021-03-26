import React, { useState, useEffect } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tabs, Row, Col, Tooltip } from 'antd';
import Loading from '@/components/loading';
import { API } from '@/api';
import { colorList } from '@/constant';
import './style.scss';

const TabPane = Tabs.TabPane;
const InnerUrlNavigation = () => {
    const [navigationData, setNavigationData] = useState([]);
    const [activePaneKey, setActivePaneKey] = useState('0');
    const [loading, setLoading] = useState(true);
    const loadMainData = () => {
        setLoading(true);
        API.getConfigJsonInGithub({
            name: 'internal-url-navigation.json'
        }).then((response: any) => {
            const { success, data } = response;
            if (success) {
                setNavigationData(data)
            }
            setLoading(false);
        });
    }
    const handleTabChange = (key: any) => {
        setActivePaneKey(key);
    }
    useEffect(() => {
        loadMainData();
    }, []);
    return (
        <Loading loading={loading}>
            <div className="page-internal-url-navigation">
                <Tabs activeKey={activePaneKey} onChange={handleTabChange}>
                    {
                        navigationData.map((group: any, index: any) => {
                            const { groupName, children } = group;
                            return (
                                <TabPane className="tab-pane" tab={groupName} key={index}>
                                    <Row gutter={10}>
                                        {
                                            children.map((child: any, index: any) => {
                                                const { name, url, desc, remark } = child;
                                                return (
                                                    <Col className="navigation-item-wrapper" key={name} span={6}>
                                                        <a href={url} target="_blank" className="navigation-item" style={{ background: colorList[index % colorList.length] }}>
                                                            {remark && <Tooltip title={remark}>
                                                                <QuestionCircleOutlined className="icon" />
                                                            </Tooltip>}
                                                            <div className="title">{name}</div>
                                                            <div className="desc">{desc}</div>
                                                        </a>
                                                    </Col>
                                                );
                                            })
                                        }
                                    </Row>
                                </TabPane>
                            );
                        })
                    }
                </Tabs>
            </div>
        </Loading>
    );
}

export default InnerUrlNavigation;