import React from 'react';

interface DetailIconProps {
    src: string;
    className?: string;
    alt?: string;
}

export const DetailIcon: React.FC<DetailIconProps> = ({ src, className = '', alt = '' }) => (
    <img
        alt={alt}
        aria-hidden="true"
        className={`skill-detail-icon ${className}`.trim()}
        src={src}
    />
);
