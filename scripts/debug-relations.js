#!/usr/bin/env node
/**
 * Debug Knowledge Graph relations
 */

import { readFileSync } from 'fs';

const graph = JSON.parse(readFileSync('/root/.claude-memory/knowledge-graph.json', 'utf-8'));

console.log('='.repeat(60));
console.log('Knowledge Graph Relations');
console.log('='.repeat(60));

// n8n-workflow-builder의 관계
console.log('\n📊 Relations from n8n-workflow-builder:');
const n8nRelations = graph.relations.filter(r => r.from === 'n8n-workflow-builder');
n8nRelations.forEach(rel => {
    const target = graph.entities.find(e => e.name === rel.to);
    console.log(`  → ${rel.to} (${target?.entityType || 'unknown'}) [${rel.relationType}]`);
});

// sqlite_tiktok의 관계
console.log('\n📊 Relations from sqlite_tiktok:');
const tiktokRelations = graph.relations.filter(r => r.from === 'sqlite_tiktok');
tiktokRelations.forEach(rel => {
    const target = graph.entities.find(e => e.name === rel.to);
    console.log(`  → ${rel.to} (${target?.entityType || 'unknown'}) [${rel.relationType}]`);
});

// 모든 Skill 타입 엔티티
console.log('\n📊 All Skill entities:');
const skills = graph.entities.filter(e => e.entityType === 'Skill');
skills.forEach(skill => {
    console.log(`  - ${skill.name}`);
});

console.log('\n' + '='.repeat(60));
