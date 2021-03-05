import React, { useState } from 'react';
import { Upload, Icon, message } from 'antd';
import Cookies from 'js-cookie';
import defaultLogo from '@/asset/images/default.png'
import './style.scss';

// 读取图片
function getBase64(img: any, callback: any) {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
}

const UploadLogo = (props: any) => {
    const { id, logoUrl } = props.tool;
    const [imageUrl, setImageUrl] = useState(logoUrl ? '/' + logoUrl : undefined);
    const [loading, setLoading] = useState(false);

    // 上传按钮
    const uploadButton = (
        <div>
            <Icon type={loading ? 'loading' : 'plus'} />
            <div className="ant-upload-text">Upload</div>
        </div>
    );

    // 图片预览
    const logoImage = (
        <div className="c-upload-logo__img">
            <img src={imageUrl} alt="avatar" />
        </div>
    );

    // 上传前校验下文件大小
    const beforeUpload = (file: any) => {
        return maxSizeValidator(file);
    }

    // 文件大小校验
    const maxSizeValidator = (file: any) => {
        const maxSize = file.size / 1024 / 1024 < 2;
        if (!maxSize) {
            message.error('图片最大2MB!');
        }
        return maxSize;
    }

    // 上传图片的回调
    const handleChange = (info: any) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        if (info.file.status === 'done') {
            getBase64(info.file.originFileObj, (imageUrl: any) => {
                setLoading(false);
                setImageUrl(imageUrl);
            });
        }
    };
    return (
        <Upload
            name="avatar"
            accept=".png,.jpeg,.jpg,.ico,.gif,.svg"
            listType="picture-card"
            className="avatar-uploader c-upload-logo"
            showUploadList={false}
            action={`/api/appCenters/upload-logo/${id}`}
            headers={{
                'x-csrf-token': Cookies.get('csrfToken')
            }}
            beforeUpload={beforeUpload}
            onChange={handleChange}
        >
            {
                imageUrl
                    ? logoImage
                    : <img src={defaultLogo} alt="default" width={60} />
            }
            <span className="upload-actions"><Icon type="plus" /></span>
        </Upload>
    )
}
export default UploadLogo;
