/**
 * Knowledge Graph Search Service
 *
 * Traverses the knowledge graph to find related tools and dependencies.
 */
import { readFileSync, existsSync } from "fs";
import { KNOWLEDGE_GRAPH_PATH, DEFAULT_GRAPH_DEPTH } from "../constants.js";
export class GraphSearchService {
    graphPath;
    graph = null;
    constructor(graphPath) {
        this.graphPath = graphPath || KNOWLEDGE_GRAPH_PATH;
        this.loadGraph();
    }
    loadGraph() {
        try {
            if (existsSync(this.graphPath)) {
                const content = readFileSync(this.graphPath, 'utf-8');
                this.graph = JSON.parse(content);
            }
        }
        catch (error) {
            console.error('Failed to load knowledge graph:', error);
            this.graph = null;
        }
    }
    /**
     * Expand a tool to find related dependencies
     */
    async expand(toolName, depth = DEFAULT_GRAPH_DEPTH, relationTypes) {
        if (!this.graph) {
            return [];
        }
        const visited = new Set();
        const results = [];
        this.traverseGraph(toolName, depth, visited, results, relationTypes);
        return results;
    }
    traverseGraph(nodeName, depth, visited, results, relationTypes) {
        if (depth <= 0 || visited.has(nodeName) || !this.graph) {
            return;
        }
        visited.add(nodeName);
        // Find all relations from this node
        const relations = this.graph.relations.filter(r => {
            const matchesFrom = r.from === nodeName;
            const matchesType = !relationTypes || relationTypes.includes(r.type);
            return matchesFrom && matchesType;
        });
        for (const relation of relations) {
            const entity = this.graph.entities.find(e => e.name === relation.to);
            if (entity && !visited.has(entity.name)) {
                // observations에서 description 추출
                const description = entity.observations && entity.observations.length > 0
                    ? entity.observations.join('. ')
                    : entity.description || '';
                results.push({
                    name: entity.name,
                    type: this.mapType(entity.type || entity.entityType || 'Tool'),
                    description: description,
                    metadata: {
                        source: 'knowledge-graph',
                        relationFrom: nodeName,
                        relationType: relation.type
                    }
                });
                // Recursive traversal
                this.traverseGraph(relation.to, depth - 1, visited, results, relationTypes);
            }
        }
    }
    /**
     * Get all entities in the graph
     */
    getAllEntities() {
        return this.graph?.entities || [];
    }
    /**
     * Get relations from a specific entity
     */
    getRelations(entityName) {
        if (!this.graph) {
            return [];
        }
        return this.graph.relations.filter(r => r.from === entityName);
    }
    /**
     * Get a specific entity by name
     */
    getEntity(entityName) {
        if (!this.graph) {
            return undefined;
        }
        return this.graph.entities.find(e => e.name === entityName);
    }
    /**
     * Get all relations in the graph
     */
    getAllRelations() {
        return this.graph?.relations || [];
    }
    /**
     * Find entity by name
     */
    findEntity(name) {
        return this.graph?.entities.find(e => e.name === name);
    }
    mapType(type) {
        const typeMap = {
            'MCP_Server': 'MCP_Server',
            'mcp_server': 'MCP_Server',
            'Skill': 'Skill',
            'skill': 'Skill',
            'Tool': 'Tool',
            'tool': 'Tool',
            'Command': 'Command',
            'command': 'Command'
        };
        return typeMap[type] || 'Tool';
    }
}
//# sourceMappingURL=graph-search.js.map