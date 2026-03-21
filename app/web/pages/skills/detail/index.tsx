import React from 'react';

import SkillDetailContent from './SkillDetailContent';

const SkillDetailPage: React.FC<any> = ({ history, match }) => {
    const { slug } = match.params;
    return <SkillDetailContent slug={slug} mode="page" history={history} />;
};

export default SkillDetailPage;
