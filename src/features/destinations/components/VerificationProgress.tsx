'use client'

interface VerificationProgressProps {
  stats: {
    total: number
    verified: number
    pending: number
    reviewing: number
  }
}

export function VerificationProgress({ stats }: VerificationProgressProps) {
  const percentage = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">確認進度</h2>
        <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
      </div>

      {/* 進度條 */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 總數 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-gray-600 text-sm mb-1">總數</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        {/* 已確認 */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-green-600 text-sm mb-1">✅ 已確認</div>
          <div className="text-2xl font-bold text-green-700">{stats.verified}</div>
        </div>

        {/* 確認中 */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-yellow-600 text-sm mb-1">⏳ 確認中</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.reviewing}</div>
        </div>

        {/* 待確認 */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-red-600 text-sm mb-1">❌ 待確認</div>
          <div className="text-2xl font-bold text-red-700">{stats.pending}</div>
        </div>
      </div>

      {/* 提示 */}
      {stats.verified === stats.total && stats.total > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            🎉 所有景點已確認完成！可以開始計算距離矩陣了
          </p>
        </div>
      )}

      {stats.pending > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            還有 <span className="font-bold">{stats.pending}</span> 個景點待確認
          </p>
        </div>
      )}
    </div>
  )
}
