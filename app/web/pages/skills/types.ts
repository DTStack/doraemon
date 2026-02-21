export interface SkillItem {
    slug: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    allowedTools: string[];
    stars: number;
    updatedAt: string;
    sourceRepo: string;
    sourcePath: string;
    installCommand: string;
}

export interface SkillListResponse {
    list: SkillItem[];
    total: number;
    pageNum: number;
    pageSize: number;
    categories: string[];
}

export interface SkillDetail extends SkillItem {
    fileList: string[];
    skillMd: string;
}
