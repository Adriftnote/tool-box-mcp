/**
 * Zod schemas for tool input validation
 */
import { z } from "zod";
export declare enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}
export declare enum ToolType {
    MCP_SERVER = "MCP_Server",
    SKILL = "Skill",
    TOOL = "Tool",
    COMMAND = "Command"
}
/**
 * Empty schema for tools with no parameters
 */
export declare const EmptyInputSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
/**
 * Schema for search_tools
 */
export declare const SearchToolsInputSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    include_graph: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    query: string;
    limit: number;
    include_graph: boolean;
    response_format: ResponseFormat;
}, {
    query: string;
    limit?: number | undefined;
    include_graph?: boolean | undefined;
    response_format?: ResponseFormat | undefined;
}>;
export type SearchToolsInput = z.infer<typeof SearchToolsInputSchema>;
/**
 * Schema for expand_graph
 */
export declare const ExpandGraphInputSchema: z.ZodObject<{
    tool_name: z.ZodString;
    depth: z.ZodDefault<z.ZodNumber>;
    relation_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    tool_name: string;
    depth: number;
    relation_types?: string[] | undefined;
}, {
    tool_name: string;
    response_format?: ResponseFormat | undefined;
    depth?: number | undefined;
    relation_types?: string[] | undefined;
}>;
export type ExpandGraphInput = z.infer<typeof ExpandGraphInputSchema>;
/**
 * Schema for get_tool_cluster
 */
export declare const GetToolClusterInputSchema: z.ZodObject<{
    query: z.ZodString;
    include_context: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    query: string;
    response_format: ResponseFormat;
    include_context: boolean;
}, {
    query: string;
    response_format?: ResponseFormat | undefined;
    include_context?: boolean | undefined;
}>;
export type GetToolClusterInput = z.infer<typeof GetToolClusterInputSchema>;
/**
 * Schema for register_tool
 */
export declare const RegisterToolInputSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["MCP_Server", "Skill", "Tool", "Command"]>>;
    description: z.ZodString;
    mcpCli: z.ZodOptional<z.ZodObject<{
        quickStart: z.ZodString;
        examples: z.ZodArray<z.ZodString, "many">;
        tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            params: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }, {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        quickStart: string;
        examples: string[];
        tools?: {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }[] | undefined;
    }, {
        quickStart: string;
        examples: string[];
        tools?: {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }[] | undefined;
    }>>;
    skillMeta: z.ZodOptional<z.ZodObject<{
        summary: z.ZodString;
        when: z.ZodString;
        tokenSize: z.ZodOptional<z.ZodNumber>;
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        relatedTo: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        when: string;
        tokenSize?: number | undefined;
        keywords?: string[] | undefined;
        relatedTo?: string[] | undefined;
    }, {
        summary: string;
        when: string;
        tokenSize?: number | undefined;
        keywords?: string[] | undefined;
        relatedTo?: string[] | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    type: "MCP_Server" | "Skill" | "Tool" | "Command";
    name: string;
    description: string;
    mcpCli?: {
        quickStart: string;
        examples: string[];
        tools?: {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }[] | undefined;
    } | undefined;
    skillMeta?: {
        summary: string;
        when: string;
        tokenSize?: number | undefined;
        keywords?: string[] | undefined;
        relatedTo?: string[] | undefined;
    } | undefined;
}, {
    name: string;
    description: string;
    type?: "MCP_Server" | "Skill" | "Tool" | "Command" | undefined;
    mcpCli?: {
        quickStart: string;
        examples: string[];
        tools?: {
            name: string;
            params?: string[] | undefined;
            description?: string | undefined;
        }[] | undefined;
    } | undefined;
    skillMeta?: {
        summary: string;
        when: string;
        tokenSize?: number | undefined;
        keywords?: string[] | undefined;
        relatedTo?: string[] | undefined;
    } | undefined;
}>;
export type RegisterToolInput = z.infer<typeof RegisterToolInputSchema>;
/**
 * Schema for delete_tool
 */
export declare const DeleteToolInputSchema: z.ZodObject<{
    tool_id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    tool_id: string;
}, {
    tool_id: string;
}>;
export type DeleteToolInput = z.infer<typeof DeleteToolInputSchema>;
/**
 * Schema for list_tools
 */
export declare const ListToolsInputSchema: z.ZodObject<{
    type_filter: z.ZodDefault<z.ZodEnum<["MCP_Server", "Skill", "Tool", "Command", "all"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    limit: number;
    type_filter: "MCP_Server" | "Skill" | "Tool" | "Command" | "all";
    offset: number;
}, {
    limit?: number | undefined;
    type_filter?: "MCP_Server" | "Skill" | "Tool" | "Command" | "all" | undefined;
    offset?: number | undefined;
}>;
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;
/**
 * Schema for ChainStep (individual chain step)
 */
export declare const ChainStepSchema: z.ZodObject<{
    toolName: z.ZodString;
    toolArgs: z.ZodEffects<z.ZodString, string, string>;
    inputPath: z.ZodOptional<z.ZodString>;
    outputPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    toolName: string;
    toolArgs: string;
    inputPath?: string | undefined;
    outputPath?: string | undefined;
}, {
    toolName: string;
    toolArgs: string;
    inputPath?: string | undefined;
    outputPath?: string | undefined;
}>;
/**
 * Schema for execute_chain
 */
export declare const ExecuteChainInputSchema: z.ZodEffects<z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    mcpPath: z.ZodOptional<z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        toolArgs: z.ZodEffects<z.ZodString, string, string>;
        inputPath: z.ZodOptional<z.ZodString>;
        outputPath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }>, "many">>;
    autoChain: z.ZodDefault<z.ZodBoolean>;
    trace: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    autoChain: boolean;
    trace: boolean;
    query?: string | undefined;
    mcpPath?: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[] | undefined;
}, {
    query?: string | undefined;
    mcpPath?: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[] | undefined;
    autoChain?: boolean | undefined;
    trace?: boolean | undefined;
}>, {
    autoChain: boolean;
    trace: boolean;
    query?: string | undefined;
    mcpPath?: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[] | undefined;
}, {
    query?: string | undefined;
    mcpPath?: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[] | undefined;
    autoChain?: boolean | undefined;
    trace?: boolean | undefined;
}>;
export type ExecuteChainInput = z.infer<typeof ExecuteChainInputSchema>;
/**
 * Schema for prepare_chain - analyze chain and provide skill context
 */
export declare const PrepareChainInputSchema: z.ZodObject<{
    mcpPath: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        toolArgs: z.ZodEffects<z.ZodString, string, string>;
        inputPath: z.ZodOptional<z.ZodString>;
        outputPath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }>, "many">;
    include_skills: z.ZodDefault<z.ZodBoolean>;
    include_schemas: z.ZodDefault<z.ZodBoolean>;
    include_transforms: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    mcpPath: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[];
    include_skills: boolean;
    include_schemas: boolean;
    include_transforms: boolean;
}, {
    mcpPath: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
    }[];
    include_skills?: boolean | undefined;
    include_schemas?: boolean | undefined;
    include_transforms?: boolean | undefined;
}>;
export type PrepareChainInput = z.infer<typeof PrepareChainInputSchema>;
/**
 * Schema for toolhub_chain (was inline in index.ts)
 */
export declare const ToolhubChainInputSchema: z.ZodObject<{
    mcpPath: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        toolArgs: z.ZodEffects<z.ZodString, string, string>;
        inputPath: z.ZodOptional<z.ZodString>;
        outputPath: z.ZodOptional<z.ZodString>;
        outputTransform: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
        outputTransform?: string | undefined;
    }, {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
        outputTransform?: string | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    mcpPath: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
        outputTransform?: string | undefined;
    }[];
}, {
    mcpPath: {
        toolName: string;
        toolArgs: string;
        inputPath?: string | undefined;
        outputPath?: string | undefined;
        outputTransform?: string | undefined;
    }[];
}>;
export type ToolhubChainInput = z.infer<typeof ToolhubChainInputSchema>;
//# sourceMappingURL=input.d.ts.map