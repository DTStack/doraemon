'use strict';

function shouldUseSkillDetailLayout(pathname) {
    const targetPath = String(pathname || '');
    return /^\/page\/skills\/[^/]+$/.test(targetPath);
}

module.exports = {
    shouldUseSkillDetailLayout,
};
