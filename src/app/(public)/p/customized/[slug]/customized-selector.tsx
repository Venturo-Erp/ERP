'use client'

/**
 * 客製化選擇器 - 客人勾選景點
 */

import { useState } from 'react'
import { Check, Plus, X, Send, MapPin, Users, Calendar, Phone, Mail, User } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateItem {
  id: string
  name: string
  image_url: string | null
  description: string | null
  region: string | null
  category: string | null
}

interface CustomizedSelectorProps {
  template: {
    id: string
    name: string
    description: string | null
    workspaceId: string
  }
  groupedItems: Record<string, TemplateItem[]>
}

export function CustomizedSelector({ template, groupedItems }: CustomizedSelectorProps) {
  const [selectedItems, setSelectedItems] = useState<TemplateItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 表單資料
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    travelDate: '',
    peopleCount: '2',
    notes: '',
  })

  const toggleItem = (item: TemplateItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) {
        return prev.filter(i => i.id !== item.id)
      }
      return [...prev, item]
    })
  }

  const isSelected = (id: string) => selectedItems.some(i => i.id === id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedItems.length === 0) {
      toast.error('請至少選擇一個景點')
      return
    }

    if (!formData.name || !formData.phone) {
      toast.error('請填寫姓名和電話')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          workspaceId: template.workspaceId,
          customerName: formData.name,
          phone: formData.phone,
          email: formData.email,
          travelDate: formData.travelDate || null,
          peopleCount: parseInt(formData.peopleCount),
          notes: formData.notes,
          selectedItems: selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            image_url: item.image_url,
            region: item.region,
          })),
        }),
      })

      if (!res.ok) throw new Error('送出失敗')

      toast.success('已送出！我們會盡快與您聯繫')
      setShowForm(false)
      setSelectedItems([])
      setFormData({
        name: '',
        phone: '',
        email: '',
        travelDate: '',
        peopleCount: '2',
        notes: '',
      })
    } catch (error) {
      toast.error('送出失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const regions = Object.keys(groupedItems)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tight text-public-secondary">御風旅遊</div>
          <a href="tel:07-9585361" className="text-public-secondary font-medium hidden sm:block">
            07-9585361
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex gap-8">
        {/* 左側：景點列表 */}
        <section className="flex-1">
          <header className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-morandi-primary mb-3">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-morandi-primary text-lg max-w-2xl">{template.description}</p>
            )}
          </header>

          {/* 分區顯示 */}
          {regions.map(region => (
            <div key={region} className="mb-12">
              <h2 className="text-xl font-bold text-public-secondary mb-6 flex items-center gap-2">
                <MapPin size={20} />
                {region}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groupedItems[region].map(item => {
                  const selected = isSelected(item.id)

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      className={`
                        group relative rounded-xl overflow-hidden cursor-pointer
                        transition-all duration-300
                        ${
                          selected
                            ? 'bg-status-info-bg ring-2 ring-public-secondary scale-[1.02]'
                            : 'bg-card shadow-sm hover:shadow-md hover:scale-[1.01]'
                        }
                      `}
                    >
                      {/* 圖片 */}
                      <div className="h-48 overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-public-secondary/30 to-public-secondary flex items-center justify-center">
                            <MapPin size={48} className="text-white/50" />
                          </div>
                        )}
                      </div>

                      {/* 內容 */}
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3
                            className={`text-lg font-bold ${selected ? 'text-public-secondary' : 'text-morandi-primary'}`}
                          >
                            {item.name}
                          </h3>
                          {selected && <Check size={20} className="text-public-secondary" />}
                        </div>

                        {item.description && (
                          <p
                            className={`text-sm leading-relaxed ${selected ? 'text-public-secondary/80' : 'text-morandi-primary'}`}
                          >
                            {item.description}
                          </p>
                        )}

                        <button
                          className={`
                            w-full mt-4 py-2.5 rounded-lg font-bold text-sm
                            flex items-center justify-center gap-2
                            transition-colors
                            ${
                              selected
                                ? 'bg-public-secondary text-white'
                                : 'border-2 border-border text-morandi-primary hover:border-public-secondary hover:text-public-secondary'
                            }
                          `}
                        >
                          {selected ? (
                            <>已加入</>
                          ) : (
                            <>
                              <Plus size={16} /> 加入清單
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* 右側：已選清單 */}
        <aside className="w-80 hidden lg:block">
          <div className="sticky top-24 bg-card rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-public-secondary mb-2">已選景點</h2>
            <p className="text-sm text-morandi-primary mb-6">{selectedItems.length} 個景點</p>

            {selectedItems.length === 0 ? (
              <p className="text-center text-morandi-secondary py-8">點擊景點卡片加入清單</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex gap-3 p-3 bg-status-info-bg/20 rounded-xl">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-morandi-primary truncate">{item.name}</p>
                      <p className="text-xs text-morandi-primary">{item.region}</p>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          toggleItem(item)
                        }}
                        className="text-xs text-public-secondary underline mt-1"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowForm(true)}
              disabled={selectedItems.length === 0}
              className={`
                w-full py-4 rounded-xl font-bold text-white
                flex items-center justify-center gap-2
                transition-all
                ${
                  selectedItems.length > 0
                    ? 'bg-gradient-to-r from-public-secondary to-public-secondary/80 shadow-lg hover:shadow-xl'
                    : 'bg-morandi-muted cursor-not-allowed'
                }
              `}
            >
              <Send size={18} />
              送出詢價
            </button>
          </div>
        </aside>
      </main>

      {/* 手機版底部固定按鈕 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4">
        <button
          onClick={() => setShowForm(true)}
          disabled={selectedItems.length === 0}
          className={`
            w-full py-4 rounded-xl font-bold text-white
            flex items-center justify-center gap-2
            ${
              selectedItems.length > 0
                ? 'bg-gradient-to-r from-public-secondary to-public-secondary/80'
                : 'bg-morandi-muted cursor-not-allowed'
            }
          `}
        >
          <Send size={18} />
          送出詢價 ({selectedItems.length} 個景點)
        </button>
      </div>

      {/* 表單 Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-morandi-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-morandi-primary">填寫聯絡資料</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-morandi-secondary hover:text-morandi-primary"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* 姓名 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                  姓名 *
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-morandi-secondary"
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="王小明"
                    className="w-full pl-12 pr-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0"
                    required
                  />
                </div>
              </div>

              {/* 電話 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                  電話 *
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-morandi-secondary"
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0912-345-678"
                    className="w-full pl-12 pr-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-morandi-secondary"
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0"
                  />
                </div>
              </div>

              {/* 日期和人數 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                    出發日期
                  </label>
                  <div className="relative">
                    <Calendar
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-morandi-secondary"
                    />
                    <input
                      type="date"
                      value={formData.travelDate}
                      onChange={e => setFormData(p => ({ ...p, travelDate: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                    人數
                  </label>
                  <div className="relative">
                    <Users
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-morandi-secondary"
                    />
                    <select
                      value={formData.peopleCount}
                      onChange={e => setFormData(p => ({ ...p, peopleCount: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0 appearance-none"
                    >
                      <option value="1">1 人</option>
                      <option value="2">2 人</option>
                      <option value="3">3-5 人</option>
                      <option value="6">6-10 人</option>
                      <option value="10">10+ 人</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 備註 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-morandi-primary mb-2 block">
                  其他需求
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="有任何特殊需求請在此說明..."
                  rows={3}
                  className="w-full px-4 py-4 bg-background rounded-xl focus:ring-2 focus:ring-public-secondary border-0 resize-none"
                />
              </div>

              {/* 已選景點摘要 */}
              <div className="bg-status-info-bg/20 rounded-xl p-4">
                <p className="text-sm font-bold text-public-secondary mb-2">
                  已選 {selectedItems.length} 個景點
                </p>
                <p className="text-xs text-morandi-primary">
                  {selectedItems.map(i => i.name).join('、')}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-public-secondary to-public-secondary/80 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {submitting ? '送出中...' : '確認送出'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-background py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-morandi-primary font-bold text-lg mb-2">御風旅遊</p>
          <p className="text-morandi-secondary text-sm">高雄市楠梓區大學56街2號</p>
          <p className="text-morandi-secondary text-sm">07-9585361</p>
        </div>
      </footer>
    </div>
  )
}
