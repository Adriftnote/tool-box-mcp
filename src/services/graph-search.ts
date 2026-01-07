/**
 * Knowledge Graph Search Service
 *
 * Traverses the knowledge graph to find related tools and dependencies.
 */

import { readFileSync, existsSync } from "fs";
import { KNOWLEDGE_GRAPH_PATH, DEFAULT_GRAPH_DEPTH } from "../constants.js";
import { KnowledgeSource, KnowledgeGraph, GraphEntity, GraphRelation } from "./types.js";

export class GraphSearchService {
  private graphPath: string;
  private graph: KnowledgeGraph | null = null;

  constructor(graphPath?: string) {
    this.graphPath = graphPath || KNOWLEDGE_GRAPH_PATH;
    this.loadGraph();
  }

  private loadGraph(): void {
    try {
      if (existsSync(this.graphPath)) {
        const content = readFileSync(this.graphPath, 'utf-8');
        this.graph = JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load knowledge graph:', error);
      this.graph = null;
    }
  }

  /**
   * Expand a tool to find related dependencies
   */
  async expand(
    toolName: string,
    depth: number = DEFAULT_GRAPH_DEPTH,
    relationTypes?: string[]
  ): Promise<KnowledgeSource[]> {
    if (!this.graph) {
      return [];
    }

    const visited = new Set<string>();
    const results: KnowledgeSource[] = [];

    this.traverseGraph(toolName, depth, visited, results, relationTypes);

    return results;
  }

  private traverseGraph(
    nodeName: string,
    depth: number,
    visited: Set<string>,
    results: KnowledgeSource[],
    relationTypes?: string[]
  ): void {
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
  getAllEntities(): GraphEntity[] {
    return this.graph?.entities || [];
  }

  /**
   * Get relations from a specific entity
   */
  getRelations(entityName: string): GraphRelation[] {
    if (!this.graph) {
      return [];
    }
    return this.graph.relations.filter(r => r.from === entityName);
  }

  /**
   * Get a specific entity by name
   */
  getEntity(entityName: string): GraphEntity | undefined {
    if (!this.graph) {
      return undefined;
    }
    return this.graph.entities.find(e => e.name === entityName);
  }

  /**
   * Get all relations in the graph
   */
  getAllRelations(): GraphRelation[] {
    return this.graph?.relations || [];
  }

  /**
   * Find entity by name
   */
  findEntity(name: string): GraphEntity | undefined {
    return this.graph?.entities.find(e => e.name === name);
  }

  private mapType(type: string): 'MCP_Server' | 'Skill' | 'Tool' | 'Command' {
    const typeMap: Record<string, 'MCP_Server' | 'Skill' | 'Tool' | 'Command'> = {
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
