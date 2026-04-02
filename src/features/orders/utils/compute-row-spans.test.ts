import { describe, it, expect } from 'vitest'
import { computeRowSpans } from './compute-row-spans'

const makeMembers = (ids: string[]) => ids.map(id => ({ id }) as never)

describe('computeRowSpans', () => {
  it('computes room spans for consecutive same assignments', () => {
    const members = makeMembers(['a', 'b', 'c', 'd'])
    const roomAssignments = { a: 'R1', b: 'R1', c: 'R2', d: 'R2' }
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments,
      vehicleAssignments: {},
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({ a: 2, b: 0, c: 2, d: 0 })
  })

  it('handles no assignments (each gets span 1)', () => {
    const members = makeMembers(['a', 'b'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: {},
      vehicleAssignments: {},
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({ a: 1, b: 1 })
  })

  it('computes vehicle spans independently', () => {
    const members = makeMembers(['a', 'b', 'c'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: { a: 'R1', b: 'R1', c: 'R1' },
      vehicleAssignments: { a: 'V1', b: 'V2', c: 'V2' },
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({ a: 3, b: 0, c: 0 })
    expect(result.vehicleSpans).toEqual({ a: 1, b: 2, c: 0 })
  })

  it('computes per-hotel room spans', () => {
    const members = makeMembers(['a', 'b', 'c'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: {},
      vehicleAssignments: {},
      hotelColumns: [{ id: 'h1', name: 'Hotel 1' }],
      roomAssignmentsByHotel: { h1: { a: '101', b: '101', c: '102' } },
    })
    expect(result.roomSpansByHotel.h1).toEqual({ a: 2, b: 0, c: 1 })
  })

  it('handles empty members', () => {
    const result = computeRowSpans({
      sortedMembers: [],
      roomAssignments: {},
      vehicleAssignments: {},
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({})
  })

  it('handles single member', () => {
    const members = makeMembers(['a'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: { a: 'R1' },
      vehicleAssignments: { a: 'V1' },
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({ a: 1 })
    expect(result.vehicleSpans).toEqual({ a: 1 })
  })

  it('handles alternating assignments', () => {
    const members = makeMembers(['a', 'b', 'c', 'd'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: { a: 'R1', b: 'R2', c: 'R1', d: 'R2' },
      vehicleAssignments: {},
      hotelColumns: [],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpans).toEqual({ a: 1, b: 1, c: 1, d: 1 })
  })

  it('handles missing hotel in roomAssignmentsByHotel', () => {
    const members = makeMembers(['a', 'b'])
    const result = computeRowSpans({
      sortedMembers: members,
      roomAssignments: {},
      vehicleAssignments: {},
      hotelColumns: [{ id: 'h1', name: 'Hotel 1' }],
      roomAssignmentsByHotel: {},
    })
    expect(result.roomSpansByHotel.h1).toEqual({ a: 1, b: 1 })
  })
})
