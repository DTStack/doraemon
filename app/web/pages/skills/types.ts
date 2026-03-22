export interface SkillItem {
    slug: string;
    installKey: string;
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

export interface SkillFileContent {
    slug: string;
    path: string;
    language: string;
    size: number;
    readonly: boolean;
    isBinary: boolean;
    encoding: 'utf8' | 'base64';
    content: string;
}

export interface SkillInstallMeta {
    slug: string;
    installKey: string;
    name: string;
    downloadUrl: string;
    packageType: string;
    packageVersion: string;
    packageRootMode: string;
    installDirName: string;
    version: string;
    sha256: string;
    sourceRepo: string;
    installable: boolean;
    reason: string;
}
