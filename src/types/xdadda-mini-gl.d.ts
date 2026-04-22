/**
 * 2026-04-22: 此檔曾誤砍（以為孤兒）、實為 @xdadda/mini-gl npm 套件 ambient declaration
 * 給 features/designer/hooks/useImageAdjustments 用
 */

declare module '@xdadda/mini-gl' {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export type MiniGL = any
  export type MiniGLOptions = any
  export type Filter = any
  export const MiniGL: any
  export default MiniGL
  export const filters: any
  export const utils: any
}
