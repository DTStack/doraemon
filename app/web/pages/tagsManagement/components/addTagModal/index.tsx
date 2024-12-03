import React, { useEffect, useState } from 'react';
import { Form, Input, message as Message, Modal } from 'antd';
import { isFunction } from 'lodash';

import { API } from '@/api';
import ColorPicker from '../colorPicker';
const FormItem = Form.Item;
const { TextArea } = Input;
const AddTagModal = (props: any) => {
    const [form] = Form.useForm();
    const { data, visible, onOk, onCancel } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    useEffect(() => {
        if (visible && data) {
            const { tagName = '', tagDesc = '', tagColor = '' } = data;
            form.setFieldsValue({
                tagName,
                tagDesc,
                tagColor,
            });
        }
    }, [visible]);
    const updataTags = (params: any) => {
        setConfirmLoading(true);
        API[params.id ? 'updateTag' : 'createTag'](params)
            .then((response: any) => {
                const { success } = response;
                if (success) {
                    Message.success(params.id ? '编辑成功' : '新增成功');
                    isFunction(onOk) && onOk();
                    restData();
                }
            })
            .finally(() => {
                setConfirmLoading(false);
            });
    };
    const handleModalOk = () => {
        form.validateFields().then((values: any) => {
            updataTags(
                Object.assign(values, {
                    id: data ? data.id : '',
                })
            );
        });
    };
    const handleModalCancel = () => {
        isFunction(onCancel) && onCancel();
        restData();
    };
    const restData = () => {
        setConfirmLoading(false);
        form.resetFields();
    };
    return (
        <Modal
            title={data ? '编辑标签' : '新增标签'}
            visible={visible}
            maskClosable={false}
            confirmLoading={confirmLoading}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
        >
            <Form
                form={form}
                labelCol={{ span: 5 }}
                wrapperCol={{ span: 17 }}
                initialValues={{ ...data }}
            >
                <FormItem
                    label="标签名称"
                    name="tagName"
                    rules={[{ required: true, message: '请输入标签名称' }]}
                    hasFeedback
                >
                    <Input placeholder="请输入文件名" />
                </FormItem>
                <FormItem label="标签备注" name="tagDesc" hasFeedback>
                    <TextArea placeholder="请输入备注" rows={4} />
                </FormItem>
                <FormItem
                    label="标签标识"
                    name="tagColor"
                    rules={[{ required: true, message: '请选择标签标识' }]}
                >
                    <ColorPicker />
                </FormItem>
            </Form>
        </Modal>
    );
};
export default AddTagModal;
