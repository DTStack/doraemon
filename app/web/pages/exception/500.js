
import React from 'react';
import {Link} from 'react-router-dom';
import Exception from '@/components/exception';

export default () => (
  <Exception
    type="500"
    desc="抱歉，页面出错了"
    linkElement={Link}
    backText="返回首页"
  />
);;