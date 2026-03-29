/**
 * 紙娃娃公開頁面 - 客人選景點
 * 路由: /p/wishlist/[slug]
 */

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { WishlistSelector } from './wishlist-selector'

// 建立 service role client（繞過 RLS）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function WishlistPage({ params }: PageProps) {
  const { slug } = await params

  // 查詢紙娃娃模板
  const { data: template, error } = await supabase
    .from('wishlist_templates')
    .select(`
      id,
      name,
      slug,
      cover_image,
      description,
      workspace_id,
      wishlist_template_items (
        id,
        name,
        image_url,
        description,
        region,
        category,
        display_order
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !template) {
    notFound()
  }

  // 按 display_order 排序
  const items = (template.wishlist_template_items || []).sort(
    (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
  )

  // 按地區分組
  type ItemType = typeof items[number]
  const groupedItems = items.reduce((acc: Record<string, ItemType[]>, item: ItemType) => {
    const region = item.region || '其他'
    if (!acc[region]) acc[region] = []
    acc[region].push(item)
    return acc
  }, {} as Record<string, ItemType[]>)

  return (
    <WishlistSelector
      template={{
        id: template.id,
        name: template.name,
        description: template.description,
        workspaceId: template.workspace_id,
      }}
      groupedItems={groupedItems}
    />
  )
}
