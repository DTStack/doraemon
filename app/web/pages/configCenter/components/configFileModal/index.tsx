import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, message as Message, Modal, Select, Spin } from 'antd';
import { isEmpty, isFunction, isNull } from 'lodash';

import { API } from '@/api';
const FormItem = Form.Item;
const { TextArea } = Input;
const { Option } = Select;

const ConfigForm = (props) => {
    const [hostList, setHostList] = useState([]);
    const { value, tagList, forwardRef }: any = props;
    const { filename, hostId, filePath, remark, tags = {} } = value;
    const { id = '' }: any = tags;
    const loadHostsData = () => {
        API.getHostList().then((response: any) => {
            const { success, data } = response;
            if (success) {
                setHostList(data);
            }
        });
    };
    useEffect(() => {
        loadHostsData();
    }, []);
    return (
        <Form
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 17 }}
            ref={forwardRef}
            initialValues={{
                hostId,
                filename,
                filePath,
                tagIds: id || undefined,
                remark,
            }}
        >
            <FormItem
                label="主机"
                name="hostId"
                rules={[
                    {
                        required: true,
                        message: '请选择主机',
                    },
                ]}
                hasFeedback
            >
                <Select placeholder="请选择主机">
                    {hostList.map((host) => {
                        const { id, hostIp, hostName } = host;
                        return <Option key={id} value={id}>{`${hostIp}-${hostName}`}</Option>;
                    })}
                </Select>
            </FormItem>
            <FormItem
                label="文件名"
                name="filename"
                rules={[
                    {
                        required: true,
                        message: '请输入文件名',
                    },
                ]}
                hasFeedback
            >
                <Input placeholder="请输入文件名" />
            </FormItem>
            <FormItem
                label="文件路径"
                name="filePath"
                rules={[
                    {
                        required: true,
                        message: '请输入文件路径',
                    },
                ]}
                hasFeedback
            >
                <Input placeholder="请输入文件路径" />
            </FormItem>
            <FormItem
                label="标签"
                name="tagIds"
                rules={[
                    {
                        required: true,
                        message: '请选择标签',
                    },
                ]}
                hasFeedback
            >
                <Select placeholder="请选择标签">
                    {tagList.map((item: any) => (
                        <Option key={item.id} value={item.id}>
                            {item.tagName}
                        </Option>
                    ))}
                </Select>
            </FormItem>
            <FormItem label="备注" name="remark" hasFeedback>
                <TextArea placeholder="请输入备注" rows={4} />
            </FormItem>
        </Form>
    );
};

const ConfigFormRef = React.forwardRef((props: any, ref: any) => {
    return <ConfigForm {...props} forwardRef={ref} />;
});

const ConfigModal = (props: any) => {
    const { value, visible, onOk, onCancel, tagList } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    const configFormRef: any = useRef(null);
    const isAdd = isEmpty(value);
    const { id, filename } = value;
    const handleModalOk = () => {
        if (!isNull(configFormRef.current)) {
            configFormRef.current.validateFields().then((values: any) => {
                setConfirmLoading(true);
                API[isAdd ? 'addConfig' : 'editConfig']({
                    id: isAdd ? undefined : id,
                    ...values,
                }).then((response: any) => {
                    setConfirmLoading(false);
                    const { success } = response;
                    if (success) {
                        Message.success(isAdd ? '配置新增成功' : `配置「${filename}」编辑成功`);
                        isFunction(onOk) && onOk(values);
                    }
                });
            });
        }
    };
    const handleModalCancel = () => {
        isFunction(onCancel) && onCancel();
    };
    useEffect(() => {
        if (!visible) {
            setConfirmLoading(false);
        }
    }, [props.visible]);
    return (
        <Modal
            title={isAdd ? '新增配置' : '编辑配置'}
            visible={visible}
            confirmLoading={confirmLoading}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
        >
            <Spin spinning={confirmLoading}>
                {visible && <ConfigFormRef tagList={tagList} value={value} ref={configFormRef} />}
            </Spin>
        </Modal>
    );
};
export default ConfigModal;
