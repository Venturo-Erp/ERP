// Workspace store barrel
// 內部聊天系統（channels / messages / chat / channel-members）已於 2026-05-02 整套刪除。
// 這裡只剩 workspaces 表本身、外加給舊 callers 用的兼容 hook。

import { useWorkspaceStoreData } from './workspace-store'
import type { Workspace } from './types'

export * from './types'
export { useWorkspaceStoreData } from './workspace-store'

/**
 * 兼容 hook：給歷史上用 useWorkspaceStore() 的 caller 用
 * （tenants 編輯 / calendar 全租戶篩選等）。
 * 等所有 callers 改成直接用 useWorkspaceStoreData 後可拿掉。
 */
export const useWorkspaceStore = () => {
  const store = useWorkspaceStoreData()
  return {
    workspaces: store.items as Workspace[],
    loadWorkspaces: store.fetchAll,
    updateWorkspace: store.update,
  }
}

/**
 * 同上、舊命名（部分 caller 叫 useWorkspaceChannels）。
 * 名稱保留只為了減少改動範圍、實際已不含 channel 邏輯。
 */
export const useWorkspaceChannels = useWorkspaceStore
