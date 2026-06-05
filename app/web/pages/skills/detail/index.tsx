import React from 'react';

import SkillDetailContent from './SkillDetailContent';

const SkillDetailPage: React.FC<any> = ({ history, match }) => {
    const { slug, parentSlug } = match.params;
    return <SkillDetailContent slug={slug} parentSlug={parentSlug} history={history} />;
};

export default SkillDetailPage;
