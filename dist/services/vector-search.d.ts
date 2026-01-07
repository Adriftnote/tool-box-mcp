/**
 * Vector Search Service
 *
 * Uses Python wrapper to query ChromaDB for semantic similarity search.
 * ChromaDB JavaScript client doesn't support persistent mode, so we use Python.
 */
import { KnowledgeSource } from "./types.js";
export interface VectorSearchResult {
    name: string;
    type: string;
    description: string;
    similarity: number;
}
export declare class VectorSearchService {
    private pythonPath;
    private scriptPath;
    constructor(pythonPath?: string, scriptPath?: string);
    /**
     * Search for tools using vector similarity
     */
    search(query: string, limit?: number): Promise<KnowledgeSource[]>;
    private mapType;
}
//# sourceMappingURL=vector-search.d.ts.map