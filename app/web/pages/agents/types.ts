export interface AgentPrompt {
    title: string;
    prompt: string;
}

export interface AgentCapability {
    id: string;
    name: string;
    description: string;
}

export interface AgentDemoImage {
    path: string;
    url: string;
    alt: string;
    mimeType: string;
    size: number;
    hash: string;
    sortOrder: number;
}

export interface AgentSkillRelation {
    slug: string;
    name: string;
    description?: string;
    collected: boolean;
    builtin?: boolean;
    path?: string;
}

export interface AgentItem {
    name: string;
    displayName: string;
    description: string;
    authorName: string;
    category: string;
    tags: string[];
    version: string;
    updatedAt: string;
    dependencyCount: number;
    logoUrl: string;
}

export interface AgentListResponse {
    list: AgentItem[];
    total: number;
    pageNum: number;
    pageSize: number;
    categories: string[];
}

export interface AgentDetail extends AgentItem {
    profile: string;
    prompts: AgentPrompt[];
    capabilities: AgentCapability[];
    demoImages: AgentDemoImage[];
    entrypoint: AgentSkillRelation | null;
    dependencies: AgentSkillRelation[];
    privateSkills: AgentSkillRelation[];
}
