#!/usr/bin/env node
/**
 * Test script for Phase 2 - Related Skills
 */

import { HybridSearchService } from '../dist/services/hybrid-search.js';

async function test() {
    console.log('=' .repeat(60));
    console.log('Testing Phase 2: Related Skills');
    console.log('=' .repeat(60));

    const hybridSearch = new HybridSearchService();

    // Test 1: Search for n8n workflow (should find n8n-node-templates and n8n-expressions skills)
    console.log('\n📊 Test 1: Search for "n8n workflow"');
    const result1 = await hybridSearch.getToolCluster('n8n workflow', true);

    console.log('\n✅ Primary Tools:');
    result1.primary.forEach((tool, i) => {
        console.log(`${i + 1}. ${tool.name} (${tool.type})`);
        if (tool.mcpCli) {
            console.log(`   mcpCli: ${tool.mcpCli.quickStart}`);
        }
        if (tool.skillMeta) {
            console.log(`   Skill: ${tool.skillMeta.summary} (${tool.skillMeta.tokenSize} tokens)`);
            console.log(`   When: ${tool.skillMeta.when}`);
        }
    });

    console.log('\n🔗 Dependencies:');
    result1.dependencies.forEach((tool, i) => {
        console.log(`${i + 1}. ${tool.name} (${tool.type})`);
    });

    if (result1.relatedSkills && result1.relatedSkills.length > 0) {
        console.log('\n💡 Related Skills (메타데이터만):');
        result1.relatedSkills.forEach((skill, i) => {
            console.log(`${i + 1}. ${skill.name}`);
            console.log(`   Summary: ${skill.summary}`);
            console.log(`   When: ${skill.when}`);
            console.log(`   Token Size: ${skill.tokenSize}`);
        });
    } else {
        console.log('\n❌ No related skills found');
    }

    console.log('\n📈 Stats:');
    console.log(`   Total Tools: ${result1.stats.totalTools}`);
    console.log(`   Token Estimate: ${result1.stats.tokenEstimate}`);
    console.log(`   Savings: ${result1.stats.savingsPercent.toFixed(1)}%`);

    // Test 2: Search for TikTok data (should find pandas-excel, 데이터-구조-파악 skills)
    console.log('\n\n📊 Test 2: Search for "TikTok 데이터 분석"');
    const result2 = await hybridSearch.getToolCluster('TikTok 데이터 분석', true);

    console.log('\n✅ Primary Tools:');
    result2.primary.forEach((tool, i) => {
        console.log(`${i + 1}. ${tool.name} (${tool.type})`);
    });

    if (result2.relatedSkills && result2.relatedSkills.length > 0) {
        console.log('\n💡 Related Skills:');
        result2.relatedSkills.forEach((skill, i) => {
            console.log(`${i + 1}. ${skill.name} - ${skill.summary}`);
            console.log(`   When: ${skill.when}`);
        });
    } else {
        console.log('\n❌ No related skills found');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Phase 2 Test Complete!');
    console.log('=' .repeat(60));
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
