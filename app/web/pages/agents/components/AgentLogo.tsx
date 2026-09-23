import React, { useEffect, useState } from 'react';
import { Popover } from 'antd';
import type { TooltipPlacement } from 'antd/lib/tooltip';

import defaultAgentLogo from '../../../asset/images/default_agent.jpg';
import './AgentLogo.scss';

export interface AgentLogoProps {
    src?: string;
    alt?: string;
    className?: string;
    previewPlacement?: TooltipPlacement;
    previewSize?: number;
    preview?: boolean;
}

// 支持 hover 悬停放大预览的 Agent Logo 组件
export const AgentLogo: React.FC<AgentLogoProps> = ({
    src,
    alt = '',
    className = '',
    previewPlacement = 'rightTop',
    previewSize = 360,
    preview = true,
}) => {
    const [imgSrc, setImgSrc] = useState<string>(src || defaultAgentLogo);

    useEffect(() => {
        setImgSrc(src || defaultAgentLogo);
    }, [src]);

    // 图片加载失败时回退到默认 Agent Logo 头像
    const handleError = () => {
        setImgSrc(defaultAgentLogo);
    };

    const logoNode = (
        <img
            className={`agent-logo-interactive ${className}`.trim()}
            src={imgSrc}
            alt={alt}
            onError={handleError}
        />
    );

    if (!preview) {
        return logoNode;
    }

    const previewContent = (
        <div className="agent-logo-preview-card" onClick={(e) => e.stopPropagation()}>
            <img
                className="agent-logo-preview-img"
                src={imgSrc}
                alt={alt}
                style={{ width: previewSize, height: previewSize }}
                onError={handleError}
            />
            {alt ? <div className="agent-logo-preview-title">{alt}</div> : null}
        </div>
    );

    return (
        <Popover
            content={previewContent}
            placement={previewPlacement}
            trigger="hover"
            mouseEnterDelay={0.15}
            mouseLeaveDelay={0.1}
            overlayClassName="agent-logo-preview-popover"
            destroyTooltipOnHide
        >
            {logoNode}
        </Popover>
    );
};
