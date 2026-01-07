#!/root/.claude-memory/venv/bin/python3
"""
Check ChromaDB for skill metadata
"""

import sys
sys.path.insert(0, '/root/.claude-memory/venv/lib/python3.12/site-packages')

import chromadb

client = chromadb.PersistentClient(path='/root/.claude-mem/vector-db')
collection = client.get_collection('claude_tools')

print('=' * 60)
print('ChromaDB Contents')
print('=' * 60)

# Get all items
all_items = collection.get()

print(f"\nTotal items: {collection.count()}")

# Group by type
by_type = {}
for i, item_id in enumerate(all_items['ids']):
    metadata = all_items['metadatas'][i]
    item_type = metadata.get('type', 'unknown')
    if item_type not in by_type:
        by_type[item_type] = []
    by_type[item_type].append(metadata.get('name', item_id))

for item_type, names in sorted(by_type.items()):
    print(f"\n{item_type} ({len(names)}):")
    for name in sorted(names):
        print(f"  - {name}")

# Check specific skills
print('\n' + '=' * 60)
print('Checking Skill Metadata')
print('=' * 60)

skills = ['n8n-node-templates', 'n8n-expressions', 'pandas-excel-작업']

for skill_name in skills:
    try:
        result = collection.get(ids=[skill_name])
        if result['ids']:
            metadata = result['metadatas'][0]
            print(f"\n✅ {skill_name}:")
            print(f"   Type: {metadata.get('type')}")
            print(f"   Summary: {metadata.get('summary', 'N/A')}")
            print(f"   When: {metadata.get('when', 'N/A')}")
            print(f"   Has keywords: {'keywords' in metadata}")
        else:
            print(f"\n❌ {skill_name}: NOT FOUND")
    except Exception as e:
        print(f"\n❌ {skill_name}: ERROR - {e}")

print('\n' + '=' * 60)
