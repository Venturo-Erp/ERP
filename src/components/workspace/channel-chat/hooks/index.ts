/**
 * Channel Chat Sub-Hooks
 *
 * 這些 hooks 從原本的 useChannelChat 中拆分出來，
 * 提升可維護性、可測試性和可重用性
 */

export { useDialogStates } from './useDialogStates'
export { useSelectionState } from './useSelectionState'
export { useChannelEditState } from './useChannelEditState'
export { useChannelOperations } from './useChannelOperations'
export { useChannelEffects } from './useChannelEffects'
export { useMessageHandlers } from './useMessageHandlers'
export { useThreadState } from './useThreadState'

