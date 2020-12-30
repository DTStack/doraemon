import React, { useState } from 'react';
import { Upload, Icon, message } from 'antd';
import Cookies from 'js-cookie';
import './style.scss';

// 读取图片
function getBase64(img, callback) {
  const reader = new FileReader();
  reader.addEventListener('load', () => callback(reader.result));
  reader.readAsDataURL(img);
}

const UploadLogo = (props) => {
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

  // 上传前校验下文件大小，以及文件类型
  const beforeUpload = (file) => {
    return isImageValidator(file) && maxSizeValidator(file);
  }

  // 文件大小校验
  const maxSizeValidator = (file) => {
    const maxSize = file.size / 1024 / 1024 < 2;
    if (!maxSize) {
      message.error('图片最大2MB!');
    }
    return maxSize;
  }

  // 文件格式校验
  const isImageValidator = (file) => {
    const isImage = file.type.indexOf('image/') > -1;
    if (!isImage) {
      message.error('请上传图片');
    }
    return isImage;
  }

  // 上传图片的回调
  const handleChange = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      getBase64(info.file.originFileObj, imageUrl => {
        setLoading(false);
        setImageUrl(imageUrl);
      });
    }
  };
  return (
    <Upload
      name="avatar"
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
          : <img src="/public/img/default.png" alt="default" width={50} />
      }
    </Upload>
  )
}
export default UploadLogo;
