#!/bin/bash
# Supabase Setup Script for Venturo
# This script helps you set up and manage Supabase database

set -e

echo "🚀 Venturo Supabase Setup"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

# Check if personal access token is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN not set${NC}"
    echo ""
    echo "Please get your Personal Access Token from:"
    echo "🔗 https://supabase.com/dashboard/account/tokens"
    echo ""
    echo "Then run:"
    echo "export SUPABASE_ACCESS_TOKEN=your_token_here"
    echo "./scripts/setup-supabase.sh"
    exit 1
fi

PROJECT_REF="pfqvdacxowpgfamuvnsn"

echo -e "${BLUE}📋 Step 1: Link to Supabase project${NC}"
npx supabase link --project-ref $PROJECT_REF

echo ""
echo -e "${BLUE}📋 Step 2: Push migrations to database${NC}"
npx supabase db push

echo ""
echo -e "${BLUE}📋 Step 3: Generate TypeScript types${NC}"
npx supabase gen types typescript --project-id $PROJECT_REF > src/lib/supabase/types.ts

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Check the generated types at: src/lib/supabase/types.ts"
echo "  2. Restart your dev server if needed"
echo "  3. All workspace features should now work with Supabase!"
