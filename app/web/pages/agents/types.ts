export interface AgentPrompt {
    title: string;
    prompt: string;
}

export interface AgentCapability {
    id: string;
    name: string;
    description: string;
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
    longDescription: string;
    defaultPrompt: AgentPrompt[];
    capabilities: AgentCapability[];
}
