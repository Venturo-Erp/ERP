'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { GAME_OFFICE_LABELS } from './constants/labels'

const TW = 64,
  TH = 32
const ANCHORS = { floor: { x: 32, y: 16 }, wallL: { x: 15, y: 62 }, wallB: { x: 47, y: 62 } }
const MAX_HISTORY = 50

interface RoomObject {
  id: number
  asset: string
  col: number
  row: number
  offX: number
  offY: number
  flip: boolean
  parentId?: number
  slotIndex?: number
  depthOffset?: number
}

interface RoomData {
  v: number
  cols: number
  rows: number
  floor: (string | null)[][]
  leftWall: (string | null)[]
  backWall: (string | null)[]
  objects: RoomObject[]
  nextId: number
}

interface AssetCatalogEntry {
  name: string
  file: string
  label: string
  cat: string
  sub: string
  w: number
  h: number
}

interface AssetMeta {
  placement: string
  sizeClass: string
  footprint: [number, number]
  hasSurface: boolean
  surfaceOffsetY?: number
  maxItems?: number
  acceptSizes?: string[]
  slots?: { x: number; y: number }[]
}

interface PhaserOfficeProps {
  className?: string
  editMode?: boolean
  workspaceId?: string
  userId?: string
  onReady?: () => void
  onInteract?: (asset: string) => void
}

function cloneRoom(r: RoomData): RoomData {
  return JSON.parse(JSON.stringify(r)) as RoomData
}

function defaultRoom(): RoomData {
  const cols = 10,
    rows = 10
  const floor: (string | null)[][] = []
  for (let r = 0; r < rows; r++) {
    floor[r] = []
    for (let c = 0; c < cols; c++) {
      floor[r][c] = (r + c) % 3 === 0 ? 'Floor_3_Tile(64)' : 'Floor_5_Tile(64)'
    }
  }
  const leftWall: (string | null)[] = []
  const backWall: (string | null)[] = []
  for (let i = 0; i < 10; i++) {
    leftWall.push(i % 2 === 0 ? 'Wall_5_Tile(64)' : 'Wall_3_Tile(64)')
    backWall.push(i % 2 === 0 ? 'Wall_5_Tile(64)_L' : 'Wall_3_Tile(64)_L')
  }
  return {
    v: 2,
    cols,
    rows,
    floor,
    leftWall,
    backWall,
    nextId: 30,
    objects: [
      // William's desk
      { id: 1, asset: 'Desk_1_Tile', col: 3, row: 2, offX: 0, offY: 0, flip: false },
      {
        id: 2,
        asset: 'NewImac_A_Tile',
        col: 3,
        row: 2,
        offX: -10,
        offY: -36,
        flip: false,
        parentId: 1,
        slotIndex: 0,
      },
      {
        id: 3,
        asset: 'NewKeyboard_Tile',
        col: 3,
        row: 2,
        offX: 10,
        offY: -30,
        flip: false,
        parentId: 1,
        slotIndex: 1,
      },
      {
        id: 4,
        asset: 'Mug_15',
        col: 3,
        row: 2,
        offX: 20,
        offY: -34,
        flip: false,
        parentId: 1,
        slotIndex: 2,
      },
      { id: 5, asset: 'Chair_2_A_Tile', col: 4, row: 3, offX: 0, offY: 0, flip: false },
      { id: 6, asset: 'Desk_1_B_Tile', col: 3, row: 5, offX: 0, offY: 0, flip: false },
      {
        id: 7,
        asset: 'Macbook_1_Open_Tile',
        col: 3,
        row: 5,
        offX: 0,
        offY: -32,
        flip: false,
        parentId: 6,
        slotIndex: 0,
      },
      {
        id: 8,
        asset: 'Lamp_8_A_Tile',
        col: 3,
        row: 5,
        offX: -14,
        offY: -38,
        flip: false,
        parentId: 6,
        slotIndex: 1,
      },
      { id: 9, asset: 'Chair_2_B_Tile', col: 4, row: 6, offX: 0, offY: 0, flip: false },
      { id: 10, asset: 'Desk_1_Tile', col: 7, row: 2, offX: 0, offY: 0, flip: true },
      {
        id: 11,
        asset: 'OldImac_A_Tile',
        col: 7,
        row: 2,
        offX: -8,
        offY: -36,
        flip: false,
        parentId: 10,
        slotIndex: 0,
      },
      {
        id: 12,
        asset: 'WacomTablet',
        col: 7,
        row: 2,
        offX: 12,
        offY: -32,
        flip: false,
        parentId: 10,
        slotIndex: 1,
      },
      { id: 13, asset: 'Chair_2_C_Tile', col: 6, row: 3, offX: 0, offY: 0, flip: false },
      { id: 14, asset: 'Table_10', col: 6, row: 6, offX: 0, offY: 0, flip: false },
      { id: 15, asset: 'Chair_2_D_Tile', col: 5, row: 6, offX: 0, offY: 0, flip: false },
      { id: 16, asset: 'Chair_2_A_Tile', col: 7, row: 6, offX: 0, offY: 0, flip: true },
      { id: 17, asset: 'Chair_2_B_Tile', col: 6, row: 5, offX: 0, offY: 0, flip: false },
      { id: 18, asset: 'Chair_2_C_Tile', col: 6, row: 7, offX: 0, offY: 0, flip: false },
      { id: 19, asset: 'shelving_6', col: 1, row: 1, offX: 0, offY: 0, flip: false },
      { id: 20, asset: 'shelving_7', col: 9, row: 1, offX: 0, offY: 0, flip: false },
      { id: 21, asset: 'Plant_2', col: 1, row: 9, offX: 0, offY: 0, flip: false },
      { id: 22, asset: 'Bonsai', col: 9, row: 9, offX: 0, offY: 0, flip: false },
      { id: 23, asset: 'Sun_Flower', col: 1, row: 5, offX: 0, offY: 0, flip: false },
      { id: 24, asset: 'Sofa_3_A_Tile', col: 8, row: 5, offX: 0, offY: 0, flip: false },
      { id: 25, asset: 'SmallTable_5', col: 8, row: 7, offX: 0, offY: 0, flip: false },
      { id: 26, asset: 'Cat_99_2_A', col: 5, row: 4, offX: 0, offY: 0, flip: false },
      {
        id: 27,
        asset: 'Carpet_3_Tile',
        col: 5.5,
        row: 5.5,
        offX: 0,
        offY: 0,
        flip: false,
        depthOffset: -0.5,
      },
      { id: 28, asset: 'Fridge_2_A_Tile', col: 9, row: 3, offX: 0, offY: 0, flip: false },
      { id: 29, asset: 'Window_7_A_Tile', col: 5, row: 0.5, offX: 0, offY: 0, flip: false },
    ],
  }
}

async function saveRoom(room: RoomData, wid?: string, uid?: string) {
  localStorage.setItem('vo-game-office', JSON.stringify(room))
  if (wid) {
    fetch('/api/game-office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: wid, room_data: room, user_id: uid }),
    }).catch(() => {})
  }
}

function getMeta(assetMeta: Record<string, AssetMeta>, name: string): AssetMeta {
  return (
    assetMeta[name] || {
      placement: 'floor',
      sizeClass: 'medium',
      footprint: [1, 1],
      hasSurface: false,
    }
  )
}

function findSurfaceParent(
  room: RoomData,
  assetMeta: Record<string, AssetMeta>,
  col: number,
  row: number,
  excludeId: number
) {
  let best: RoomObject | null = null,
    bestDist = Infinity
  for (const o of room.objects) {
    if (o.id === excludeId) continue
    const m = getMeta(assetMeta, o.asset)
    if (!m.hasSurface) continue
    const dist = Math.sqrt((col - o.col) ** 2 + (row - o.row) ** 2)
    if (dist < 1.5 && dist < bestDist) {
      bestDist = dist
      best = o
    }
  }
  return best
}

function findBestSlot(
  room: RoomData,
  assetMeta: Record<string, AssetMeta>,
  parent: RoomObject,
  childAsset: string
) {
  const pm = getMeta(assetMeta, parent.asset)
  if (!pm.hasSurface || !pm.slots) return null
  const cm = getMeta(assetMeta, childAsset)
  if (pm.acceptSizes && !pm.acceptSizes.includes(cm.sizeClass)) return null
  const children = room.objects.filter(o => o.parentId === parent.id)
  if (children.length >= (pm.maxItems || 99)) return null
  const usedSlots = new Set(children.map(o => o.slotIndex))
  for (let i = 0; i < pm.slots.length; i++) {
    if (!usedSlots.has(i)) return { index: i, slot: pm.slots[i] }
  }
  return null
}

export default function PhaserOffice({
  className,
  editMode = false,
  workspaceId,
  userId,
  onReady,
  onInteract,
}: PhaserOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<unknown>(null)
  const sceneRef = useRef<unknown>(null)
  const destroyRef = useRef(false)
  const editModeRef = useRef(editMode)
  const onInteractRef = useRef(onInteract)
  useEffect(() => {
    onInteractRef.current = onInteract
  }, [onInteract])
  const [catalog, setCatalog] = useState<AssetCatalogEntry[]>([])
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('全部')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  const initGame = useCallback(async () => {
    if (destroyRef.current) return
    const Phaser = (await import('phaser')).default
    if (destroyRef.current || !containerRef.current) return

    const [catalogRes, metaRes] = await Promise.all([
      fetch('/game-office/asset-catalog.json'),
      fetch('/game-office/asset-meta.json'),
    ])
    const catalogData: AssetCatalogEntry[] = await catalogRes.json()
    const assetMeta: Record<string, AssetMeta> = await metaRes.json()
    setCatalog(catalogData)
    if (destroyRef.current) return

    let room = defaultRoom()
    if (workspaceId) {
      try {
        const roomRes = await fetch(`/api/game-office?workspace_id=${workspaceId}`)
        const roomJson = await roomRes.json()
        if (roomJson.room) room = roomJson.room
      } catch {
        /* fallback to localStorage */
      }
    }
    if (!workspaceId) {
      const saved = localStorage.getItem('vo-game-office')
      if (saved) {
        try {
          room = JSON.parse(saved)
        } catch {
          /* default */
        }
      }
    }

    function assetType(name: string): 'floor' | 'wallL' | 'wallB' | 'object' {
      if (name.startsWith('Floor_')) return 'floor'
      if (/_L[_(.)]/.test(name) || name.endsWith('_L')) return 'wallB'
      if (name.startsWith('Wall_')) return 'wallL'
      return 'object'
    }

    // Lookup asset label from catalog
    function assetLabel(name: string): string {
      const entry = catalogData.find(a => a.name === name)
      return entry ? entry.label : name
    }

    class OfficeScene extends Phaser.Scene {
      Z = 1
      panX = 0
      panY = 0
      OX = 0
      OY = 0
      selObjId: number | null = null
      dragging = false
      selWall: { type: 'L' | 'B'; index: number } | null = null
      selFloor: { row: number; col: number } | null = null

      // P0: Undo/Redo
      historyStack: string[] = []
      historyIndex = -1

      // P1: Preview
      previewSprite: Phaser.GameObjects.Image | null = null
      lastPtrX = 0
      lastPtrY = 0

      // P2: Continuous painting
      isPainting = false
      paintType: 'floor' | 'wallL' | 'wallB' | null = null
      paintAsset: string | null = null
      paintedSprites: Map<string, Phaser.GameObjects.Image> = new Map()

      // P4: Context menu
      contextMenu: Phaser.GameObjects.Container | null = null
      contextMenuObjId: number | null = null

      // P5: Selection visuals
      selGfx: Phaser.GameObjects.Graphics | null = null
      selLabelText: Phaser.GameObjects.Text | null = null

      constructor() {
        super({ key: 'OfficeScene' })
      }

      // --- History ---
      pushHistory() {
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1)
        this.historyStack.push(JSON.stringify(room))
        if (this.historyStack.length > MAX_HISTORY) this.historyStack.shift()
        this.historyIndex = this.historyStack.length - 1
      }

      undo() {
        if (this.historyIndex <= 0) return
        this.historyIndex--
        room = JSON.parse(this.historyStack[this.historyIndex]) as RoomData
        this.selObjId = null
        this.selWall = null
        this.selFloor = null
        saveRoom(room, workspaceId, userId)
        this.rebuildAll()
      }

      redo() {
        if (this.historyIndex >= this.historyStack.length - 1) return
        this.historyIndex++
        room = JSON.parse(this.historyStack[this.historyIndex]) as RoomData
        this.selObjId = null
        this.selWall = null
        this.selFloor = null
        saveRoom(room, workspaceId, userId)
        this.rebuildAll()
      }

      // --- Context Menu ---
      showContextMenu(wx: number, wy: number, objId: number) {
        this.hideContextMenu()
        this.contextMenuObjId = objId

        const items: { label: string; action: 'delete' | 'flip' | 'copy' }[] = [
          { label: `🗑 ${GAME_OFFICE_LABELS.CTX_DELETE}`, action: 'delete' },
          { label: `🔄 ${GAME_OFFICE_LABELS.CTX_FLIP}`, action: 'flip' },
          { label: `📋 ${GAME_OFFICE_LABELS.CTX_COPY}`, action: 'copy' },
        ]

        const menuW = 110,
          itemH = 28,
          pad = 4
        const menuH = items.length * itemH + pad * 2
        const container = this.add.container(wx, wy).setDepth(10000)

        const bg = this.add.graphics()
        bg.fillStyle(0x1a1a2e, 0.95)
        bg.fillRoundedRect(0, 0, menuW, menuH, 6)
        bg.lineStyle(1, 0x4ecca3, 0.6)
        bg.strokeRoundedRect(0, 0, menuW, menuH, 6)
        container.add(bg)

        items.forEach((item, i) => {
          const iy = pad + i * itemH
          const hitBg = this.add.graphics()
          container.add(hitBg)

          const zone = this.add
            .zone(menuW / 2, iy + itemH / 2, menuW - 2, itemH)
            .setInteractive({ useHandCursor: true })
          container.add(zone)

          const text = this.add.text(10, iy + 6, item.label, {
            fontSize: '12px',
            color: '#d0d0d0',
            fontFamily: 'monospace',
          })
          container.add(text)

          zone.on('pointerover', () => {
            hitBg.clear()
            hitBg.fillStyle(0x4ecca3, 0.15)
            hitBg.fillRect(1, iy, menuW - 2, itemH)
            text.setColor('#4ecca3')
          })
          zone.on('pointerout', () => {
            hitBg.clear()
            text.setColor('#d0d0d0')
          })
          zone.on('pointerdown', () => this.handleContextAction(item.action, objId))
        })

        this.contextMenu = container
      }

      hideContextMenu() {
        if (this.contextMenu) {
          this.contextMenu.destroy(true)
          this.contextMenu = null
        }
        this.contextMenuObjId = null
      }

      handleContextAction(action: 'delete' | 'flip' | 'copy', objId: number) {
        this.hideContextMenu()
        this.pushHistory()

        if (action === 'delete') {
          const kids = room.objects.filter(o => o.parentId === objId)
          const delIds = new Set([objId, ...kids.map(k => k.id)])
          room.objects = room.objects.filter(o => !delIds.has(o.id))
          this.selObjId = null
        } else if (action === 'flip') {
          const o = room.objects.find(x => x.id === objId)
          if (o) o.flip = !o.flip
        } else if (action === 'copy') {
          const o = room.objects.find(x => x.id === objId)
          if (o) {
            const copy: RoomObject = {
              ...o,
              id: room.nextId++,
              col: o.col + 0.5,
              row: o.row + 0.5,
              parentId: undefined,
              slotIndex: undefined,
            }
            room.objects.push(copy)
            this.selObjId = copy.id
          }
        }

        saveRoom(room, workspaceId, userId)
        this.rebuildAll()
      }

      // --- Preview ---
      updatePreview() {
        if (this.previewSprite) {
          this.previewSprite.destroy()
          this.previewSprite = null
        }
        const asset = selectedAssetRef.current
        if (!asset || !editModeRef.current) return
        if (!this.textures.exists(asset)) return

        const wp = this.cameras.main.getWorldPoint(this.lastPtrX, this.lastPtrY)
        const g = this.grd(wp.x, wp.y)
        const t = assetType(asset)

        if (t === 'floor') {
          const fc = Math.floor(g.col),
            fr = Math.floor(g.row)
          if (fc < 0 || fr < 0) return
          const p = this.scr(fc + 0.5, fr + 0.5)
          this.previewSprite = this.add
            .image(p.x, p.y, asset)
            .setOrigin(ANCHORS.floor.x / 64, ANCHORS.floor.y / 64)
            .setScale(this.Z)
            .setDepth(9998)
            .setAlpha(0.45)
        } else if (t === 'wallL') {
          const fr = Math.floor(g.row)
          if (fr < 0 || fr >= room.rows) return
          const p = this.scr(0, fr + 0.5)
          this.previewSprite = this.add
            .image(p.x, p.y, asset)
            .setOrigin(ANCHORS.wallL.x / 64, ANCHORS.wallL.y / 64)
            .setScale(this.Z)
            .setDepth(9998)
            .setAlpha(0.45)
        } else if (t === 'wallB') {
          const fc = Math.floor(g.col)
          if (fc < 0 || fc >= room.cols) return
          const p = this.scr(fc + 0.5, 0)
          this.previewSprite = this.add
            .image(p.x, p.y, asset)
            .setOrigin(ANCHORS.wallB.x / 64, ANCHORS.wallB.y / 64)
            .setScale(this.Z)
            .setDepth(9998)
            .setAlpha(0.45)
        } else {
          const s = this.snap(g.col, g.row)
          const p = this.scr(s.col, s.row)
          this.previewSprite = this.add
            .image(p.x, p.y, asset)
            .setOrigin(0.5)
            .setScale(this.Z)
            .setDepth(9998)
            .setAlpha(0.45)
        }
      }

      // --- Incremental floor/wall paint ---
      paintCell(col: number, row: number) {
        if (!this.paintAsset || !this.paintType) return
        const key = `${col},${row}`
        if (this.paintedSprites.has(key)) return // already painted in this stroke

        if (this.paintType === 'floor') {
          const fc = Math.floor(col),
            fr = Math.floor(row)
          if (fc < 0 || fr < 0) return
          // Expand room if needed
          while (fr >= room.rows) {
            room.floor.push(new Array(room.cols).fill(null))
            room.leftWall.push(null)
            room.rows++
          }
          while (fc >= room.cols) {
            room.floor.forEach(r => r.push(null))
            room.backWall.push(null)
            room.cols++
          }
          room.floor[fr][fc] = this.paintAsset
          const p = this.scr(fc + 0.5, fr + 0.5)
          const spr = this.add
            .image(p.x, p.y, this.paintAsset)
            .setOrigin(ANCHORS.floor.x / 64, ANCHORS.floor.y / 64)
            .setScale(this.Z)
            .setDepth(1.5) // slightly above existing floor
          this.paintedSprites.set(`${fc},${fr}`, spr)
        } else if (this.paintType === 'wallL') {
          const fr = Math.floor(row)
          if (fr < 0 || fr >= room.rows) return
          room.leftWall[fr] = this.paintAsset
          const p = this.scr(0, fr + 0.5)
          const spr = this.add
            .image(p.x, p.y, this.paintAsset)
            .setOrigin(ANCHORS.wallL.x / 64, ANCHORS.wallL.y / 64)
            .setScale(this.Z)
            .setDepth(2.5 + fr * 0.01)
          this.paintedSprites.set(`L${fr}`, spr)
        } else if (this.paintType === 'wallB') {
          const fc = Math.floor(col)
          if (fc < 0 || fc >= room.cols) return
          room.backWall[fc] = this.paintAsset
          const p = this.scr(fc + 0.5, 0)
          const spr = this.add
            .image(p.x, p.y, this.paintAsset)
            .setOrigin(ANCHORS.wallB.x / 64, ANCHORS.wallB.y / 64)
            .setScale(this.Z)
            .setDepth(2.5 + fc * 0.01)
          this.paintedSprites.set(`B${fc}`, spr)
        }
      }

      preload() {
        catalogData.forEach(a => this.load.image(a.name, `/game-office/assets/${a.file}`))
      }

      create() {
        this.OX = this.cameras.main.width / 2
        this.OY = 120

        // Save initial state to history
        this.historyStack = [JSON.stringify(room)]
        this.historyIndex = 0

        this.rebuildAll()

        // Auto-save
        this.time.addEvent({
          delay: 30000,
          loop: true,
          callback: () => {
            saveRoom(room, workspaceId, userId)
          },
        })

        // Zoom
        this.input.on('wheel', (_p: unknown, _go: unknown[], dx: number, dy: number) => {
          this.Z = Phaser.Math.Clamp(this.Z + (dy > 0 ? -0.1 : 0.1), 0.3, 3)
          this.rebuildAll()
          this.updatePreview()
        })

        // Pan + place/select
        let panning = false,
          psx = 0,
          psy = 0,
          pox = 0,
          poy = 0
        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          // Dismiss context menu on any click
          if (this.contextMenu) {
            this.hideContextMenu()
            return
          }

          // Middle button = pan
          if (ptr.middleButtonDown()) {
            panning = true
            psx = ptr.x
            psy = ptr.y
            pox = this.panX
            poy = this.panY
            return
          }

          // Right button = context menu or deselect
          if (ptr.rightButtonDown()) {
            if (!editModeRef.current) return
            const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
            const g = this.grd(wp.x, wp.y)
            const s = this.snap(g.col, g.row)

            // Find object under cursor
            let closest: RoomObject | null = null
            let cDist = 0.8
            for (const o of room.objects) {
              const dx = s.col - o.col,
                dy = s.row - o.row
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < cDist) {
                cDist = dist
                closest = o
              }
            }

            if (closest) {
              // P4: Show context menu
              this.selObjId = closest.id
              this.selWall = null
              this.selFloor = null
              this.rebuildAll()
              this.showContextMenu(wp.x, wp.y, closest.id)
            } else {
              // P3: Right-click on empty = deselect
              selectedAssetRef.current = null
              ;(
                (window as unknown as Record<string, unknown>).__gameSetSelectedAsset as (
                  v: string | null
                ) => void
              )?.(null)
              this.selObjId = null
              this.selWall = null
              this.selFloor = null
              this.rebuildAll()
            }
            return
          }

          if (!editModeRef.current) {
            // Browse mode: find clicked object and trigger interaction
            const wp2 = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
            const g2 = this.grd(wp2.x, wp2.y)
            let closest: RoomObject | null = null
            let cDist = 0.8
            for (const o of room.objects) {
              const dx = g2.col - o.col,
                dy = g2.row - o.row
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < cDist) {
                cDist = dist
                closest = o
              }
            }
            if (closest && onInteractRef.current) {
              onInteractRef.current(closest.asset)
            }
            return
          }

          const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
          const g = this.grd(wp.x, wp.y)
          const s = this.snap(g.col, g.row)

          if (selectedAssetRef.current) {
            // Place asset
            const asset = selectedAssetRef.current
            const t = assetType(asset)

            this.pushHistory()

            // If a wall/floor is selected, replace it with new asset of same type
            if (this.selWall && (t === 'wallL' || t === 'wallB')) {
              if (this.selWall.type === 'L' && t === 'wallL')
                room.leftWall[this.selWall.index] = asset
              if (this.selWall.type === 'B' && t === 'wallB')
                room.backWall[this.selWall.index] = asset
              saveRoom(room, workspaceId, userId)
              this.rebuildAll()
              // P3: Keep selection for walls
              return
            }
            if (this.selFloor && t === 'floor') {
              room.floor[this.selFloor.row][this.selFloor.col] = asset
              saveRoom(room, workspaceId, userId)
              this.rebuildAll()
              // P3: Keep selection for floors
              return
            }

            const fc = Math.floor(s.col),
              fr = Math.floor(s.row)
            if (t === 'floor' || t === 'wallL' || t === 'wallB') {
              // P2: Start continuous painting
              if (t === 'floor') {
                while (fr >= room.rows) {
                  room.floor.push(new Array(room.cols).fill(null))
                  room.leftWall.push(null)
                  room.rows++
                }
                while (fc >= room.cols) {
                  room.floor.forEach(row => row.push(null))
                  room.backWall.push(null)
                  room.cols++
                }
                if (fc >= 0 && fr >= 0) room.floor[fr][fc] = asset
              } else if (t === 'wallL') {
                if (s.col < 1.5 && fr >= 0 && fr < room.rows) room.leftWall[fr] = asset
              } else {
                if (s.row < 1.5 && fc >= 0 && fc < room.cols) room.backWall[fc] = asset
              }
              this.isPainting = true
              this.paintType = t
              this.paintAsset = asset
              this.paintedSprites.clear()
              saveRoom(room, workspaceId, userId)
              this.rebuildAll()
              // P3: Keep selection for floor/wall
            } else {
              // Object placement
              const obj: RoomObject = {
                id: room.nextId++,
                asset,
                col: s.col,
                row: s.row,
                offX: 0,
                offY: 0,
                flip: false,
              }
              const m = getMeta(assetMeta, asset)
              if (m.placement === 'surface') {
                const parent = findSurfaceParent(room, assetMeta, s.col, s.row, -1)
                if (parent) {
                  const slotInfo = findBestSlot(room, assetMeta, parent, asset)
                  if (slotInfo) {
                    const pm = getMeta(assetMeta, parent.asset)
                    obj.parentId = parent.id
                    obj.slotIndex = slotInfo.index
                    obj.col = parent.col
                    obj.row = parent.row
                    obj.offX = slotInfo.slot.x
                    obj.offY = (pm.surfaceOffsetY || -30) + (slotInfo.slot.y || 0)
                  }
                }
              }
              if (m.placement === 'carpet') obj.depthOffset = -0.5
              room.objects.push(obj)
              this.selObjId = obj.id
              this.dragging = true
              saveRoom(room, workspaceId, userId)
              this.rebuildAll()
              // P3: Keep selection for objects too (Esc or right-click to deselect)
            }
          } else {
            // No asset selected — select existing elements

            // Check wall tiles
            this.selWall = null
            const fc = Math.floor(s.col),
              fr = Math.floor(s.row)
            if (s.col < 0.8 && fr >= 0 && fr < room.rows && room.leftWall[fr]) {
              this.selWall = { type: 'L', index: fr }
              this.selObjId = null
              this.selFloor = null
              this.rebuildAll()
              return
            }
            if (s.row < 0.8 && fc >= 0 && fc < room.cols && room.backWall[fc]) {
              this.selWall = { type: 'B', index: fc }
              this.selObjId = null
              this.selFloor = null
              this.rebuildAll()
              return
            }

            // Check floor tiles
            if (fc >= 0 && fc < room.cols && fr >= 0 && fr < room.rows && room.floor[fr]?.[fc]) {
              const hasObj = room.objects.some(o => {
                const dx = s.col - o.col,
                  dy = s.row - o.row
                return Math.sqrt(dx * dx + dy * dy) < 0.6
              })
              if (!hasObj) {
                this.selFloor = { row: fr, col: fc }
                this.selObjId = null
                this.selWall = null
                this.rebuildAll()
                return
              }
            }

            // Select existing object — cycle through nearby on re-click
            const nearby: RoomObject[] = []
            for (const o of room.objects) {
              const dx = s.col - o.col,
                dy = s.row - o.row
              if (Math.sqrt(dx * dx + dy * dy) < 0.8) nearby.push(o)
            }
            let found: RoomObject | null = null
            if (nearby.length > 0) {
              const curIdx = nearby.findIndex(o => o.id === this.selObjId)
              if (curIdx >= 0) {
                found = nearby[(curIdx + 1) % nearby.length]
              } else {
                found = nearby.find(o => o.parentId != null) || nearby[0]
              }
            }
            this.selObjId = found ? found.id : null
            this.selWall = null
            this.selFloor = null
            if (found) this.dragging = true
            this.rebuildAll()
          }
        })

        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
          this.lastPtrX = ptr.x
          this.lastPtrY = ptr.y

          if (panning && ptr.isDown) {
            this.panX = pox + (ptr.x - psx)
            this.panY = poy + (ptr.y - psy)
            this.rebuildAll()
            this.updatePreview()
          }
          if (this.dragging && this.selObjId !== null && ptr.isDown) {
            const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
            const g = this.grd(wp.x, wp.y)
            const s = this.snap(g.col, g.row)
            const o = room.objects.find(x => x.id === this.selObjId)
            if (o) {
              if (o.parentId != null) {
                delete o.parentId
                delete o.slotIndex
                o.offX = 0
                o.offY = 0
              }
              o.col = s.col
              o.row = s.row
              room.objects
                .filter(x => x.parentId === o.id)
                .forEach(x => {
                  x.col = s.col
                  x.row = s.row
                })
              this.rebuildAll()
            }
          }

          // P2: Continuous painting
          if (this.isPainting && ptr.isDown && this.paintAsset) {
            const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
            const g = this.grd(wp.x, wp.y)
            this.paintCell(g.col, g.row)
          }

          // P1: Update preview (only when not dragging/panning/painting)
          if (!panning && !this.dragging && !this.isPainting) {
            this.updatePreview()
          }
        })

        this.input.on('pointerup', () => {
          panning = false
          if (this.dragging) {
            this.dragging = false
            // Record move in history
            this.pushHistory()
            saveRoom(room, workspaceId, userId)
          }
          if (this.isPainting) {
            this.isPainting = false
            this.paintType = null
            this.paintAsset = null
            this.paintedSprites.clear()
            saveRoom(room, workspaceId, userId)
            this.rebuildAll() // Full rebuild for consistency
            this.updatePreview()
          }
        })

        this.input.mouse?.disableContextMenu()

        // Keyboard shortcuts
        this.input.keyboard?.on('keydown-DELETE', () => {
          if (!editModeRef.current) return
          this.pushHistory()
          if (this.selFloor) {
            room.floor[this.selFloor.row][this.selFloor.col] = null
            this.selFloor = null
            saveRoom(room, workspaceId, userId)
            this.rebuildAll()
            return
          }
          if (this.selWall) {
            if (this.selWall.type === 'L') room.leftWall[this.selWall.index] = null
            else room.backWall[this.selWall.index] = null
            this.selWall = null
            saveRoom(room, workspaceId, userId)
            this.rebuildAll()
            return
          }
          if (this.selObjId === null) return
          const kids = room.objects.filter(o => o.parentId === this.selObjId)
          const delIds = new Set([this.selObjId, ...kids.map(k => k.id)])
          room.objects = room.objects.filter(o => !delIds.has(o.id))
          this.selObjId = null
          saveRoom(room, workspaceId, userId)
          this.rebuildAll()
        })

        this.input.keyboard?.on('keydown-F', () => {
          if (!editModeRef.current || this.selObjId === null) return
          this.pushHistory()
          const o = room.objects.find(x => x.id === this.selObjId)
          if (o) {
            o.flip = !o.flip
            saveRoom(room, workspaceId, userId)
            this.rebuildAll()
          }
        })

        // P0: Ctrl+Z = undo, Ctrl+Shift+Z = redo
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
          if (!editModeRef.current) return
          if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            if (event.shiftKey) {
              this.redo()
            } else {
              this.undo()
            }
          }
          // P3: Esc to deselect
          if (event.key === 'Escape') {
            selectedAssetRef.current = null
            ;(
              (window as unknown as Record<string, unknown>).__gameSetSelectedAsset as (
                v: string | null
              ) => void
            )?.(null)
            this.selObjId = null
            this.selWall = null
            this.selFloor = null
            this.hideContextMenu()
            this.rebuildAll()
          }
        })

        if (onReady) onReady()
        sceneRef.current = this
      }

      // P5 + P1: Per-frame update for pulsing effects
      update() {
        const now = this.time.now
        // Pulse selection highlight
        if (this.selGfx) {
          this.selGfx.setAlpha(0.4 + 0.4 * Math.sin(now / 300))
        }
        // Pulse preview sprite
        if (this.previewSprite) {
          this.previewSprite.setAlpha(0.3 + 0.3 * Math.sin(now / 200))
        }
      }

      grd(sx: number, sy: number) {
        const rx = sx - this.OX - this.panX,
          ry = sy - this.OY - this.panY
        return {
          col: (rx / (32 * this.Z) + ry / (16 * this.Z)) / 2,
          row: (ry / (16 * this.Z) - rx / (32 * this.Z)) / 2,
        }
      }

      snap(c: number, r: number) {
        return { col: Math.round(c * 2) / 2, row: Math.round(r * 2) / 2 }
      }

      scr(c: number, r: number) {
        return {
          x: this.OX + (c - r) * 32 * this.Z + this.panX,
          y: this.OY + (c + r) * 16 * this.Z + this.panY,
        }
      }

      rebuildAll() {
        this.children.removeAll(true)
        this.selGfx = null
        this.selLabelText = null
        this.previewSprite = null
        // Context menu is managed separately, re-destroyed by removeAll but ref cleared here
        this.contextMenu = null

        const gfx = this.add.graphics().setDepth(0)
        gfx.lineStyle(1, 0xffffff, 0.08)
        for (let r = 0; r <= room.rows; r++) {
          const a = this.scr(0, r),
            b = this.scr(room.cols, r)
          gfx.lineBetween(a.x, a.y, b.x, b.y)
        }
        for (let c = 0; c <= room.cols; c++) {
          const a = this.scr(c, 0),
            b = this.scr(c, room.rows)
          gfx.lineBetween(a.x, a.y, b.x, b.y)
        }

        // Floors
        for (let r = 0; r < room.rows; r++) {
          for (let c = 0; c < room.cols; c++) {
            const tile = room.floor[r]?.[c]
            if (!tile) continue
            const p = this.scr(c + 0.5, r + 0.5)
            try {
              this.add
                .image(p.x, p.y, tile)
                .setOrigin(ANCHORS.floor.x / 64, ANCHORS.floor.y / 64)
                .setScale(this.Z)
                .setDepth(1)
            } catch {
              /* missing texture */
            }
          }
        }

        // Left walls
        room.leftWall.forEach((tile, r) => {
          if (!tile) return
          const p = this.scr(0, r + 0.5)
          try {
            this.add
              .image(p.x, p.y, tile)
              .setOrigin(ANCHORS.wallL.x / 64, ANCHORS.wallL.y / 64)
              .setScale(this.Z)
              .setDepth(2 + r * 0.01)
          } catch {
            /* missing texture */
          }
        })

        // Back walls
        room.backWall.forEach((tile, c) => {
          if (!tile) return
          const p = this.scr(c + 0.5, 0)
          try {
            this.add
              .image(p.x, p.y, tile)
              .setOrigin(ANCHORS.wallB.x / 64, ANCHORS.wallB.y / 64)
              .setScale(this.Z)
              .setDepth(2 + c * 0.01)
          } catch {
            /* missing texture */
          }
        })

        // P5: Floor selection highlight (pulsing)
        if (editModeRef.current && this.selFloor) {
          this.selGfx = this.add.graphics().setDepth(999)
          this.selGfx.lineStyle(2, 0x4ecca3, 1.0)
          const p = this.scr(this.selFloor.col + 0.5, this.selFloor.row + 0.5)
          this.selGfx.strokeRect(p.x - 22 * this.Z, p.y - 12 * this.Z, 44 * this.Z, 24 * this.Z)
        }

        // P5: Wall selection highlight (pulsing)
        if (editModeRef.current && this.selWall) {
          this.selGfx = this.add.graphics().setDepth(999)
          this.selGfx.lineStyle(2, 0x4ecca3, 1.0)
          if (this.selWall.type === 'L') {
            const p = this.scr(0, this.selWall.index + 0.5)
            this.selGfx.strokeRect(p.x - 25 * this.Z, p.y - 25 * this.Z, 50 * this.Z, 50 * this.Z)
          } else {
            const p = this.scr(this.selWall.index + 0.5, 0)
            this.selGfx.strokeRect(p.x - 25 * this.Z, p.y - 25 * this.Z, 50 * this.Z, 50 * this.Z)
          }
        }

        // Objects
        const sorted = [...room.objects].sort((a, b) => {
          const da = a.col + a.row + (a.depthOffset || 0) + (a.parentId ? 0.1 : 0)
          const db = b.col + b.row + (b.depthOffset || 0) + (b.parentId ? 0.1 : 0)
          return da - db
        })
        sorted.forEach(o => {
          try {
            const p = this.scr(o.col, o.row)
            const spr = this.add.image(
              p.x + (o.offX || 0) * this.Z,
              p.y + (o.offY || 0) * this.Z,
              o.asset
            )
            spr
              .setDepth(10 + o.col + o.row + (o.depthOffset || 0) + (o.parentId ? 0.1 : 0))
              .setScale(this.Z)
              .setOrigin(0.5)
            if (o.flip) spr.setFlipX(true)

            // P5: Selection highlight (pulsing green border + name label)
            if (editModeRef.current && o.id === this.selObjId) {
              this.selGfx = this.add.graphics().setDepth(999)
              this.selGfx.lineStyle(2, 0x4ecca3, 1.0)
              const cx = p.x + (o.offX || 0) * this.Z,
                cy = p.y + (o.offY || 0) * this.Z
              this.selGfx.strokeRect(cx - 20 * this.Z, cy - 20 * this.Z, 40 * this.Z, 40 * this.Z)

              // Name label
              this.selLabelText = this.add
                .text(cx, cy + 22 * this.Z, assetLabel(o.asset), {
                  fontSize: '10px',
                  color: '#4ecca3',
                  fontFamily: 'monospace',
                  backgroundColor: '#0f0f1a',
                  padding: { x: 3, y: 1 },
                })
                .setOrigin(0.5, 0)
                .setDepth(1000)
            }
          } catch {
            /* missing texture */
          }
        })
      }
    }

    // Ref for selected asset from React
    const selectedAssetRef = { current: null as string | null }
    ;(window as unknown as Record<string, unknown>).__gameSelectedAsset = selectedAssetRef
    ;(window as unknown as Record<string, unknown>).__gameSetSelectedAsset = setSelectedAsset

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#1a1a2e',
      scene: OfficeScene,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { mouse: { preventDefaultWheel: true } },
      render: { pixelArt: true, antialias: false },
    })
    gameRef.current = game
  }, [onReady])

  // Sync selectedAsset to Phaser ref
  useEffect(() => {
    const ref = (window as unknown as Record<string, unknown>).__gameSelectedAsset as
      | { current: string | null }
      | undefined
    if (ref) ref.current = selectedAsset
  }, [selectedAsset])

  useEffect(() => {
    destroyRef.current = false
    initGame()
    return () => {
      destroyRef.current = true
      if (gameRef.current) {
        ;(gameRef.current as { destroy: (b: boolean) => void }).destroy(true)
        gameRef.current = null
      }
    }
  }, [initGame])

  // Get unique categories
  const categories = ['全部', ...Array.from(new Set(catalog.map(a => a.cat))).sort()]
  const filteredAssets = catalog.filter(a => {
    if (
      searchText &&
      !a.label.toLowerCase().includes(searchText.toLowerCase()) &&
      !a.name.toLowerCase().includes(searchText.toLowerCase())
    )
      return false
    if (a.name.startsWith('Floor_') && !a.name.includes('(64)')) return false
    if (a.name.startsWith('Wall_') && !a.name.includes('(64)')) return false
    if (filterCat === '全部') return true
    if (filterCat === 'floor') return a.name.startsWith('Floor_')
    if (filterCat === 'wallL') return a.name.startsWith('Wall_') && !a.name.endsWith('_L')
    if (filterCat === 'wallB') return a.name.startsWith('Wall_') && a.name.endsWith('_L')
    if (filterCat === 'object') return !a.name.startsWith('Floor_') && !a.name.startsWith('Wall_')
    return a.cat === filterCat
  })

  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Edit mode asset palette */}
      {editMode && (
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-[#0f0f1a]/95 border-l border-[var(--border)] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="text-xs font-bold text-emerald-400 mb-2">
              🎨 {GAME_OFFICE_LABELS.ASSET_PALETTE}
            </div>
            <input
              type="text"
              placeholder={GAME_OFFICE_LABELS.SEARCH_6779}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-morandi-primary border border-[var(--border)] rounded text-white"
            />
          </div>
          {/* Quick filter tabs */}
          <div className="flex gap-1 p-2 border-b border-[var(--border)]">
            {[
              { id: '全部', label: '全部' },
              { id: 'floor', label: '🏠地板' },
              { id: 'wallL', label: '🧱左牆' },
              { id: 'wallB', label: '🧱後牆' },
              { id: 'object', label: '🪑物件' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterCat(t.id)}
                className={`text-[10px] px-2 py-1 rounded font-bold ${filterCat === t.id ? 'bg-emerald-600 text-white' : 'bg-morandi-primary text-muted-foreground hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Sub-categories for objects */}
          {filterCat === 'object' && (
            <div className="flex flex-wrap gap-1 px-2 pb-2 border-b border-[var(--border)]">
              {categories
                .filter(c => c !== '全部' && c !== '🏠 地板/牆壁')
                .map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterCat(c)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${filterCat === c ? 'bg-emerald-600 text-white' : 'bg-morandi-primary text-muted-foreground'}`}
                  >
                    {c.slice(0, 4)}
                  </button>
                ))}
            </div>
          )}
          {/* Asset list */}
          <div className="flex-1 overflow-y-auto p-1">
            {/* Deselect button */}
            {selectedAsset && (
              <button
                onClick={() => setSelectedAsset(null)}
                className="w-full text-xs text-center py-1 mb-1 bg-red-900/30 text-red-400 rounded"
              >
                ✕ {GAME_OFFICE_LABELS.DESELECT_BTN}
              </button>
            )}
            {filteredAssets.map(a => (
              <button
                key={a.name}
                onClick={() => setSelectedAsset(selectedAsset === a.name ? null : a.name)}
                className={`flex items-center gap-2 w-full p-1 rounded text-left text-xs transition-colors ${
                  selectedAsset === a.name
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'hover:bg-morandi-primary text-muted-foreground'
                }`}
              >
                <img
                  src={`/game-office/assets/${a.file}`}
                  alt={a.label}
                  className="w-8 h-8 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div>
                  <div className="truncate" style={{ maxWidth: '150px' }}>
                    {a.label}
                  </div>
                  <div className="text-[10px] text-morandi-secondary">
                    {a.w}×{a.h}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Help */}
          <div className="p-2 border-t border-[var(--border)] text-[10px] text-morandi-secondary">
            {GAME_OFFICE_LABELS.HELP_PLACE}
            <br />
            {GAME_OFFICE_LABELS.HELP_SHORTCUTS}
          </div>
        </div>
      )}
    </div>
  )
}
