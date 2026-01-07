#!/usr/bin/env node
/**
 * Test script for Progressive Loader - directly test vector search
 */

import { HybridSearchService } from '../dist/services/hybrid-search.js';

async function test() {
    console.log('=' .repeat(60));
    console.log('Testing Progressive Loader - Vector Search');
    console.log('=' .repeat(60));

    const hybridSearch = new HybridSearchService();

    // Test 1: Search for TikTok
    console.log('\n📊 Test 1: Search for "TikTok"');
    const result1 = await hybridSearch.search('TikTok 조회수', 2, false);

    console.log('\nResults:');
    result1.results.forEach((tool, i) => {
        console.log(`\n${i + 1}. ${tool.name}`);
        console.log(`   Type: ${tool.type}`);
        console.log(`   Description: ${tool.description.substring(0, 60)}...`);
        console.log(`   Similarity: ${tool.similarity?.toFixed(3)}`);

        if (tool.mcpCli) {
            console.log(`   ✅ mcpCli: ${tool.mcpCli.quickStart}`);
            console.log(`   Examples (${tool.mcpCli.examples.length}):`, tool.mcpCli.examples[0]);
            console.log(`   Tools (${tool.mcpCli.tools.length}):`, tool.mcpCli.tools.map(t => t.name).join(', '));
        } else {
            console.log(`   ❌ mcpCli: NOT FOUND`);
        }
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test Complete!');
    console.log('=' .repeat(60));
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
