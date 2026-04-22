/**
 * 2026-04-22: 分房分車功能砍除（William 決策、之後重新開發）
 * 此 hook 為 stub、回傳空資料、讓上游 OrderMembersExpandable 等繼續編譯但無功能
 * 之後重做時直接重寫
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type HotelColumn = any
export type RoomOption = any
export type RoomMemberInfo = any

export function useRoomVehicleAssignments(_args?: any): any {
  return {
    roomAssignments: {},
    vehicleAssignments: {},
    roomAssignmentsByHotel: {},
    vehicleAssignmentsByDate: {},
    showRoomColumn: false,
    showVehicleColumn: false,
    hotelColumns: [],
    roomIdByHotelMember: {},
    roomMembersByHotelRoom: {},
    roomOptionsByHotel: {},
    assignMemberToRoom: async () => {},
    removeMemberFromRoom: async () => {},
    showRoomManager: false,
    setShowRoomManager: () => {},
    loadRoomAssignments: () => {},
    loadVehicleAssignments: () => {},
    loading: false,
    refresh: () => {},
    saveRoomAssignment: async () => {},
    saveVehicleAssignment: async () => {},
  }
}
