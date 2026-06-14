import type { DataNode } from 'antd/lib/tree';

export interface SkillTreeNode extends DataNode {
    children?: SkillTreeNode[];
}

export interface FrontmatterItem {
    key: string;
    value: string;
}

export interface SkillDetailHistory {
    push: (path: string) => void;
}

export const formatFileSize = (size = 0) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const sortTreeNodes = (nodes: SkillTreeNode[]) => {
    nodes.sort((a, b) => {
        const aIsLeaf = Boolean(a.isLeaf);
        const bIsLeaf = Boolean(b.isLeaf);
        if (aIsLeaf !== bIsLeaf) return aIsLeaf ? 1 : -1;
        return String(a.title).localeCompare(String(b.title));
    });

    nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
        }
    });
};

export const buildFileTreeData = (fileList: string[]): SkillTreeNode[] => {
    const treeData: SkillTreeNode[] = [];

    fileList.forEach((filePath) => {
        const segments = filePath.split('/').filter(Boolean);
        let currentNodes = treeData;
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;
            const isLeaf = index === segments.length - 1;
            let node = currentNodes.find((item) => item.key === currentPath);

            if (!node) {
                node = {
                    key: currentPath,
                    title: segment,
                    isLeaf,
                    children: isLeaf ? undefined : [],
                };
                currentNodes.push(node);
            }

            if (!isLeaf) {
                node.children = node.children || [];
                currentNodes = node.children;
            }
        });
    });

    sortTreeNodes(treeData);
    return treeData;
};

export const normalizeSourceUrl = (sourceRepo: string) => {
    if (!sourceRepo) return '';
    const normalized = sourceRepo.replace(/^git\+/, '').trim();
    const sshMatch = normalized.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch) {
        return `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
    if (/^https?:\/\//.test(normalized)) {
        return normalized.replace(/\.git$/, '');
    }
    return '';
};

const normalizeFrontmatterValue = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '-';
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

export const parseMarkdownFrontmatter = (
    markdown = ''
): { frontmatter: FrontmatterItem[]; body: string } => {
    const content = String(markdown || '');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
        return {
            frontmatter: [],
            body: content,
        };
    }

    const block = match[1] || '';
    const lines = block.split(/\r?\n/);
    const frontmatter: FrontmatterItem[] = [];
    let currentKey = '';
    let currentValueLines: string[] = [];

    const pushCurrent = () => {
        if (!currentKey) return;
        frontmatter.push({
            key: currentKey,
            value: normalizeFrontmatterValue(currentValueLines.join('\n')),
        });
    };

    lines.forEach((line) => {
        const keyMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        const isTopLevelKey = Boolean(keyMatch) && !/^\s/.test(line);

        if (isTopLevelKey && keyMatch) {
            pushCurrent();
            currentKey = keyMatch[1];
            currentValueLines = [keyMatch[2] || ''];
            return;
        }

        if (currentKey) {
            currentValueLines.push(line);
        }
    });

    pushCurrent();

    return {
        frontmatter,
        body: content.slice(match[0].length),
    };
};

export const formatDownloadCommand = (downloadUrl = '', fileName = 'skill.zip') => {
    if (!downloadUrl) return '';
    return `curl -L "${downloadUrl}" -o ${fileName}`;
};

export const formatCompactDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};
