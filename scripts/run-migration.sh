#!/bin/bash
# Migration wrapper - 自動執行 migration 並更新 types

set -e  # 任何錯誤立即退出

MIGRATION_FILE=$1

if [ -z "$MIGRATION_FILE" ]; then
  echo "❌ Usage: ./scripts/run-migration.sh <migration-file.sql>"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📋 Migration file: $MIGRATION_FILE"
echo ""

# 1. 執行 migration
echo "🔄 Step 1/2: Executing migration..."
node -e "
const fs = require('fs');
const projectRef = 'pfqvdacxowpgfamuvnsn';
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02';
const sql = fs.readFileSync('$MIGRATION_FILE', 'utf-8');

fetch(\`https://api.supabase.com/v1/projects/\${projectRef}/database/query\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})
.then(r => r.json())
.then(d => {
  if (d.message) {
    console.error('❌ Migration failed:', d.message);
    process.exit(1);
  }
  console.log('✅ Migration executed successfully');
});
" || exit 1

echo ""

# 2. 自動更新 types
echo "🔄 Step 2/2: Regenerating Supabase types..."
node scripts/regenerate-supabase-types.mjs || exit 1

echo ""
echo "🎉 Migration complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git diff src/lib/supabase/types.ts"
echo "  2. Run type check: npm run type-check"
echo "  3. Commit if everything looks good"
echo ""
