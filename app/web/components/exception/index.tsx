import React, { createElement } from 'react';
import { Button } from 'antd';
import classNames from 'classnames';

import config from './typeConfig';
import './style.scss';

class Exception extends React.PureComponent<any, any> {
    static defaultProps = {
        backText: '返回首页',
        redirect: '/',
    };

    constructor(props: any) {
        super(props);
        this.state = {};
    }

    render() {
        const {
            className,
            backText,
            linkElement = 'a',
            type,
            title,
            desc,
            img,
            actions,
            redirect,
            ...rest
        } = this.props;
        const pageType = type in config ? type : '404';
        const clsString = classNames('comp-exception', className);
        return (
            <div className={clsString} {...rest}>
                <div className="imgBlock">
                    <div
                        className="imgEle"
                        style={{ backgroundImage: `url(${img || config[pageType].img})` }}
                    />
                </div>
                <div className="help-content">
                    <h1>{title || config[pageType].title}</h1>
                    <div className="desc">{desc || config[pageType].desc}</div>
                    <div className="actions">
                        {actions ||
                            createElement(
                                linkElement,
                                {
                                    to: redirect,
                                    href: redirect,
                                },
                                <Button type="primary">{backText}</Button>
                            )}
                    </div>
                </div>
            </div>
        );
    }
}

export default Exception;
