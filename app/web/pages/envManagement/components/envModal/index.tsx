import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Form, Input, message as Message, Modal, Select, Spin } from 'antd';
import { isEmpty, isFunction, isNull } from 'lodash';

import { API } from '@/api';
const FormItem = Form.Item;
const { TextArea } = Input;
const { Option } = Select;

const EnvForm = (props: any) => {
    const { value, tagList = [], forwardRef } = props;
    const { envName, hostIp, url, remark, tags = [] } = value;
    const tagIds = tags.map((item: any) => Number(item.id));
    return (
        <Form
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 17 }}
            ref={forwardRef}
            initialValues={{
                envName,
                hostIp,
                url,
                tagIds,
                remark,
            }}
        >
            <FormItem
                label="环境名称"
                name="envName"
                rules={[{ required: true, message: '请输入环境名称' }]}
                hasFeedback
            >
                <Input placeholder="请输入环境名称" />
            </FormItem>
            <FormItem
                label="主机IP"
                name="hostIp"
                rules={[{ required: true, message: '请输入主机IP' }]}
                hasFeedback
            >
                <Input placeholder="请输入主机IP" />
            </FormItem>
            <Fragment>
                <FormItem
                    label="访问地址"
                    name="url"
                    rules={[{ required: true, message: '请输入访问地址' }]}
                    hasFeedback
                >
                    <TextArea placeholder="请输入访问地址" rows={2} maxLength={2000} />
                </FormItem>
            </Fragment>
            <FormItem
                label="标签"
                name="tagIds"
                rules={[
                    {
                        type: 'array',
                        required: true,
                        message: '请选择标签',
                    },
                ]}
                hasFeedback
            >
                <Select mode="multiple" placeholder="请选择标签">
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

const EnvFormRef = React.forwardRef((props: any, ref: any) => {
    return <EnvForm {...props} forwardRef={ref} />;
});

const EnvModal = (props: any) => {
    const { value, visible, onOk, onCancel, tagList } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    const envFormRef: any = useRef(null);
    const isAdd = isEmpty(value);
    const { id, envName } = value;
    const handleModalOk = () => {
        if (!isNull(envFormRef.current)) {
            envFormRef.current.validateFields().then((values: any) => {
                setConfirmLoading(true);
                API[isAdd ? 'addEnv' : 'editEnv']({
                    id: isAdd ? undefined : id,
                    ...values,
                }).then((response: any) => {
                    setConfirmLoading(false);
                    const { success } = response;
                    if (success) {
                        Message.success(isAdd ? '环境新增成功' : `环境「${envName}」编辑成功`);
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
            title={isAdd ? '新增环境' : '编辑环境'}
            visible={visible}
            maskClosable={false}
            confirmLoading={confirmLoading}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
        >
            <Spin spinning={confirmLoading}>
                {visible && <EnvFormRef tagList={tagList} value={value} ref={envFormRef} />}
            </Spin>
        </Modal>
    );
};
export default EnvModal;
