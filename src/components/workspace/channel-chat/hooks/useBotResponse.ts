import { useCallback } from 'react'
import { SYSTEM_BOT_ID } from '@/lib/constants/workspace'

/**
 * VENTURO 機器人 DM 偵測 hook
 *
 * 機器人不會回應使用者輸入；訊息回覆由 server 端的 bot-notification / ticket-status 觸發。
 */
export function useBotResponse() {
  const isBotDmChannel = useCallback((channelName: string, channelType?: string | null) => {
    if (channelType === 'direct' || channelName.startsWith('dm:')) {
      const parts = channelName.replace('dm:', '').split(':')
      return parts.includes(SYSTEM_BOT_ID)
    }
    return false
  }, [])

  const handleBotChat = useCallback(async (_channelId: string, _userMessage: string) => {
    // 機器人不會自動回覆使用者輸入（Logan AI 已下架）
  }, [])

  return {
    isBotDmChannel,
    handleBotChat,
    SYSTEM_BOT_ID,
  }
}
