/**
 * 客製化入口頁 - 3D 地球 + DIY 選景點
 * 路由: /p/customized
 *
 * 🎯 核心概念：
 * 1. 客人進來看到 3D 地球（或世界地圖）
 * 2. 點選國家 → 進入該國景點選擇
 * 3. 選完存檔 → 特效動畫 → 生成專屬追蹤連結
 * 4. 專屬連結 = 客人可以回來看進度，我們可以回覆
 */

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { MapPin, Globe } from 'lucide-react'
import { COMPANY } from '@/lib/constants/company'
import { logger } from '@/lib/utils/logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CustomizedTour {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image: string | null
  items_count: number
  workspace_id: string
}

interface CompanyInfo {
  name: string
  phone: string
}

async function getPublishedTemplates(): Promise<{
  templates: CustomizedTour[]
  companyInfo: CompanyInfo
}> {
  const { data, error } = await supabaseAdmin
    .from('wishlist_templates')
    .select(
      `
      id,
      name,
      slug,
      description,
      cover_image,
      workspace_id,
      wishlist_template_items(count)
    `
    )
    .eq('status', 'published')
    .order('name')

  if (error) {
    logger.error('Error fetching templates:', error)
    return { templates: [], companyInfo: { name: COMPANY.legalName, phone: '02-1234-5678' } }
  }

  const templates = (data || []).map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    cover_image: t.cover_image,
    workspace_id: t.workspace_id,
    items_count: (t.wishlist_template_items as { count: number }[])?.[0]?.count || 0,
  }))

  // 從第一個模板的 workspace 取得公司資訊
  let companyInfo: CompanyInfo = { name: COMPANY.legalName, phone: '02-1234-5678' }
  if (templates.length > 0) {
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('legal_name, phone')
      .eq('id', templates[0].workspace_id)
      .single()

    if (workspace) {
      companyInfo = {
        name: workspace.legal_name || COMPANY.legalName,
        phone: workspace.phone || '02-1234-5678',
      }
    }
  }

  return { templates, companyInfo }
}

export default async function WishlistIndexPage() {
  const { templates, companyInfo } = await getPublishedTemplates()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-morandi-primary/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{companyInfo.name}</h1>
          <a href={`tel:${companyInfo.phone}`} className="text-sm text-white/60 hover:text-white">
            {companyInfo.phone}
          </a>
        </div>
      </header>

      {/* Hero - 未來放 3D 地球 */}
      <section className="py-20 px-4 text-center relative">
        <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Globe className="w-24 h-24 text-white animate-pulse" />
        </div>
        <h2 className="text-4xl font-bold mb-4 text-white">探索世界</h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          選擇你想去的目的地，挑選景點，我們為你打造專屬行程
        </p>
      </section>

      {/* 目的地列表 */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h3 className="text-xl font-bold text-white mb-6">選擇目的地</h3>

        {templates.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <p className="text-white/60">目前沒有可選擇的目的地</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map(template => (
              <Link
                key={template.id}
                href={`/p/customized/${template.slug}`}
                className="group block bg-card/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-card/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
              >
                {/* 封面圖 */}
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/30 to-primary/10 relative overflow-hidden">
                  {template.cover_image ? (
                    <img
                      src={template.cover_image}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  {/* 景點數量 */}
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
                    {template.items_count} 景點
                  </div>
                </div>

                {/* 資訊 */}
                <div className="p-4">
                  <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                    {template.name}
                  </h4>
                  {template.description && (
                    <p className="text-sm text-white/50 line-clamp-1 mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-white/40">
          <p>
            © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
