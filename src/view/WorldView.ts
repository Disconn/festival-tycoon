import { updateStageBand } from './stageBand'
import { isScenery, isEdgeScenery, scenerySlot, sceneryTransform } from '../game/scenery'
import { createRetroBuilding, batchRetroBuildings } from './retroBuildings'
import { createAttractionAccess } from './attractionAccess'
import type { AccessKind, AccessTheme } from './attractionAccess'
import { bindTouchCamera } from './touchCamera'
import { stageSiteIssue } from '../game/stageSite'
import { createStageModel, animateStageModel, updateStageLightPool } from './stageModel'
import { stagePhase, stageSize, occupiesBuildingCell } from '../game/stageDesign'
import { activeBookings, showIssue } from '../game/festivalManagement'
import { createEarthTexture, createTerrainBase, createTerrainMaterial, createTerrainSurface } from './terrainSurface'
import { TerrainShape, terrainPads } from './terrainShape'
import { FestivalLightsView } from './FestivalLightsView'
import { wayTexture } from './wayTextures'
import type { WayType } from '../game/wayTypes'
import { wayInfo } from '../game/wayTypes'
import { groundRectangle } from '../game/ground'
import { groundInfo } from '../game/ground'
import { SupplyChainView } from './SupplyChainView'
import { scenePixelRatio } from './renderResolution'
import { isTextEntryTarget } from '../uiFocus'
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  GridHelper,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  SpotLight,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { BUILDINGS, WORLD_SIZE } from '../game/catalog'
import type { BuildingKind } from '../game/catalog'
import { SIMULATION_CONFIG } from '../game/simulationConfig'
import { isFestivalOfferActive } from '../game/dayPlan'
import { COASTER_TYPES, computeTrackFrame, sampleCoasterTrack } from '../game/coasters'
import { createBungeeModel, animateBungee, setBungeeJumper } from './bungee'
import { createNudeAnatomy, createPersonGeometry, PersonDetailsView, personSeed, personStyle } from './pixelPeople'
import { createCoasterSpecial } from './coasterSpecials'
import type { Coaster, TrackPoint } from '../game/coasters'
import type { CashEffect, GameSnapshot, PlacedBuilding, Visitor } from '../game/GameState'
import { CampingView } from './CampingView'
import { FireworksView } from './FireworksView'
import { CrowdingView } from './CrowdingView'
import { PanicView } from './PanicView'
import { visitorBubbleKind } from '../game/visitorBubbles'
import { StaffView } from './StaffView'
import { MedicalView } from './MedicalView'
import { IncidentView } from './IncidentView'
import { PathFlowView } from './PathFlowView'
import { AtmosphereView } from './AtmosphereView'
import { ForecourtView } from './ForecourtView'
import {
  disposeChildren,
  disposeObject3D,
} from './disposeObject3D'
import { LogisticsView } from './LogisticsView'
import { zoneCellRange } from '../game/staffZones'
import { WasteView } from './WasteView'
import { PowerView } from './PowerView'
import { LaserView } from './LaserView'
import {
  getTerrainHeight,
  isWaterHeight,
  terrainFingerprint,
  WATER_HEIGHT,
} from '../game/terrain'

export type CellPosition = { x: number; z: number; localX?: number; localZ?: number; buildingId?: string }
export type PathAnchor = CellPosition & { elevation: number }

function stageFocusPoint(stage: PlacedBuilding): { x: number; z: number } {
  const size = stageSize(stage.stageDesign, stage.rotation)
  return { x: stage.x + size.width / 2, z: stage.z + size.depth / 2 }
}

function danceFloorFacing(
  cell: { x: number; z: number },
  concertId: string | null,
  floorStageIds: Map<string, string | undefined>,
  stageFocus: Map<string, { x: number; z: number }>,
): number | null {
  const key = `${cell.x},${cell.z}`
  if (!floorStageIds.has(key) && !concertId) return null
  const stageId = floorStageIds.get(key)
  let focus = stageId ? stageFocus.get(stageId) : undefined
  if (!focus) {
    let nearest = Number.POSITIVE_INFINITY
    for (const candidate of stageFocus.values()) {
      const distance = Math.hypot(cell.x + 0.5 - candidate.x, cell.z + 0.5 - candidate.z)
      if (distance >= nearest) continue
      nearest = distance
      focus = candidate
    }
    if (!focus || nearest > 10) return null
  }
  return Math.atan2(focus.x - (cell.x + 0.5), focus.z - (cell.z + 0.5))
}

type CellHandler = (cell: CellPosition) => void
type HoverHandler = (cell: CellPosition | null) => void
type VisitorHandler = (visitorId: string) => void
type ElevationHandler = (delta: number) => void
type DragEndHandler = () => void
type CoasterPieceHandler = (coasterId: string, pieceIndex: number) => void

export class WorldView {
  private rideGates = new Group()
  private rideGatePreview = Object.assign(new Group(), {visible:false})

  setRideAccessPreview(access: {x:number;y:number;z:number;type:AccessKind;theme?:AccessTheme;valid:boolean;rotation:number} | null): void {
    if (!access) { this.rideGatePreview.visible=false; return }
    const theme = access.theme ?? 'carousel'
    const key = `${theme}:${access.type}`
    if (this.rideGatePreview.userData.modelKey !== key) {
      disposeChildren(this.rideGatePreview)
      this.rideGatePreview.add(createAttractionAccess(access.type, theme, true))
      this.rideGatePreview.userData.modelKey = key
    }
    this.rideGatePreview.visible=true
    this.rideGatePreview.position.set(access.x+.5,access.y,access.z+.5)
    this.rideGatePreview.rotation.y=access.rotation
    this.rideGatePreview.traverse(o=>{if(o instanceof Mesh){const m=o.material as MeshStandardMaterial;m.color.setHex(access.valid ? 0xffffff : 0xe05555)}})
  }
  private bungeeRiders = new Set<string>()
  private bungeeOccupants = new Map<string, string>()
  bungeePreviewHeight: number | null = null
  private canvas: HTMLCanvasElement
  private renderer: WebGLRenderer
  private scene = new Scene()
  private festivalLights = new FestivalLightsView()
  private ambientLight = new AmbientLight(0xffffff, 1.25)
  private sunLight = new DirectionalLight(0xfff1cf, 2.4)
  private nightSkyColor = new Color(0x071326)
  private daySkyColor = new Color(0x9ccbe0)
  private twilightSkyColor = new Color(0xd98262)
  private skyColor = new Color()
  private daylightColor = new Color(0xffffff)
  private nightAmbientColor = new Color(0x8ba6d8)
  private noonSunColor = new Color(0xfff1cf)
  private twilightSunColor = new Color(0xff9b68)
  private camera = new OrthographicCamera()
  private raycaster = new Raycaster()
  private pointer = new Vector2()
  private groundPlane = new Plane(new Vector3(0, 1, 0), 0)
  private worldSize = WORLD_SIZE
  private grid: GridHelper | null = null
  private terrainGroup = new Group()
  private terrainFingerprint = ''
  private groundSurfaceFingerprint = ''
  private terrainSurface: Mesh | null = null
  private terrainSurfaceMaterial = createTerrainMaterial()
  private terrainShape: TerrainShape | null = null
  private actorTerrainHeight = (x: number, z: number, y: number): number => this.terrainShape?.actorHeight(x, z, y) ?? y
  private buildings = new Group()
  private staticBuildingBatches = new Group()
  private treeTrunkGeometry = new CylinderGeometry(0.1, 0.14, 0.8, 8)
  private treeCrownGeometry = new ConeGeometry(0.52, 1.25, 9)
  private treeTrunkMaterial = new MeshStandardMaterial({ color: 0x795437 })
  private treeCrownMaterial = new MeshStandardMaterial({
    color: 0x438344,
    roughness: 0.95,
  })
  private hedgeMaterial = new MeshStandardMaterial({
    color: 0x3f7b42,
    roughness: 1,
  })
  private landMaterial = new MeshStandardMaterial({
    color: 0x887456,
    map: createEarthTexture(),
    side: DoubleSide,
    roughness: 0.95,
  })
  private landMesh: Mesh | null = null
  private waterMesh: InstancedMesh | null = null
  private waterGeometry = new PlaneGeometry(1, 1)
  private waterMaterial = new MeshStandardMaterial({
    color: 0x2f7ca8,
    roughness: 0.18,
    metalness: 0.12,
    transparent: true,
    opacity: 0.72,
  })
  private pathDragGeometry = new BoxGeometry(0.82, 0.1, 0.82)
  private pathDragMaterial = new MeshStandardMaterial({
    color: 0x75e49e,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  })
  private soundWaveGroups: Group[] = []
  private nightLightMaterials: MeshStandardMaterial[] = []
  private nightLightBuildingIds: string[] = []
  private readonly stageLightPool: SpotLight[] = []
  private powerView = new PowerView()
  private laserView = new LaserView()
  private campingView = new CampingView()
  private fireworksView = new FireworksView()
  private crowdingView = new CrowdingView()
  private panicView = new PanicView()
  private staffView = new StaffView()
  private medicalView = new MedicalView()
  private wasteView = new WasteView()
  private incidentView = new IncidentView()
  private pathFlowView = new PathFlowView()
  private attractivenessView = new AtmosphereView(0.3, true)
  private partyMoodView = new AtmosphereView(0.82, false)
  private forecourtView = new ForecourtView()
  private logisticsView = new LogisticsView()
  private supplyChainView = new SupplyChainView()
  private logisticsMode = false
  private previousOverlays = [false, false, false]
  setLogisticsMode(enabled: boolean): void {
    const groups = [this.crowdingView.group, this.attractivenessView.group, this.partyMoodView.group]
    this.panicView.group.visible = !enabled
    if (enabled && !this.logisticsMode) { this.previousOverlays = groups.map(g => g.visible); this.followVisitor(null) }
    if (!enabled && this.logisticsMode) groups.forEach((g, n) => g.visible = this.previousOverlays[n]!)
    this.logisticsMode = enabled
  }
  private visitors = new Group()
  private visitorInstanceIds: string[] = []
  private visitorCapacity = 0
  private visitorBodyInstances: InstancedMesh | null = null
  private visitorFemaleBodyInstances: InstancedMesh | null = null
  private personDetails = new PersonDetailsView()
  private visitorHeadInstances: InstancedMesh | null = null
  private visitorLeftLegInstances: InstancedMesh | null = null
  private visitorRightLegInstances: InstancedMesh | null = null
  private visitorLeftArmInstances: InstancedMesh | null = null
  private visitorRightArmInstances: InstancedMesh | null = null
  private visitorBreastInstances: InstancedMesh | null = null
  private visitorBustInstances: InstancedMesh | null = null
  private visitorPenisInstances: InstancedMesh | null = null
  private visitorPickMeshes: InstancedMesh[] = []
  private visitorPose = new Object3D()
  private visitorLimb = new Object3D()
  private visitorMatrix = new Matrix4()
  private visitorHiddenMatrix = new Matrix4().makeScale(0, 0, 0)
  private visitorColor = new Color()
  private visitorSkinColor = new Color(0xf0bd8c)
  private visitorPantsColor = new Color(0x31445b)
  private visitorPanicTint = new Color(0xc62828)
  private emotionInstances = new Map<string, InstancedMesh>()
  private emotionPose = new Object3D()
  private visitorHandcarts: Group[] = []
  private emotionTextures = new Map<string, CanvasTexture>()
  private cashTextures = new Map<number, CanvasTexture>()
  private visitorBodyGeometry = createPersonGeometry('body')
  private visitorFemaleBodyGeometry = createPersonGeometry('femaleBody')
  private visitorHeadGeometry = createPersonGeometry('head')
  private visitorLegGeometry = createPersonGeometry('leg')
  private visitorArmGeometry = createPersonGeometry('arm')
  private visitorBreastGeometry = createNudeAnatomy('breasts')
  private visitorBustGeometry = createNudeAnatomy('bust')
  private visitorPenisGeometry = createNudeAnatomy('penis')
  private visitorSkinMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
  })
  private visitorLegMaterial = new MeshStandardMaterial({
    color: 0x31445b,
    roughness: 0.9,
  })
  private handcartBodyGeometry = new BoxGeometry(0.25, 0.13, 0.32)
  private handcartGearGeometry = new BoxGeometry(0.19, 0.15, 0.23)
  private handcartWheelGeometry = new CylinderGeometry(0.055, 0.055, 0.035, 8)
  private handcartHandleGeometry = new BoxGeometry(0.025, 0.025, 0.3)
  private handcartBodyMaterial = new MeshStandardMaterial({
    color: 0xb83e35,
    roughness: 0.8,
  })
  private handcartGearMaterial = new MeshStandardMaterial({
    color: 0x4f7c45,
    roughness: 0.95,
  })
  private handcartWheelMaterial = new MeshStandardMaterial({ color: 0x25282c })
  private handcartHandleMaterial = new MeshStandardMaterial({ color: 0x34383d })
  private coasterTracks = new Group()
  private coasterTrains = new Group()
  private coasterPreview = new Group()
  private coasterSelection = new Group()
  private trainModels = new Map<string, Group>()
  private trainVisitorsById = new Map<string, Visitor>()
  private trainForward = new Vector3()
  private trainRight = new Vector3()
  private trainUp = new Vector3()
  private trainRotationMatrix = new Matrix4()
  private cashEffects = new Group()
  private cashEffectModels = new Map<string, Sprite>()
  private preview: Mesh
  private previewArrow: Mesh
  private sceneryPreview = new Group()
  private sceneryPreviewKind = ''
  private placementValidator: ((kind: BuildingKind, x: number, z: number, slot?: number) => boolean) | null = null

  setPlacementValidator(validate: (kind: BuildingKind, x: number, z: number, slot?: number) => boolean): void { this.placementValidator = validate }

  buildingThumbnail(kind: BuildingKind): string {
    const scene = new Scene()
    scene.background = new Color(0x314943)
    const model = this.createBuildingModel(kind, 0)
    scene.add(model, new AmbientLight(0xffffff, 2))
    const light = new DirectionalLight(0xfff0ce, 3)
    light.position.set(-3, 5, 4); scene.add(light)
    const camera = new OrthographicCamera(-.9, .9, .9, -.9, .1, 20)
    camera.position.set(3, 2.8, 4); camera.lookAt(0, .65, 0)
    const target = new WebGLRenderTarget(96, 96)
    target.texture.colorSpace = this.renderer.outputColorSpace
    const shadowUpdate = this.renderer.shadowMap.needsUpdate
    const previousTarget = this.renderer.getRenderTarget()
    const pixels = new Uint8Array(96 * 96 * 4)
    try {
      this.renderer.setRenderTarget(target)
      this.renderer.render(scene, camera)
      this.renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels)
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96
      const context = canvas.getContext('2d')!
      const data = context.createImageData(96, 96)
      for (let y = 0; y < 96; y++) data.data.set(pixels.subarray((95 - y) * 384, (96 - y) * 384), y * 384)
      context.putImageData(data, 0, 0)
      return canvas.toDataURL()
    } finally {
      this.renderer.setRenderTarget(previousTarget)
      this.renderer.shadowMap.needsUpdate = shadowUpdate
      target.dispose(); disposeObject3D(model, false)
    }
  }
  private constructionAnchor: Mesh
  private constructionNext: Mesh
  private constructionSlope: Mesh
  private pathDragPreview = new Group()
  private groundAreaHandler: ((from: CellPosition, to: CellPosition, preview: boolean) => void) | null = null
  private groundAreaStart: CellPosition | null = null
  private groundAreaEndKey = ''
  private groundAreaCancelled = false
  setGroundAreaTool(handler: ((from: CellPosition, to: CellPosition, preview: boolean) => void) | null): void {
    this.groundAreaHandler = handler
    this.groundAreaStart = null
    this.groundAreaEndKey = ''
    this.setPathDragPreview([], 0)
  }
  private updateGroundAreaPreview(): void {
    const from = this.groundAreaStart, to = this.hoveredCell
    if (!from || !to || !this.currentSnapshot) return
    const key = `${to.x},${to.z}`
    if (key === this.groundAreaEndKey) return
    this.groundAreaEndKey = key
    this.setPathDragPreview(groundRectangle(this.currentSnapshot, from, to), 0)
    this.groundAreaHandler?.(from, to, true)
  }
  private onCellClick: CellHandler
  private onCellHover: HoverHandler
  private onStaffClick: VisitorHandler = () => {}
  private followedStaffId: string | null = null
  private minimapStaffId: string | null = null
  private minimapCanvas: HTMLCanvasElement | null = null
  private minimapRenderer: WebGLRenderer | null = null
  private minimapCamera: OrthographicCamera | null = null
  private minimapViewHeight = 7
  private workAreaOverlay: InstancedMesh | null = null
  private workAreaStamp = ''
  private workZonesOverlay: InstancedMesh | null = null
  private workZonesStamp = ''
  private staffPlacementHandler: ((cell: CellPosition) => void) | null = null
  private staffPlacementPreview: Mesh | null = null
  private staffPlacementColor = 0x5ad4e5
  private onVisitorClick: VisitorHandler
  private onCellPaint: CellHandler
  private onElevationChange: ElevationHandler
  private onPathPaintStart: CellHandler
  private onPathPaintEnd: DragEndHandler
  private onCoasterPieceRightClick: CoasterPieceHandler
  private currentSnapshot: Readonly<GameSnapshot> | null = null
  private previousShowTime = 0
  private currentShowTime = 0
  private renderAlpha = 1
  private interpolatedTick = -1
  private previousVisitorPositions = new Map<string, { x: number; y: number; z: number }>()
  private currentVisitorPositions = new Map<string, { x: number; y: number; z: number }>()
  private visitorSeedCache = new Map<string, number>()
  private prevTrainDistance = new Map<string, number>()
  private currTrainDistance = new Map<string, number>()
  private buildingFingerprint = ''
  private lastGroundRevision = -1
  private cachedFootwayFingerprint = ''
  private coasterFingerprint = ''
  private wasteBins: PlacedBuilding[] = []
  private lastDayMinute = Number.NEGATIVE_INFINITY
  private lastPowerKey = ''
  private hoveredCell: CellPosition | null = null
  private cameraTarget = new Vector3(0, 0, 0)
  private cameraAngle = Math.PI / 4
  private cameraDistance = 24
  private zoom = 1
  private followedVisitorId: string | null = null
  private dragging = false
  private dragButton = -1
  private lastPointer = new Vector2()
  private pointerDown = new Vector2()
  private leftPointerDown = false
  private painting = false
  private pointerDownCell: CellPosition | null = null
  private sceneryDragLock: { slot: number; rotation: number } | null = null
  private lastPaintCell: CellPosition | null = null
  private constructionActive = false

  constructor(
    canvas: HTMLCanvasElement,
    onCellClick: CellHandler,
    onCellHover: HoverHandler,
    onVisitorClick: VisitorHandler,
    onCellPaint: CellHandler,
    onElevationChange: ElevationHandler,
    onPathPaintStart: CellHandler,
    onPathPaintEnd: DragEndHandler,
    onCoasterPieceRightClick: CoasterPieceHandler,
  ) {
    this.canvas = canvas
    this.onCellClick = onCellClick
    this.onCellHover = onCellHover
    this.onVisitorClick = onVisitorClick
    this.onCellPaint = onCellPaint
    this.onElevationChange = onElevationChange
    this.onPathPaintStart = onPathPaintStart
    this.onPathPaintEnd = onPathPaintEnd
    this.onCoasterPieceRightClick = onCoasterPieceRightClick
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    })
    // A restrained pixel grid at every display density, with a smaller GPU budget.
    this.renderer.setPixelRatio(scenePixelRatio(canvas.clientWidth, canvas.clientHeight))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.sortObjects = false
    this.renderer.debug.checkShaderErrors = false
    this.markSharedResources()
    this.scene.background = this.skyColor.copy(this.daySkyColor)

    const previewMaterial = new MeshStandardMaterial({
      color: 0x55dd88,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    this.preview = new Mesh(new BoxGeometry(0.94, 0.12, 0.94), previewMaterial)
    this.previewArrow = new Mesh(new ConeGeometry(0.13, 0.32, 3), previewMaterial)
    this.constructionAnchor = new Mesh(
      new BoxGeometry(0.72, 0.18, 0.72),
      new MeshStandardMaterial({ color: 0x38c6ef, transparent: true, opacity: 0.72 }),
    )
    this.constructionNext = new Mesh(
      new BoxGeometry(0.78, 0.2, 0.78),
      new MeshStandardMaterial({ color: 0xffc34a, transparent: true, opacity: 0.72 }),
    )
    this.constructionSlope = new Mesh(
      new BoxGeometry(0.78, 0.1, Math.sqrt(2)),
      new MeshStandardMaterial({
        color: 0xffc34a,
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      }),
    )
    this.preview.visible = false
    this.previewArrow.visible = false
    this.constructionAnchor.visible = false
    this.constructionNext.visible = false
    this.constructionSlope.visible = false
    this.scene.add(
      this.rideGates,
      this.rideGatePreview,
      this.preview,
      this.previewArrow,
      this.sceneryPreview,
      this.constructionAnchor,
      this.constructionNext,
      this.constructionSlope,
      this.pathDragPreview,
      this.campingView.group,
      this.fireworksView.group,
      this.crowdingView.group,
      this.panicView.group,
      this.medicalView.group,
      this.wasteView.group,
      this.pathFlowView.group,
      this.incidentView.group,
      this.staffView.group,
      this.forecourtView.group,
      this.attractivenessView.group,
      this.partyMoodView.group,
      this.logisticsView.group,
      this.supplyChainView.group,
      this.powerView.group,
      this.laserView.group,
      this.terrainGroup,
      this.festivalLights.group,
      this.buildings,
      this.visitors,
      this.coasterTracks,
      this.coasterTrains,
      this.coasterPreview,
      this.coasterSelection,
      this.cashEffects,
    )

    this.createWorld()
    this.bindEvents()
    this.resize()
    this.updateCamera()
  }

  private lastVisualSnapshot: Readonly<GameSnapshot> | null = null
  private lastVisualRevision = ''

  update(snapshot: Readonly<GameSnapshot>, renderAlpha = 1, worldRevision?: number): void {
    const revision = `${snapshot.simTick}:${worldRevision}:${snapshot.selectedTool}:${this.logisticsMode}:${this.crowdingView.group.visible}:${this.attractivenessView.group.visible}:${this.partyMoodView.group.visible}`
    const dataChanged = worldRevision === undefined || snapshot !== this.lastVisualSnapshot || revision !== this.lastVisualRevision
    this.lastVisualSnapshot = snapshot
    this.lastVisualRevision = revision
    if (dataChanged && (worldRevision === undefined || worldRevision !== this.lastGroundRevision)) {
      this.lastGroundRevision = worldRevision ?? this.lastGroundRevision
      this.cachedFootwayFingerprint = JSON.stringify(Object.entries(snapshot.festival.infrastructure.ground).filter(([, g]) => g.footway).map(([k, g]) => [k, g.footway]))
      this.groundSurfaceFingerprint = JSON.stringify(Object.entries(snapshot.festival.infrastructure.ground).filter(([, g]) => g.compacted || g.surface).map(([k, g]) => [k, g.compacted, g.surface]))
    }
    const fingerprint = dataChanged ? this.buildingFingerprintOf(snapshot.buildings) + this.cachedFootwayFingerprint : this.buildingFingerprint

    this.currentSnapshot = snapshot
    this.syncInterpolation(snapshot, renderAlpha)
    this.syncWorldSize(snapshot.scenario?.worldSize ?? WORLD_SIZE)
    if (dataChanged) this.rebuildTerrainIfNeeded(snapshot)
    if (this.grid) {
      this.grid.visible =
        snapshot.selectedTool !== 'inspect' &&
        snapshot.selectedTool !== 'bulldoze'
    }
    if (dataChanged) this.festivalLights.update(snapshot)
    this.festivalLights.setFocus(this.cameraTarget)
    const cursorCell = this.hoveredCell
    this.festivalLights.updateCursor(cursorCell ? new Vector3(cursorCell.x + (cursorCell.localX ?? .5), this.terrainShape?.sample(cursorCell.x + (cursorCell.localX ?? .5), cursorCell.z + (cursorCell.localZ ?? .5)) ?? 0, cursorCell.z + (cursorCell.localZ ?? .5)) : null)
    if (fingerprint !== this.buildingFingerprint) {
      this.buildingFingerprint = fingerprint
      this.rebuildBuildings(snapshot.buildings)
      this.wasteBins = snapshot.buildings.filter(
        (building) => building.kind === 'wasteBin',
      )
      this.lastPowerKey = ''
      this.renderer.shadowMap.needsUpdate = true
    }
    this.updateDayNight(snapshot)
    const stageBookings = new Map(activeBookings(snapshot).map(b=>[b.stageId,b]))
    for (const model of this.buildings.children) {
      if(!model.userData.isStage)continue
      const design = model.userData.stageDesign
      const booking = stageBookings.get(model.userData.buildingId)
      const active = snapshot.power.poweredBuildingIds.includes(model.userData.buildingId) && (snapshot.festival.enabled ? !!booking && !showIssue(snapshot,booking) : this.isShowPerforming(snapshot))
      const progress = booking ? (snapshot.minute-booking.start)/booking.duration : (snapshot.minute%120)/120
      const showTime=this.previousShowTime+(this.currentShowTime-this.previousShowTime)*this.renderAlpha
      if(design)animateStageModel(model as Group,stagePhase(design,progress),showTime,active)
      updateStageBand(model as Group,booking?.bandId,showTime,active,design)
    }
    updateStageLightPool(
      this.buildings.children.filter(m=>m.userData.stageDesign) as Group[],
      this.stageLightPool,
    )
    if (dataChanged) this.campingView.update(snapshot)
    if (dataChanged) this.medicalView.update(snapshot)
    if (dataChanged) this.wasteView.update(snapshot.wasteDumpCells ?? [], this.wasteBins)
    if (dataChanged) this.pathFlowView.update(snapshot.buildings)
    this.incidentView.update(snapshot.incidents)
    this.staffView.update(snapshot.staff, this.renderAlpha, snapshot.simTick, this.actorTerrainHeight)
    if (dataChanged) this.forecourtView.update(snapshot.stageForecourtCells)
    if (dataChanged) this.attractivenessView.update(snapshot.attractiveness)
    if (dataChanged) this.partyMoodView.update(snapshot.partyMood)
    this.logisticsView.update(snapshot.logistics, (x, z) =>
      getTerrainHeight(snapshot.terrain, x, z),
      (x, z) => { const g = groundInfo(snapshot, x, z); if (g.roadway) return wayInfo(snapshot, x, z, 'road').color; return !this.logisticsMode ? 0x50555a : g.surface === 'paved' ? 0x50555a : g.surface === 'gravel' ? 0x8f948b : 0x8b7551 },
      (x, z) => snapshot.festival.infrastructure.ground[`${x},${z}`]?.roadway,
      snapshot.speed === 0,
    )
    const showPower =
      snapshot.selectedTool === 'powerCable' ||
      snapshot.selectedTool === 'generator' ||
      snapshot.selectedTool === 'backupGenerator'
    this.powerView.setVisible(showPower)
    if (dataChanged) this.powerView.update(snapshot.power, snapshot.terrain)
    this.laserView.update(snapshot, this.isShowPerforming(snapshot))
    const coasterFingerprint = dataChanged ? snapshot.coasters
      .map(
        (coaster) =>
          `${coaster.id}:${coaster.pieces.map((piece) => piece.id).join(',')}:${coaster.entrance ? `${coaster.entrance.x},${coaster.entrance.y},${coaster.entrance.z}` : '-'}:${coaster.exit ? `${coaster.exit.x},${coaster.exit.y},${coaster.exit.z}` : '-'}`,
      )
      .join('|') : this.coasterFingerprint
    if (coasterFingerprint !== this.coasterFingerprint) {
      this.coasterFingerprint = coasterFingerprint
      this.rebuildCoasters(snapshot.coasters)
    }
    this.updateCoasterTrains(snapshot.coasters, snapshot.visitors)
    if (dataChanged) {
      this.bungeeOccupants.clear()
      for (const b of snapshot.buildings) if (b.rideType === 'bungee' && b.bungeeVisitorId) this.bungeeOccupants.set(b.id, b.bungeeVisitorId)
    }
    this.bungeeRiders.clear()
    for (const model of this.buildings.children) if (model.userData.bungee) {
      const rider = this.trainVisitorsById.get(this.bungeeOccupants.get(model.userData.buildingId) ?? '')
      const active = rider?.state === 'using' && rider.targetId === model.userData.buildingId
      if (active) this.bungeeRiders.add(rider.id)
      setBungeeJumper(model as Group, active ? rider : null)
      animateBungee(model as Group, active && !this.logisticsMode ? 1 - rider.interactionRemaining / SIMULATION_CONFIG.needs.interactionMinutes.ride : null)
    }
    if (dataChanged) this.supplyChainView.update(snapshot, this.logisticsMode, this.terrainShape ?? undefined)
    this.supplyChainView.animate(snapshot.speed === 0, undefined, this.actorTerrainHeight)
    this.visitors.visible = !this.logisticsMode
    this.staffView.group.visible = !this.logisticsMode
    this.coasterTrains.visible = !this.logisticsMode
    this.cashEffects.visible = !this.logisticsMode
    if (!this.logisticsMode) { this.updateVisitors(snapshot.visitors); this.updateVisitorFollow(snapshot.visitors) }
    if(this.followedStaffId) {
      const position=this.resolveStaffPosition(this.followedStaffId,snapshot)
      if(position) {this.cameraTarget.set(position.x,position.y,position.z);this.updateCamera()}
      else this.followedStaffId=null
    }
    if(this.minimapStaffId) {
      const position=this.resolveStaffPosition(this.minimapStaffId,snapshot)
      if(position) this.renderMinimap(position.x,position.z)
    }
    this.updateCashEffects(snapshot.cashEffects)
    this.updateSoundWaves(
      isFestivalOfferActive(
        snapshot.dayPlan,
        'stages',
        snapshot.minute,
        snapshot.day,
      ),
    )
    this.fireworksView.update(snapshot.fireworkEffects)
    if (dataChanged) this.crowdingView.update(snapshot.crowding)
    this.panicView.update(snapshot.visitors, snapshot.crowding)
    if (this.logisticsMode) {
      this.crowdingView.group.visible = false
      this.attractivenessView.group.visible = false
      this.partyMoodView.group.visible = false
      this.panicView.group.visible = false
    }
    this.updatePreview()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  private syncInterpolation(
    snapshot: Readonly<GameSnapshot>,
    renderAlpha: number,
  ): void {
    this.renderAlpha = snapshot.speed === 0 ? 1 : renderAlpha
    if (snapshot.simTick === this.interpolatedTick) return
    const nextShowTime=(snapshot.day*1440+snapshot.minute)*2
    this.previousShowTime=this.currentShowTime&&Math.abs(nextShowTime-this.currentShowTime)<20?this.currentShowTime:nextShowTime
    this.currentShowTime=nextShowTime
    this.previousVisitorPositions = this.currentVisitorPositions
    this.currentVisitorPositions = new Map(snapshot.visitors.map(visitor => [
      visitor.id, { x: visitor.x, y: visitor.y, z: visitor.z },
    ]))
    this.prevTrainDistance = this.currTrainDistance
    this.currTrainDistance = new Map(
      snapshot.coasters.map((coaster) => [coaster.id, coaster.train.distance]),
    )
    this.interpolatedTick = snapshot.simTick
  }

  private interpolatedTrainDistance(coaster: Coaster): number {
    const current = this.currTrainDistance.get(coaster.id) ?? coaster.train.distance
    const previous = this.prevTrainDistance.get(coaster.id)
    if (previous === undefined || Math.abs(current - previous) > 6) {
      return current
    }
    return previous + (current - previous) * this.renderAlpha
  }

  invalidate(): void {
    this.terrainFingerprint = ''
    this.buildingFingerprint = ''
    this.coasterFingerprint = ''
    this.lastGroundRevision = -1
    this.cachedFootwayFingerprint = ''
    this.interpolatedTick = -1
    this.previousVisitorPositions.clear()
    this.currentVisitorPositions.clear()
    this.visitorSeedCache.clear()
    this.prevTrainDistance.clear()
    this.currTrainDistance.clear()
    this.lastDayMinute = Number.NEGATIVE_INFINITY
    this.lastPowerKey = ''
    this.wasteBins = []
    this.renderer.shadowMap.needsUpdate = true
    this.campingView.invalidate()
    this.medicalView.invalidate()
    this.wasteView.invalidate()
    this.pathFlowView.invalidate()
    this.incidentView.invalidate()
    this.staffView.invalidate()
    this.forecourtView.invalidate()
    this.logisticsView.invalidate()
    this.powerView.invalidate()
    this.laserView.invalidate()
  }

  private markSharedResources(): void {
    const shared = [
      this.treeTrunkGeometry,
      this.treeCrownGeometry,
      this.treeTrunkMaterial,
      this.treeCrownMaterial,
      this.hedgeMaterial,
      this.landMaterial,
      this.waterGeometry,
      this.waterMaterial,
      this.pathDragGeometry,
      this.pathDragMaterial,
      this.visitorBodyGeometry,
      this.visitorFemaleBodyGeometry,
      this.visitorHeadGeometry,
      this.visitorLegGeometry,
      this.visitorArmGeometry,
      this.visitorBreastGeometry,
      this.visitorBustGeometry,
      this.visitorPenisGeometry,
      this.visitorSkinMaterial,
      this.visitorLegMaterial,
      this.handcartBodyGeometry,
      this.handcartGearGeometry,
      this.handcartWheelGeometry,
      this.handcartHandleGeometry,
      this.handcartBodyMaterial,
      this.handcartGearMaterial,
      this.handcartWheelMaterial,
      this.handcartHandleMaterial,
    ]
    shared.forEach((resource) => {
      resource.userData.shared = true
    })
  }

  rotate(direction: number): void {
    this.cameraAngle += direction * (Math.PI / 2)
    this.updateCamera()
  }

  setCrowdingOverlayVisible(visible: boolean): void {
    this.crowdingView.setVisible(visible)
  }

  setAttractivenessOverlayVisible(visible: boolean): void {
    this.attractivenessView.setVisible(visible)
  }

  setPartyMoodOverlayVisible(visible: boolean): void {
    this.partyMoodView.setVisible(visible)
  }

  showStaffArea(area: {minX:number;maxX:number;minZ:number;maxZ:number} | null): void {
    const stamp = JSON.stringify(area)
    if(stamp===this.workAreaStamp) return
    this.workAreaStamp=stamp
    if(this.workAreaOverlay) {this.scene.remove(this.workAreaOverlay);this.workAreaOverlay.geometry.dispose();(this.workAreaOverlay.material as MeshBasicMaterial).dispose();this.workAreaOverlay.dispose();this.workAreaOverlay=null}
    if(!area || !this.currentSnapshot) return
    const count=(area.maxX-area.minX+1)*(area.maxZ-area.minZ+1)
    const mesh=new InstancedMesh(new PlaneGeometry(.94,.94),new MeshBasicMaterial({color:0x5ad4e5,transparent:true,opacity:.25,depthWrite:false}),count)
    const pose=new Object3D();pose.rotation.x=-Math.PI/2
    let index=0
    for(let z=area.minZ;z<=area.maxZ;z++) for(let x=area.minX;x<=area.maxX;x++) {pose.position.set(x+.5,getTerrainHeight(this.currentSnapshot.terrain,x,z)+.17,z+.5);pose.updateMatrix();mesh.setMatrixAt(index++,pose.matrix)}
    mesh.frustumCulled=false;this.scene.add(mesh);this.workAreaOverlay=mesh
  }

  showStaffZones(zones: string[] | null): void {
    const stamp = JSON.stringify(zones)
    if(stamp===this.workZonesStamp) return
    this.workZonesStamp=stamp
    if(this.workZonesOverlay) {this.scene.remove(this.workZonesOverlay);this.workZonesOverlay.geometry.dispose();(this.workZonesOverlay.material as MeshBasicMaterial).dispose();this.workZonesOverlay.dispose();this.workZonesOverlay=null}
    if(!zones?.length || !this.currentSnapshot) return
    const half=this.worldSize/2
    const cells:Array<{x:number;z:number}>=[]
    for(const key of zones) {
      const area=zoneCellRange(key)
      for(let z=Math.max(-half,area.minZ);z<=Math.min(half-1,area.maxZ);z++) for(let x=Math.max(-half,area.minX);x<=Math.min(half-1,area.maxX);x++) cells.push({x,z})
    }
    if(!cells.length) return
    const mesh=new InstancedMesh(new PlaneGeometry(.94,.94),new MeshBasicMaterial({color:0x5ad4e5,transparent:true,opacity:.25,depthWrite:false}),cells.length)
    const pose=new Object3D();pose.rotation.x=-Math.PI/2
    cells.forEach((cell,index)=>{pose.position.set(cell.x+.5,getTerrainHeight(this.currentSnapshot!.terrain,cell.x,cell.z)+.17,cell.z+.5);pose.updateMatrix();mesh.setMatrixAt(index,pose.matrix)})
    mesh.frustumCulled=false;this.scene.add(mesh);this.workZonesOverlay=mesh
  }

  setStaffPlacementTool(handler: ((cell: CellPosition) => void) | null, color = 0x5ad4e5): void {
    this.staffPlacementHandler = handler
    this.staffPlacementColor = color
    if (!handler) this.updateStaffPlacementPreview(null)
  }

  private updateStaffPlacementPreview(cell: CellPosition | null): void {
    if (!cell || !this.currentSnapshot) {
      if (this.staffPlacementPreview) this.staffPlacementPreview.visible = false
      return
    }
    if (!this.staffPlacementPreview) {
      const mesh = new Mesh(
        new BoxGeometry(0.8, 0.2, 0.8),
        new MeshBasicMaterial({ color: this.staffPlacementColor, transparent: true, opacity: 0.55, depthWrite: false }),
      )
      this.scene.add(mesh)
      this.staffPlacementPreview = mesh
    }
    const mesh = this.staffPlacementPreview
    ;(mesh.material as MeshBasicMaterial).color.set(this.staffPlacementColor)
    mesh.visible = true
    mesh.position.set(cell.x + 0.5, getTerrainHeight(this.currentSnapshot.terrain, cell.x, cell.z) + 0.4, cell.z + 0.5)
  }

  setStaffClickHandler(handler: VisitorHandler): void { this.onStaffClick = handler }
  followStaff(id: string | null): void { this.followedStaffId = id; if(id) this.followedVisitorId = null }

  private resolveStaffPosition(id: string, snapshot: Readonly<GameSnapshot>): { x: number; y: number; z: number } | null {
    const carrier = snapshot.festival.infrastructure.routes.find((r) => r.id === id)
    return (
      snapshot.staff.find((p) => p.id === id) ??
      this.supplyChainView.getCarrierPosition(id) ??
      (carrier ? { x: carrier.position.x + 0.5, y: carrier.position.elevation, z: carrier.position.z + 0.5 } : null)
    )
  }

  mountMinimap(canvas: HTMLCanvasElement): void {
    this.minimapCanvas = canvas
    this.minimapRenderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.minimapRenderer.shadowMap.enabled = false
    this.minimapCamera = new OrthographicCamera()
  }

  setMinimapTarget(id: string | null): void { this.minimapStaffId = id }

  zoomMinimap(factor: number): void {
    this.minimapViewHeight = MathUtils.clamp(this.minimapViewHeight * factor, 2.5, 16)
  }

  private renderMinimap(x: number, z: number): void {
    const canvas = this.minimapCanvas
    const renderer = this.minimapRenderer
    const camera = this.minimapCamera
    if (!canvas || !renderer || !camera) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
    }
    const aspect = width / height
    const viewHeight = this.minimapViewHeight
    camera.left = (-viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.near = 0.1
    camera.far = 100
    const horizontalDistance = 24
    camera.position.set(x + Math.sin(this.cameraAngle) * horizontalDistance, 20, z + Math.cos(this.cameraAngle) * horizontalDistance)
    camera.lookAt(x, 0, z)
    camera.updateProjectionMatrix()
    renderer.render(this.scene, camera)
  }

  followVisitor(visitorId: string | null): void {
    if (visitorId) this.followedStaffId = null
    this.followedVisitorId = visitorId
    if (!visitorId || !this.currentSnapshot) return
    this.updateVisitorFollow(this.currentSnapshot.visitors, true)
  }

  setPathConstructionPreview(
    active: boolean,
    anchor: PathAnchor | null,
    direction: number,
    slope: number,
  ): void {
    this.constructionActive = active
    this.constructionAnchor.visible = active && Boolean(anchor)
    this.constructionNext.visible = active && Boolean(anchor)
    this.constructionSlope.visible = active && Boolean(anchor) && slope !== 0
    if (!active || !anchor) return

    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]
    const offset = directions[direction] ?? directions[0]
    if (!offset) return
    this.constructionAnchor.position.set(anchor.x + 0.5, anchor.elevation + 0.1, anchor.z + 0.5)
    this.constructionNext.position.set(
      anchor.x + offset.x + 0.5,
      anchor.elevation + slope + 0.1,
      anchor.z + offset.z + 0.5,
    )
    if (slope !== 0) {
      const rampCenter = new Vector3(
        anchor.x + offset.x + 0.5,
        anchor.elevation + slope / 2 + 0.08,
        anchor.z + offset.z + 0.5,
      )
      const rampDirection = new Vector3(offset.x, slope, offset.z)
      this.constructionSlope.position.copy(rampCenter)
      this.constructionSlope.quaternion.setFromUnitVectors(
        new Vector3(0, 0, 1),
        rampDirection.normalize(),
      )
    }
    this.updatePreview()
  }

  setPathDragPreview(cells: readonly CellPosition[], elevation: number): void {
    disposeChildren(this.pathDragPreview)
    const bulldozing = this.currentSnapshot?.selectedTool === 'bulldoze'
    this.pathDragMaterial.color.set(bulldozing ? 0xe85a4f : 0x75e49e)
    this.pathDragMaterial.opacity = bulldozing ? 0.7 : 0.62
    cells.forEach((cell) => {
      const tile = new Mesh(this.pathDragGeometry, this.pathDragMaterial)
      const ground = getTerrainHeight(this.currentSnapshot?.terrain, cell.x, cell.z)
      tile.position.set(cell.x + 0.5, ground + elevation + 0.12, cell.z + 0.5)
      this.pathDragPreview.add(tile)
    })
  }

  setCoasterConstructionPreview(points: readonly TrackPoint[]): void {
    disposeChildren(this.coasterPreview)
    if (points.length < 2) return
    const material = new MeshStandardMaterial({
      color: 0x65e6ee,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
    ;[-0.15, 0.15].forEach((offset) => {
      const railPoints = points.map((point, index) => {
        const previous = points[Math.max(0, index - 1)] ?? point
        const next = points[Math.min(points.length - 1, index + 1)] ?? point
        const frame = computeTrackFrame(
          {
            x: next.x - previous.x,
            y: next.y - previous.y,
            z: next.z - previous.z,
          },
          point.bank ?? 0,
          point.pitch ?? 0,
          point.frameHeading,
        )
        return new Vector3(
          point.x + 0.5 + frame.right.x * offset,
          point.y + 0.25 + frame.right.y * offset,
          point.z + 0.5 + frame.right.z * offset,
        )
      })
      this.coasterPreview.add(
        new Mesh(
          new TubeGeometry(
            new CatmullRomCurve3(railPoints),
            Math.max(4, points.length * 3),
            0.05,
            6,
            false,
          ),
          material,
        ),
      )
    })
    const startMarker = new Mesh(
      new BoxGeometry(0.86, 0.1, 0.86),
      new MeshStandardMaterial({
        color: 0x65e6ee,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    )
    const start = points[0]!
    startMarker.position.set(start.x + 0.5, start.y + 0.08, start.z + 0.5)
    this.coasterPreview.add(startMarker)
  }

  setCoasterTrackSelection(
    points: readonly { x: number; y: number; z: number }[],
  ): void {
    disposeChildren(this.coasterSelection)
    if (points.length < 2) return
    const curve = new CatmullRomCurve3(
      points.map((point) => new Vector3(point.x + 0.5, point.y + 0.27, point.z + 0.5)),
    )
    const marker = new Mesh(
      new TubeGeometry(curve, Math.max(4, points.length * 3), 0.105, 7, false),
      new MeshStandardMaterial({
        color: 0xff4fc3,
        emissive: 0x5d123e,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    )
    this.coasterSelection.add(marker)
  }

  private syncWorldSize(size: number): void {
    if (size === this.worldSize && this.grid) return
    this.rebuildGround(size)
    this.terrainFingerprint = ''
  }

  private rebuildGround(size: number): void {
    if (this.grid) {
      this.scene.remove(this.grid)
      disposeObject3D(this.grid)
      this.grid = null
    }
    this.worldSize = size
    const grid = new GridHelper(size, size, 0x416c38, 0x5c8d4b)
    grid.position.y = 0.012
    grid.visible = false
    this.grid = grid
    this.scene.add(grid)
  }

  private rebuildTerrainIfNeeded(snapshot: Readonly<GameSnapshot>): void {
    // Moisture changes a material uniform, never rebuilds thousands of terrain cells.
    this.terrainSurfaceMaterial.color.setScalar(1 - Math.max(0, Math.min(100, snapshot.festival.wetness)) * .0015)
    const pads = terrainPads(snapshot)
    const fingerprint = `${this.worldSize}:${snapshot.scenario.environment}:${terrainFingerprint(snapshot.terrain)}:${this.groundSurfaceFingerprint}:${[...pads].sort().join('|')}`
    if (fingerprint === this.terrainFingerprint && this.landMesh) {
      return
    }
    this.terrainFingerprint = fingerprint
    this.terrainShape = new TerrainShape(snapshot, pads)
    this.buildingFingerprint = '' // Scenery on neighboring slopes follows the rebuilt surface.
    this.rebuildTerrain(snapshot)
  }

  private rebuildTerrain(snapshot: Readonly<GameSnapshot>): void {
    const size = this.worldSize
    const half = size / 2
    const waterCells: Array<{ x: number; z: number }> = []
    for (let z = -half; z < half; z += 1) {
      for (let x = -half; x < half; x += 1) {
        const height = getTerrainHeight(snapshot.terrain, x, z)
        if (isWaterHeight(height)) waterCells.push({ x, z })
      }
    }
    const shape = this.terrainShape!
    if (this.landMesh) { this.terrainGroup.remove(this.landMesh); this.landMesh.geometry.dispose() }
    this.landMaterial.color.setHex(snapshot.scenario.environment === 'desert' ? 0xb69b6e : snapshot.scenario.environment === 'urban' ? 0x818177 : 0x887456)
    this.landMesh = createTerrainBase(shape, this.landMaterial)
    this.terrainGroup.add(this.landMesh)
    this.syncWaterMesh(waterCells)
    if (this.terrainSurface) {
      this.terrainGroup.remove(this.terrainSurface)
      this.terrainSurface.geometry.dispose()
    }
    this.terrainSurface = createTerrainSurface(snapshot, this.terrainSurfaceMaterial, shape)
    this.terrainGroup.add(this.terrainSurface)
  }

  private syncWaterMesh(waterCells: readonly { x: number; z: number }[]): void {
    if (waterCells.length === 0) {
      if (this.waterMesh) this.waterMesh.count = 0
      return
    }
    let water = this.waterMesh
    if (!water || water.instanceMatrix.count < waterCells.length) {
      if (water) this.terrainGroup.remove(water)
      water = new InstancedMesh(
        this.waterGeometry,
        this.waterMaterial,
        Math.max(16, waterCells.length),
      )
      water.frustumCulled = false
      this.waterMesh = water
      this.terrainGroup.add(water)
    }
    const waterMatrix = new Matrix4()
    waterCells.forEach((cell, waterIndex) => {
      waterMatrix.makeRotationX(-Math.PI / 2)
      waterMatrix.setPosition(
        cell.x + 0.5,
        WATER_HEIGHT + 0.08,
        cell.z + 0.5,
      )
      water.setMatrixAt(waterIndex, waterMatrix)
    })
    water.count = waterCells.length
    water.instanceMatrix.needsUpdate = true
  }

  private createWorld(): void {
    this.rebuildGround(this.worldSize)

    this.sunLight.position.set(-12, 22, 8)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.set(1024, 1024)
    this.sunLight.shadow.camera.left = -18
    this.sunLight.shadow.camera.right = 18
    this.sunLight.shadow.camera.top = 18
    this.sunLight.shadow.camera.bottom = -18
    this.scene.add(this.ambientLight, this.sunLight)
    for(let n=0;n<6;n++){const light=new SpotLight(0xffffff,0,12,.21,.45,1);light.castShadow=false;this.stageLightPool.push(light);this.scene.add(light,light.target)}
  }

  private buildingFingerprintOf(items: readonly PlacedBuilding[]): string {
    let hash = items.length + 1
    for (const item of items) {
      hash = Math.imul(hash, 33) + item.x + item.z * 4096
      hash = Math.imul(hash, 33) + Math.round(item.elevation * 8)
      hash = Math.imul(hash, 33) + item.rotation
      hash = Math.imul(hash, 33) + (item.decorationSlot ?? -1)
      hash = Math.imul(hash, 33) + (item.bungeeHeight ?? 0)
      for (const gate of [item.rideEntrance,item.rideExit]) {
        hash=Math.imul(hash,33)+(gate ? 1 : 0)
        if (gate) {hash=Math.imul(hash,33)+gate.x;hash=Math.imul(hash,33)+gate.z;hash=Math.imul(hash,33)+gate.y}
      }
      hash = Math.imul(hash, 33) + (item.pathSlope ?? 0) + 4
      hash = Math.imul(hash, 33) + (item.queueDirection ?? 0)
      hash = Math.imul(hash, 33) + (item.queueEntryDirection ?? 0)
      hash = Math.imul(hash, 33) + (item.pathType === 'queue' ? 3 : 1)
      hash = Math.imul(hash, 33) + (item.wayType ? [...item.wayType].reduce((n, c) => n + c.charCodeAt(0), 0) : 0)
      if (item.stageDesign) for (const c of JSON.stringify(item.stageDesign)) hash = Math.imul(hash,33) + c.charCodeAt(0)
      hash = Math.imul(hash, 33) + item.kind.length + item.kind.charCodeAt(0)
    }
    return `${items.length}:${hash}`
  }

  private rebuildBuildings(items: readonly PlacedBuilding[]): void {
    disposeChildren(this.rideGates)
    for (const item of items) if (item.kind==='ride') for (const type of ['entrance','exit'] as const) {
      const access=item[type==='entrance'?'rideEntrance':'rideExit']
      if (!access) continue
      const gate=this.createCoasterAccess(access,type,item.rideType==='bungee'?'bungee':'carousel')
      gate.rotation.y=Math.atan2(item.x-access.x,item.z-access.z)
      gate.userData.buildingId=item.id
      this.rideGates.add(gate)
    }
    this.rideGates.add(batchRetroBuildings(this.rideGates))
    disposeChildren(this.buildings)
    this.soundWaveGroups = []
    this.nightLightMaterials = []
    this.nightLightBuildingIds = []
    items.forEach((item) => {
      if (
        item.kind === 'ambulanceGarage' ||
        item.kind === 'busDepot' ||
        item.kind === 'wasteDepot' ||
        item.kind === 'busStop'
      ) {
        return
      }
      const model = item.rideType === 'bungee' ? createBungeeModel(item.bungeeHeight ?? 20) : item.stageDesign
        ? createStageModel(item.stageDesign)
        : this.createBuildingModel(
        item.kind,
        item.elevation,
        item.pathType,
        item.pathSlope,
        item.kind === 'path' ? wayInfo(this.currentSnapshot!, item.x, item.z, 'foot', item.wayType).color : undefined,
        item.wayType ?? this.currentSnapshot?.festival.infrastructure.ground[`${item.x},${item.z}`]?.footway,
      )
      if (item.stageDesign) { model.scale.set((stageSize(item.stageDesign).width-.04)/item.stageDesign.width, item.stageDesign.tileWidth ? .5 : .96/Math.max(item.stageDesign.width,item.stageDesign.depth), (stageSize(item.stageDesign).depth-.04)/item.stageDesign.depth); model.userData.stageDesign = item.stageDesign }
      model.position.set(item.x + stageSize(item.stageDesign,item.rotation).width/2, item.elevation, item.z + stageSize(item.stageDesign,item.rotation).depth/2)
      const modelDirection =
        item.kind === 'path'
          ? item.pathSlope
            ? item.pathSlopeDirection ?? 0
            : 0
          : item.rotation
      model.rotation.y = modelDirection * (Math.PI / 2)
      if (item.decorationSlot !== undefined && isScenery(item.kind)) {
        const placement = sceneryTransform(item)
        model.position.set(item.x + placement.x, item.elevation, item.z + placement.z)
        model.rotation.y = placement.rotation * Math.PI / 2
        model.scale.set(placement.sx, placement.sy, placement.sz)
      }
      if (isScenery(item.kind) && this.terrainShape && this.currentSnapshot) {
        model.position.y += this.terrainShape.sample(model.position.x, model.position.z) - getTerrainHeight(this.currentSnapshot.terrain, item.x, item.z)
      }
      if (item.kind === 'path' && item.pathType === 'queue') {
        this.addQueueBarriers(model, item, items)
      }
      model.userData.isStage = item.kind === 'stage'
      model.userData.buildingId = item.id
      const soundWaves = model.userData.soundWaves as Group | undefined
      if (soundWaves) this.soundWaveGroups.push(soundWaves)
      const nightLightMaterial = model.userData
        .nightLightMaterial as MeshStandardMaterial | undefined
      if (nightLightMaterial) {
        this.nightLightMaterials.push(nightLightMaterial)
        this.nightLightBuildingIds.push(item.id)
      }
      this.buildings.add(model)
    })
    this.staticBuildingBatches = batchRetroBuildings(this.buildings)
    this.buildings.add(this.staticBuildingBatches)
  }

  private createBuildingModel(
    kind: BuildingKind,
    elevation: number,
    pathType: 'normal' | 'queue' = 'normal',
    pathSlope: -1 | 0 | 1 = 0,
    surfaceColor?: number,
    wayType?: WayType,
  ): Group {
    const detailed = createRetroBuilding(kind)
    if (detailed) {
      this.addSupport(detailed, elevation, .24)
      return detailed
    }
    const group = new Group()
    const definition = BUILDINGS[kind]
    const material = new MeshStandardMaterial({ color: surfaceColor ?? definition.color, roughness: 0.7 })
    const darkMaterial = new MeshStandardMaterial({
      color: new Color(definition.color).multiplyScalar(0.7),
      roughness: 0.75,
    })

    if (kind === 'path') {
      const pathMaterial =
        pathType === 'queue'
          ? new MeshStandardMaterial({ color: 0x4f8870, roughness: 0.8 })
          : material
      pathMaterial.map = wayTexture(wayType)
      const surface = new Group()
      const pathLength = pathSlope === 0 ? 0.94 : Math.sqrt(2)
      const path = new Mesh(new BoxGeometry(0.94, 0.08, pathLength), pathMaterial)
      path.position.y = 0.04
      path.receiveShadow = true
      surface.add(path)
      if (pathSlope !== 0) {
        surface.position.set(0, -pathSlope / 2, 0)
        surface.quaternion.setFromUnitVectors(
          new Vector3(0, 0, 1),
          new Vector3(0, pathSlope, 1).normalize(),
        )
      }
      group.add(surface)
      this.addSupport(group, elevation, 0.16)
      return group
    }

    if (kind === 'tree') {
      const trunk = new Mesh(this.treeTrunkGeometry, this.treeTrunkMaterial)
      const crown = new Mesh(this.treeCrownGeometry, this.treeCrownMaterial)
      trunk.position.y = 0.4
      crown.position.y = 1.22
      group.add(trunk, crown)
    } else if (kind === 'hedge') {
      const hedge = new Mesh(
        new BoxGeometry(0.88, 0.52, 0.32),
        this.hedgeMaterial,
      )
      hedge.position.y = 0.26
      group.add(hedge)
    } else if (kind === 'fence') {
      const fence = new Group()
      const metal = new MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.55 })
      const orange = new MeshStandardMaterial({ color: 0xe67a22, roughness: 0.7 })
      const white = new MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.65 })
      ;[-0.4, 0.4].forEach((x) => {
        const post = new Mesh(new BoxGeometry(0.055, 1.08, 0.055), metal)
        post.position.set(x, 0.54, 0)
        fence.add(post)
      })
      ;[0.18, 0.4, 0.62, 0.84].forEach((y, index) => {
        const slat = new Mesh(
          new BoxGeometry(0.86, 0.16, 0.03),
          index % 2 === 0 ? orange : white,
        )
        slat.position.set(0, y, 0)
        fence.add(slat)
      })
      const foot = new Mesh(new BoxGeometry(0.9, 0.06, 0.08), metal)
      foot.position.y = 0.03
      fence.add(foot)
      fence.position.z = 0.42
      group.add(fence)
    } else if (kind === 'wasteBin') {
      const can = new Mesh(
        new CylinderGeometry(0.11, 0.13, 0.38, 10),
        new MeshStandardMaterial({ color: 0x3f4a3a, roughness: 0.7 }),
      )
      const rim = new Mesh(
        new CylinderGeometry(0.13, 0.13, 0.04, 10),
        new MeshStandardMaterial({ color: 0x2a3226, roughness: 0.6 }),
      )
      can.position.y = 0.22
      rim.position.y = 0.42
      group.add(can, rim)
    } else if (kind === 'bench') {
      const bench = new Group()
      const wood = new MeshStandardMaterial({ color: 0x98643c, roughness: 0.85 })
      const seat = new Mesh(new BoxGeometry(0.62, 0.07, 0.2), wood)
      const back = new Mesh(new BoxGeometry(0.62, 0.26, 0.06), wood)
      const legs = new Mesh(new BoxGeometry(0.5, 0.22, 0.06), darkMaterial)
      seat.position.y = 0.28
      back.position.set(0, 0.42, -0.1)
      legs.position.y = 0.13
      bench.position.z = 0.34
      bench.add(seat, back, legs)
      group.add(bench)
    } else if (kind === 'lighting') {
      const pole = new Mesh(new CylinderGeometry(0.035, 0.055, 1.45, 8), darkMaterial)
      const lampMaterial = new MeshStandardMaterial({
        color: 0xffe79a,
        emissive: 0x9a761d,
        emissiveIntensity: 0.2,
      })
      const lamp = new Mesh(
        new SphereGeometry(0.16, 10, 8),
        lampMaterial,
      )
      pole.position.y = 0.72
      lamp.position.y = 1.5
      group.add(pole, lamp)
      group.userData.nightLightMaterial = lampMaterial
    } else if (kind === 'generator' || kind === 'backupGenerator') {
      const body = new Mesh(
        new BoxGeometry(0.72, 0.42, 0.52),
        new MeshStandardMaterial({ color: kind === 'generator' ? 0xd4a017 : 0x8a7020 }),
      )
      const tank = new Mesh(
        new CylinderGeometry(0.16, 0.16, 0.38, 10),
        darkMaterial,
      )
      body.position.y = 0.24
      tank.position.set(0.28, 0.28, 0)
      tank.rotation.z = Math.PI / 2
      group.add(body, tank)
    } else if (kind === 'foh') {
      const desk = new Mesh(new BoxGeometry(0.82, 0.28, 0.48), darkMaterial)
      const canopy = new Mesh(new BoxGeometry(0.9, 0.06, 0.7), material)
      desk.position.y = 0.42
      canopy.position.y = 1.12
      group.add(desk, canopy)
    } else if (kind === 'delayTower') {
      const mast = new Mesh(new CylinderGeometry(0.05, 0.08, 2.1, 8), darkMaterial)
      const stack = new Mesh(new BoxGeometry(0.42, 0.7, 0.28), material)
      mast.position.y = 1.05
      stack.position.set(0, 1.55, 0.08)
      group.add(mast, stack)
    } else if (kind === 'videoWall') {
      const frame = new Mesh(new BoxGeometry(0.92, 1.55, 0.12), darkMaterial)
      const screen = new Mesh(
        new BoxGeometry(0.82, 1.28, 0.04),
        new MeshStandardMaterial({
          color: 0x4aa3ff,
          emissive: 0x1a4d8f,
          emissiveIntensity: 0.7,
        }),
      )
      frame.position.y = 0.9
      screen.position.set(0, 0.9, 0.06)
      group.add(frame, screen)
    } else if (kind === 'laserShow') {
      const base = new Mesh(new CylinderGeometry(0.22, 0.28, 0.22, 10), darkMaterial)
      const head = new Mesh(
        new SphereGeometry(0.16, 10, 8),
        new MeshStandardMaterial({
          color: 0x2ee6a6,
          emissive: 0x0b5c44,
          emissiveIntensity: 0.8,
        }),
      )
      base.position.y = 0.12
      head.position.y = 0.42
      group.add(base, head)
    } else if (kind === 'fireworkBattery') {
      const crate = new Mesh(new BoxGeometry(0.7, 0.28, 0.48), material)
      crate.position.y = 0.16
      group.add(crate)
      ;[-0.16, 0, 0.16].forEach((x) => {
        const tube = new Mesh(new CylinderGeometry(0.05, 0.05, 0.42, 8), darkMaterial)
        tube.position.set(x, 0.45, 0)
        group.add(tube)
      })
    } else if (kind === 'stage') {
      const platform = new Mesh(new BoxGeometry(0.94, 0.28, 0.82), darkMaterial)
      const backdrop = new Mesh(new BoxGeometry(0.94, 1.55, 0.12), material)
      platform.position.y = 0.14
      backdrop.position.set(0, 1.02, -0.35)
      group.add(platform, backdrop)
    } else if (kind === 'directionalSpeaker' || kind === 'omniSpeaker') {
      const stand = new Mesh(
        new CylinderGeometry(0.035, 0.06, 0.72, 7),
        darkMaterial,
      )
      stand.position.y = 0.36
      group.add(stand)
      const angles = kind === 'omniSpeaker' ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : [0]
      angles.forEach((angle) => {
        const speaker = new Mesh(
          new BoxGeometry(0.28, 0.42, 0.22),
          new MeshStandardMaterial({ color: 0x24262c, roughness: 0.7 }),
        )
        speaker.position.set(Math.sin(angle) * 0.16, 0.9, Math.cos(angle) * 0.16)
        speaker.rotation.y = angle
        group.add(speaker)
      })
      const soundWaves = this.createSoundWaves(kind === 'omniSpeaker')
      group.add(soundWaves)
      group.userData.soundWaves = soundWaves
    } else if (kind === 'securityGate') {
      const postGeometry = new BoxGeometry(0.12, 1.05, 0.12)
      const left = new Mesh(postGeometry, darkMaterial)
      const right = new Mesh(postGeometry, darkMaterial)
      const top = new Mesh(new BoxGeometry(0.88, 0.14, 0.14), material)
      const scanner = new Mesh(
        new BoxGeometry(0.58, 0.08, 0.08),
        new MeshStandardMaterial({ color: 0x63d6e8, emissive: 0x184b58 }),
      )
      left.position.set(-0.38, 0.53, 0)
      right.position.set(0.38, 0.53, 0)
      top.position.y = 1.03
      scanner.position.set(0, 0.62, 0)
      group.add(left, right, top, scanner)
    } else if (kind === 'ride') {
      const base = new Mesh(new CylinderGeometry(0.43, 0.48, 0.16, 16), darkMaterial)
      const roof = new Mesh(new CylinderGeometry(0.06, 0.48, 0.28, 12), material)
      const mast = new Mesh(new CylinderGeometry(0.045, 0.06, 1.1, 8), darkMaterial)
      base.position.y = 0.08
      mast.position.y = 0.65
      roof.position.y = 1.18
      group.add(base, mast, roof)
    } else {
      const body = new Mesh(new BoxGeometry(0.76, 0.72, 0.76), material)
      const roof = new Mesh(new BoxGeometry(0.9, 0.14, 0.9), darkMaterial)
      body.position.y = 0.36
      roof.position.y = 0.79
      group.add(body, roof)

      if (kind === 'food' || kind === 'alcohol') {
        const counter = new Mesh(
          new BoxGeometry(0.58, 0.22, 0.12),
          new MeshStandardMaterial({ color: 0xfff4d6 }),
        )
        counter.position.set(0, 0.35, 0.43)
        group.add(counter)
      }
      if (kind === 'alcohol') {
        const keg = new Mesh(
          new CylinderGeometry(0.16, 0.16, 0.3, 10),
          new MeshStandardMaterial({ color: 0x8a5b32, roughness: 0.85 }),
        )
        const cup = new Mesh(
          new CylinderGeometry(0.055, 0.045, 0.15, 8),
          new MeshStandardMaterial({
            color: 0xf2c14e,
            transparent: true,
            opacity: 0.85,
          }),
        )
        keg.rotation.z = Math.PI / 2
        keg.position.set(-0.18, 0.58, 0.28)
        cup.position.set(0.2, 0.57, 0.34)
        group.add(keg, cup)
      }
    }

    if (['food', 'toilet', 'ride', 'alcohol', 'securityGate'].includes(kind)) {
      const arrow = new Mesh(
        new ConeGeometry(0.13, 0.32, 3),
        new MeshStandardMaterial({ color: 0xffe052, emissive: 0x6b5200 }),
      )
      arrow.position.set(0, 0.32, 0.62)
      arrow.rotation.x = Math.PI / 2
      group.add(arrow)
    }
    this.addSupport(group, elevation, 0.24)

    group.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    return group
  }

  private createSoundWaves(omnidirectional: boolean): Group {
    const group = new Group()
    group.position.y = 0.92
    group.userData.omnidirectional = omnidirectional
    const segmentCount = omnidirectional ? 48 : 20
    const startAngle = omnidirectional ? 0 : -Math.PI / 3
    const endAngle = omnidirectional ? Math.PI * 2 : Math.PI / 3
    const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
      const angle =
        startAngle + ((endAngle - startAngle) * index) / segmentCount
      return new Vector3(Math.sin(angle), 0, Math.cos(angle))
    })
    for (let index = 0; index < 3; index += 1) {
      const material = new LineBasicMaterial({
        color: omnidirectional ? 0xbc7cff : 0x6fe4ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const wave = new Line(new BufferGeometry().setFromPoints(points), material)
      wave.userData.phaseOffset = index / 3
      wave.renderOrder = 8
      group.add(wave)
    }
    return group
  }

  private updateSoundWaves(active: boolean): void {
    if (!active && this.soundWaveGroups.every((group) => !group.visible)) return
    const time = performance.now() * 0.00055
    this.soundWaveGroups.forEach((group) => {
      group.visible = active
      if (!active) return
      const maximumScale = group.userData.omnidirectional ? 1.8 : 2.25
      group.children.forEach((child) => {
        if (!(child instanceof Line)) return
        const phase = (time + Number(child.userData.phaseOffset ?? 0)) % 1
        const scale = 0.18 + phase * maximumScale
        child.scale.set(scale, scale, scale)
        child.position.y = Math.sin(phase * Math.PI) * 0.045
        ;(child.material as LineBasicMaterial).opacity =
          Math.sin(phase * Math.PI) * 0.58
      })
    })
  }

  private updateDayNight(snapshot: Readonly<GameSnapshot>): void {
    const minute = Math.floor(snapshot.minute)
    const powerKey = `${snapshot.power.poweredBuildingIds.join(',')}:${snapshot.power.supply}`
    if (minute === this.lastDayMinute && powerKey === this.lastPowerKey) return
    this.lastDayMinute = minute
    this.lastPowerKey = powerKey
    const config = SIMULATION_CONFIG.dayNight
    const dayLength = SIMULATION_CONFIG.time.minutesPerDay
    const normalizedMinute = ((minute % dayLength) + dayLength) % dayLength
    const dayDuration = config.sunsetMinute - config.sunriseMinute
    const sunProgress = MathUtils.clamp(
      (normalizedMinute - config.sunriseMinute) / dayDuration,
      0,
      1,
    )
    const sunAngle = sunProgress * Math.PI
    let daylight = 0
    if (
      normalizedMinute >= config.sunriseMinute &&
      normalizedMinute <= config.sunsetMinute
    ) {
      daylight = 0.35 + Math.sin(sunAngle) * 0.65
    } else if (
      normalizedMinute >= config.sunriseMinute - config.twilightMinutes &&
      normalizedMinute < config.sunriseMinute
    ) {
      daylight =
        ((normalizedMinute -
          (config.sunriseMinute - config.twilightMinutes)) /
          config.twilightMinutes) *
        0.35
    } else if (
      normalizedMinute > config.sunsetMinute &&
      normalizedMinute <= config.sunsetMinute + config.twilightMinutes
    ) {
      daylight =
        (1 -
          (normalizedMinute - config.sunsetMinute) /
            config.twilightMinutes) *
        0.35
    }
    const twilightGlow =
      daylight > 0 && daylight < 0.55
        ? 1 - Math.min(1, Math.abs(daylight - 0.28) / 0.28)
        : 0
    this.skyColor
      .copy(this.nightSkyColor)
      .lerp(this.daySkyColor, daylight)
      .lerp(this.twilightSkyColor, twilightGlow * 0.38)
    this.scene.background = this.skyColor
    this.ambientLight.intensity =
      config.minimumAmbientIntensity +
      daylight *
        (config.maximumAmbientIntensity - config.minimumAmbientIntensity)
    this.ambientLight.color
      .copy(this.nightAmbientColor)
      .lerp(this.daylightColor, daylight)
    const sunHeight = Math.max(0, Math.sin(sunAngle))
    this.sunLight.intensity = config.maximumSunIntensity * sunHeight
    this.sunLight.position.set(
      Math.cos(sunAngle) * 24,
      Math.max(0.5, sunHeight * 28),
      10,
    )
    this.sunLight.color
      .copy(this.twilightSunColor)
      .lerp(this.noonSunColor, Math.min(1, daylight * 1.5))
    const powered = new Set(snapshot.power.poweredBuildingIds)
    const lightsActive = isFestivalOfferActive(
      snapshot.dayPlan,
      'lights',
      snapshot.minute,
      snapshot.day,
    )
    this.nightLightMaterials.forEach((material, index) => {
      const hasPower = powered.has(this.nightLightBuildingIds[index] ?? '')
      material.emissiveIntensity =
        lightsActive && hasPower
          ? 0.15 + (1 - daylight) * config.nightLightEmissiveIntensity
          : 0.03
    })
  }

  private isShowPerforming(snapshot: Readonly<GameSnapshot>): boolean {
    if (
      !isFestivalOfferActive(
        snapshot.dayPlan,
        'stages',
        snapshot.minute,
        snapshot.day,
      )
    ) {
      return false
    }
    const performance = SIMULATION_CONFIG.atmosphere.stagePerformanceMinutes
    const cycle =
      performance + SIMULATION_CONFIG.atmosphere.stageBreakMinutes
    return snapshot.minute % cycle < performance
  }

  private addSupport(group: Group, elevation: number, radius: number): void {
    if (elevation <= 0) return
    const geometry = new CylinderGeometry(radius * 0.45, radius * 0.55, elevation, 6)
    const material = new MeshStandardMaterial({ color: 0x59665f, roughness: 0.9 })
    const offset = 0.34
    ;[
      [-offset, -offset],
      [offset, -offset],
      [-offset, offset],
      [offset, offset],
    ].forEach(([x, z]) => {
      const support = new Mesh(geometry, material)
      support.position.set(x ?? 0, -elevation / 2, z ?? 0)
      support.castShadow = true
      group.add(support)
    })
  }

  private addQueueBarriers(
    group: Group,
    path: PlacedBuilding,
    items: readonly PlacedBuilding[],
  ): void {
    const material = new MeshStandardMaterial({ color: 0xe8ddbd, roughness: 0.75 })
    const arrowMaterial = new MeshStandardMaterial({
      color: 0xffdc58,
      emissive: 0x4b3a00,
    })

    if (path.pathSlope) {
      const rails = new Group()
      const length = Math.sqrt(2) - 0.1
      const left = new Mesh(new BoxGeometry(0.055, 0.18, length), material)
      const right = left.clone()
      left.position.set(-0.42, 0.16, 0)
      right.position.set(0.42, 0.16, 0)
      rails.position.set(0, -path.pathSlope / 2, 0)
      rails.quaternion.setFromUnitVectors(
        new Vector3(0, 0, 1),
        new Vector3(0, path.pathSlope, 1).normalize(),
      )
      group.add(rails)
      rails.add(left, right)
    } else {
      const openings = new Set<number>()
      if (path.queueDirection !== undefined) openings.add(path.queueDirection)
      const incomingQueuePaths = items.filter((candidate) => {
        if (
          candidate.kind !== 'path' ||
          candidate.pathType !== 'queue' ||
          candidate.elevation !== path.elevation ||
          Math.abs(candidate.x - path.x) + Math.abs(candidate.z - path.z) !== 1
        ) {
          return false
        }
        const towardPath = this.getGridDirection(path.x - candidate.x, path.z - candidate.z)
        return candidate.queueDirection === towardPath
      })
      incomingQueuePaths.forEach((candidate) => {
        openings.add(this.getGridDirection(candidate.x - path.x, candidate.z - path.z))
      })
      if (path.queueEntryDirection !== undefined) {
        openings.add((path.queueEntryDirection + 2) % 4)
      }

      for (let direction = 0; direction < 4; direction += 1) {
        if (openings.has(direction)) continue
        const alongX = direction === 0 || direction === 2
        const wall = new Mesh(
          new BoxGeometry(alongX ? 0.88 : 0.055, 0.18, alongX ? 0.055 : 0.88),
          material,
        )
        wall.position.set(
          direction === 1 ? 0.44 : direction === 3 ? -0.44 : 0,
          0.16,
          direction === 0 ? 0.44 : direction === 2 ? -0.44 : 0,
        )
        group.add(wall)
      }
    }

    if (path.queueDirection !== undefined) {
      const arrow = new Mesh(new ConeGeometry(0.09, 0.24, 3), arrowMaterial)
      arrow.position.y = path.pathSlope ? -path.pathSlope / 2 + 0.15 : 0.12
      arrow.rotation.set(
        Math.PI / 2,
        ((path.queueDirection - (path.pathSlopeDirection ?? 0) + 4) % 4) *
          (Math.PI / 2),
        0,
      )
      group.add(arrow)
    }
  }

  private getGridDirection(deltaX: number, deltaZ: number): number {
    if (deltaZ > 0) return 0
    if (deltaX > 0) return 1
    if (deltaZ < 0) return 2
    return 3
  }

  private rebuildCoasters(coasters: readonly Coaster[]): void {
    disposeChildren(this.coasterTracks)
    const trackHeightsByCell = new Map<string, number[]>()
    coasters.forEach((coaster) => {
      coaster.pieces.forEach((piece) => {
        piece.points.forEach((point) => {
          const key = `${Math.round(point.x)}:${Math.round(point.z)}`
          const heights = trackHeightsByCell.get(key) ?? []
          heights.push(point.y)
          trackHeightsByCell.set(key, heights)
        })
      })
    })
    coasters.forEach((coaster) => {
      const type = COASTER_TYPES[coaster.typeId]
      const coasterGroup = new Group()
      coasterGroup.userData.coasterId = coaster.id
      coaster.pieces.forEach((piece, pieceIndex) => {
        const special = createCoasterSpecial(piece)
        if (special) { special.userData.coasterId = coaster.id; special.userData.pieceIndex = pieceIndex; coasterGroup.add(special) }
        const centerPoints = piece.points.map(
          (point) => new Vector3(point.x + 0.5, point.y + 0.24, point.z + 0.5),
        )
        const frames = piece.points.map((point, index) => {
          const previous = piece.points[Math.max(0, index - 1)] ?? point
          const next = piece.points[Math.min(piece.points.length - 1, index + 1)] ?? point
          return computeTrackFrame(
            {
              x: next.x - previous.x,
              y: next.y - previous.y,
              z: next.z - previous.z,
            },
            point.bank ?? 0,
            point.pitch ?? 0,
            point.frameHeading,
          )
        })
        const railMaterial = new MeshStandardMaterial({
          color: piece.chainLift || piece.kind === 'station' ? 0xe8a735 : type.railColor,
          metalness: 0.45,
          roughness: 0.45,
        })
        ;[-0.15, 0.15].forEach((offset) => {
          const railPoints = centerPoints.map((point, index) => {
            const right = frames[index]?.right ?? { x: 1, y: 0, z: 0 }
            return point
              .clone()
              .add(new Vector3(right.x, right.y, right.z).multiplyScalar(offset))
          })
          const rail = new Mesh(
            new TubeGeometry(
              new CatmullRomCurve3(railPoints),
              Math.max(4, railPoints.length * 3),
              0.035,
              6,
              false,
            ),
            railMaterial,
          )
          rail.castShadow = true
          rail.userData.coasterId = coaster.id
          rail.userData.pieceIndex = pieceIndex
          coasterGroup.add(rail)
        })
        centerPoints
          .filter((_, index) => index % 2 === 0)
          .forEach((point, sleeperIndex) => {
            const frame = frames[sleeperIndex * 2]
            if (!frame) return
            const forwardPoint =
              piece.points[Math.min(piece.points.length - 1, sleeperIndex * 2 + 1)] ??
              piece.points[sleeperIndex * 2]
            const currentPoint = piece.points[sleeperIndex * 2]
            if (!forwardPoint || !currentPoint) return
            const forward = new Vector3(
              forwardPoint.x - currentPoint.x,
              forwardPoint.y - currentPoint.y,
              forwardPoint.z - currentPoint.z,
            ).normalize()
            const sleeper = new Mesh(
              new BoxGeometry(0.4, 0.035, 0.055),
              new MeshStandardMaterial({ color: type.color, roughness: 0.65 }),
            )
            sleeper.position.copy(point)
            sleeper.quaternion.setFromRotationMatrix(
              new Matrix4().makeBasis(
                new Vector3(frame.right.x, frame.right.y, frame.right.z),
                new Vector3(frame.up.x, frame.up.y, frame.up.z),
                forward,
              ),
            )
            sleeper.userData.coasterId = coaster.id
            sleeper.userData.pieceIndex = pieceIndex
            coasterGroup.add(sleeper)
          })

        if (piece.kind === 'station') {
          const platform = new Mesh(
            new BoxGeometry(0.94, 0.14, 0.94),
            new MeshStandardMaterial({ color: 0x59666c, roughness: 0.8 }),
          )
          platform.position.set(
            piece.start.x + 0.5,
            piece.start.elevation + 0.07,
            piece.start.z + 0.5,
          )
          platform.receiveShadow = true
          platform.userData.coasterId = coaster.id
          platform.userData.pieceIndex = pieceIndex
          coasterGroup.add(platform)
        }

        centerPoints
          .filter((_, index) => index % 4 === 0)
          .forEach((point, supportIndex) => {
            if (point.y <= 0.3) return
            const source = piece.points[supportIndex * 4]
            const cellKey = `${Math.round(source?.x ?? point.x - 0.5)}:${Math.round(source?.z ?? point.z - 0.5)}`
            const lowerTrack = (trackHeightsByCell.get(cellKey) ?? []).some(
              (height) => height < point.y - 0.45 && height > 0.15,
            )
            if (lowerTrack) return
            const support = new Mesh(
              new CylinderGeometry(0.035, 0.055, point.y - 0.18, 6),
              new MeshStandardMaterial({ color: type.color, roughness: 0.7 }),
            )
            support.position.set(point.x, (point.y - 0.18) / 2, point.z)
            coasterGroup.add(support)
          })
      })

      for (const kind of ['entrance', 'exit'] as const) {
        const access = coaster[kind]
        if (!access) continue
        const gate = this.createCoasterAccess(access, kind, 'coaster')
        const station = coaster.pieces.find(piece => piece.kind === 'station'
          && Math.abs(piece.start.x - access.x) + Math.abs(piece.start.z - access.z) === 1
          && Math.abs(piece.start.elevation - access.y) < .01)
        if (station) gate.rotation.y = Math.atan2(station.start.x - access.x, station.start.z - access.z)
        gate.userData.coasterId = coaster.id
        coasterGroup.add(gate)
      }
      this.coasterTracks.add(coasterGroup)
    })
  }

  private createCoasterAccess(
    access: { x: number; y: number; z: number },
    kind: AccessKind,
    theme: AccessTheme,
  ): Group {
    const group = createAttractionAccess(kind, theme)
    group.position.set(access.x + 0.5, access.y, access.z + 0.5)
    return group
  }

  private updateCoasterTrains(
    coasters: readonly Coaster[],
    visitors: readonly Visitor[],
  ): void {
    this.trainVisitorsById.clear()
    visitors.forEach((visitor) => {
      this.trainVisitorsById.set(visitor.id, visitor)
    })
    const activeIds = new Set(coasters.map((coaster) => coaster.id))
    this.trainModels.forEach((model, id) => {
      if (!activeIds.has(id)) {
        this.coasterTrains.remove(model)
        disposeObject3D(model)
        this.trainModels.delete(id)
      }
    })

    coasters.forEach((coaster) => {
      let model = this.trainModels.get(coaster.id)
      const activePiece = coaster.train.state === 'running' ? sampleCoasterTrack(coaster, coaster.train.distance)?.pieceId : null
      const trackGroup = this.coasterTracks.children.find(g => g.userData.coasterId === coaster.id)
      for (const piece of trackGroup?.children ?? []) if (piece.userData.effect) piece.userData.effect.visible = piece.userData.pieceId === activePiece && !this.logisticsMode
      if (!model || model.userData.cars !== coaster.train.cars) {
        if (model) {
          this.coasterTrains.remove(model)
          disposeObject3D(model)
        }
        model = this.createTrainModel(coaster)
        this.trainModels.set(coaster.id, model)
        this.coasterTrains.add(model)
      }
      const physics = COASTER_TYPES[coaster.typeId].physics
      const leadDistance =
        this.interpolatedTrainDistance(coaster) +
        Math.max(0, coaster.train.cars - 1) * physics.carSpacing
      model.children.forEach((car, index) => {
        const sample = sampleCoasterTrack(
          coaster,
          leadDistance - index * physics.carSpacing,
        )
        if (!sample) return
        car.position.set(sample.point.x + 0.5, sample.point.y + 0.34, sample.point.z + 0.5)
        this.trainForward.set(
          sample.tangent.x,
          sample.tangent.y,
          sample.tangent.z,
        )
        this.trainRight.set(sample.right.x, sample.right.y, sample.right.z)
        this.trainUp.set(sample.up.x, sample.up.y, sample.up.z)
        car.quaternion.setFromRotationMatrix(
          this.trainRotationMatrix.makeBasis(
            this.trainRight,
            this.trainUp,
            this.trainForward,
          ),
        )
        car.traverse((object) => {
          if (typeof object.userData.passengerSeat === 'number') {
            const passengerId = coaster.train.passengerIds[object.userData.passengerSeat]
            const visitor = passengerId
              ? this.trainVisitorsById.get(passengerId)
              : undefined
            object.visible = Boolean(visitor)
            if (visitor) {
              object.traverse((part) => {
                if (
                  part instanceof Mesh &&
                  part.userData.isPassengerShirt &&
                  part.material instanceof MeshStandardMaterial
                ) {
                  part.material.color.set(visitor.color)
                }
              })
            }
          }
        })
      })
      model.visible = coaster.pieces.length > 0
    })
  }

  private createTrainModel(coaster: Coaster): Group {
    const group = new Group()
    const type = COASTER_TYPES[coaster.typeId]
    const material = new MeshStandardMaterial({
      color: type.carColor,
      roughness: 0.55,
    })
    for (let index = 0; index < coaster.train.cars; index += 1) {
      const carGroup = new Group()
      const car = new Mesh(new BoxGeometry(0.42, 0.28, 0.55), material)
      car.castShadow = false
      carGroup.add(car)
      for (let seat = 0; seat < type.carCapacity; seat += 1) {
        const passenger = this.createCarPassenger(index * type.carCapacity + seat, seat)
        carGroup.add(passenger)
      }
      group.add(carGroup)
    }
    group.userData.cars = coaster.train.cars
    return group
  }

  private createCarPassenger(passengerSeat: number, seat: number): Group {
    const passenger = new Group()
    const shirtColors = [0xf05a5a, 0x4e9be8, 0xf0c34e, 0x67b878]
    const body = new Mesh(
      new CylinderGeometry(0.045, 0.055, 0.14, 6),
      new MeshStandardMaterial({ color: shirtColors[passengerSeat % shirtColors.length] }),
    )
    body.userData.isPassengerShirt = true
    const head = new Mesh(
      new SphereGeometry(0.045, 7, 5),
      new MeshStandardMaterial({ color: 0xf1bd8e }),
    )
    body.position.y = 0.18
    head.position.y = 0.29
    passenger.position.set(seat % 2 === 0 ? -0.11 : 0.11, 0.08, seat < 2 ? -0.1 : 0.12)
    passenger.userData.passengerSeat = passengerSeat
    passenger.add(body, head)
    return passenger
  }

  private updateVisitors(visitors: readonly Visitor[]): void {
    if (this.personDetails.group.parent !== this.visitors) this.visitors.add(this.personDetails.group)
    this.personDetails.begin(Math.max(1, visitors.length))
    this.ensureVisitorInstances(Math.max(1, visitors.length))
    const meshes = this.visitorPickMeshes
    if (meshes.length === 0) return
    if (this.visitorInstanceIds.length !== visitors.length) {
      this.visitorInstanceIds = visitors.map((visitor) => visitor.id)
      if (this.visitorSeedCache.size > visitors.length * 2 + 32) {
        const activeIds = new Set(this.visitorInstanceIds)
        for (const id of this.visitorSeedCache.keys()) {
          if (!activeIds.has(id)) this.visitorSeedCache.delete(id)
        }
      }
    } else {
      for (let index = 0; index < visitors.length; index += 1) {
        this.visitorInstanceIds[index] = visitors[index]!.id
      }
    }
    let buildingsById: Map<string, PlacedBuilding> | null = null
    const stageFocus = new Map<string, { x: number; z: number }>()
    for (const building of this.currentSnapshot?.buildings ?? []) {
      if (building.kind === 'stage') stageFocus.set(building.id, stageFocusPoint(building))
    }
    const floorStageIds = new Map<string, string | undefined>()
    for (const cell of this.currentSnapshot?.stageForecourtCells ?? []) {
      floorStageIds.set(`${cell.x},${cell.z}`, cell.stageId)
    }
    const now = performance.now()
    const lodRadius = 14 / Math.max(0.65, this.zoom)
    for (const batch of this.emotionInstances.values()) batch.count = 0
    let cartIndex = 0
    const hiddenMatrix = this.visitorHiddenMatrix

    visitors.forEach((visitor, index) => {
      const previous = this.previousVisitorPositions.get(visitor.id)
      const interpolate = previous && Math.hypot(previous.x - visitor.x, previous.z - visitor.z) < 5
      const x = interpolate ? previous.x + (visitor.x - previous.x) * this.renderAlpha : visitor.x
      const y = interpolate ? previous.y + (visitor.y - previous.y) * this.renderAlpha : visitor.y
      const z = interpolate ? previous.z + (visitor.z - previous.z) * this.renderAlpha : visitor.z
      const visible =
        !this.bungeeRiders.has(visitor.id) &&
        visitor.state !== 'riding' &&
        visitor.state !== 'vehicle-arrival' &&
        visitor.state !== 'bus-riding' &&
        visitor.state !== 'medical' &&
        !(visitor.state === 'camping' && visitor.campingPhase === 'resting')
      if (!visible) {
        for (let meshIndex = 0; meshIndex < meshes.length; meshIndex += 1) {
          meshes[meshIndex]!.setMatrixAt(index, hiddenMatrix)
        }
        return
      }
      const streaking = visitor.streakingMinutes > 0
      const topless = !streaking && (visitor.toplessMinutes ?? 0) > 0
      const shirtless = streaking || topless
      const sitting =
        (visitor.state === 'socializing' &&
          visitor.campActivity === 'sitting') ||
        visitor.state === 'bench-resting'
      const moving =
        visitor.state !== 'sleeping' && visitor.route.length > 0
      const dx = visitor.x - this.cameraTarget.x
      const dz = visitor.z - this.cameraTarget.z
      const distance = Math.hypot(dx, dz)
      const detailed = distance < lodRadius
      const intoxication = Math.max(0, Math.min(1, (visitor.alcoholLevel - 25) / 60))
      let seed = this.visitorSeedCache.get(visitor.id)
      if (seed === undefined) {
        seed = personSeed(visitor.id)
        this.visitorSeedCache.set(visitor.id, seed)
      }
      const appearance = personStyle(seed)
      this.visitorSkinColor.setHex(appearance.skin)
      this.visitorPantsColor.setHex(appearance.trousers)
      const fleeing = visitor.isPanicking || visitor.state === 'panicking'
      const pace = fleeing
        ? 2.2
        : streaking
        ? 2.15
        : visitor.emotion === 'angry'
          ? 1.45
          : visitor.emotion === 'sad'
            ? 0.65
            : visitor.emotion === 'excited'
              ? 1.25
              : 1
      const phase = now * 0.009 * pace + seed
      const stride = detailed
        ? visitor.isDancing
          ? Math.sin(phase * 1.8)
          : moving
            ? Math.sin(phase)
            : 0
        : visitor.isDancing
          ? Math.sin(phase * 1.8)
          : moving
          ? Math.sin(phase * 0.7)
          : 0
      const jump = visitor.isDancing
        ? Math.max(0, Math.sin(phase * 1.15)) * (detailed ? 0.08 : 0.04)
        : detailed
          ? moving && (streaking || visitor.emotion === 'excited')
            ? Math.max(0, Math.sin(phase * 0.65)) * (streaking ? 0.16 : 0.11)
            : 0
        : 0
      const bob = moving && visitor.emotion !== 'sad' ? Math.abs(stride) * 0.018 : 0
      const wobble =
        detailed && moving ? Math.sin(phase * 0.43) * 0.09 * intoxication : 0
      const atSocialTarget =
        visitor.state === 'socializing' &&
        visitor.route.length === 0 &&
        Boolean(visitor.campActivityTarget)
      const socialAngle =
        (visitor.campActivitySlot / Math.max(2, visitor.campActivityCapacity)) *
        Math.PI *
        2
      const socialOffsetX = atSocialTarget ? Math.cos(socialAngle) * 0.2 : 0
      const socialOffsetZ = atSocialTarget ? Math.sin(socialAngle) * 0.2 : 0
      const atActivityTarget =
        (visitor.state === 'partying' ||
          visitor.state === 'bench-resting' ||
          visitor.state === 'relaxing') &&
        visitor.route.length === 0 &&
        Boolean(visitor.activityTarget)
      let activityOffsetX = 0
      let activityOffsetZ = 0
      if (
        atActivityTarget &&
        (visitor.state === 'partying' || visitor.state === 'relaxing')
      ) {
        activityOffsetX = (visitor.activitySlot % 3 - 1) * 0.27
        activityOffsetZ = (Math.floor(visitor.activitySlot / 3) - 1) * 0.27
      } else if (atActivityTarget && visitor.state === 'bench-resting') {
        const directions = [
          { x: 0, z: 1 },
          { x: 1, z: 0 },
          { x: 0, z: -1 },
          { x: -1, z: 0 },
        ]
        if (!buildingsById && this.currentSnapshot) {
          buildingsById = new Map(this.currentSnapshot.buildings.map((building) => [building.id, building]))
        }
        const benchRotation = visitor.targetId
          ? buildingsById?.get(visitor.targetId)?.rotation ?? 0
          : 0
        const direction = directions[benchRotation]!
        activityOffsetX =
          direction.x * 0.34 +
          direction.z * (visitor.activitySlot === 0 ? -0.15 : 0.15)
        activityOffsetZ =
          direction.z * 0.34 -
          direction.x * (visitor.activitySlot === 0 ? -0.15 : 0.15)
      }
      const displayX =
        atSocialTarget && visitor.campActivityTarget
          ? visitor.campActivityTarget.x + 0.5 + socialOffsetX
          : atActivityTarget && visitor.activityTarget
            ? visitor.activityTarget.x + 0.5 + activityOffsetX
            : x + Math.cos(visitor.facing) * wobble
      const displayZ =
        atSocialTarget && visitor.campActivityTarget
          ? visitor.campActivityTarget.z + 0.5 + socialOffsetZ
          : atActivityTarget && visitor.activityTarget
            ? visitor.activityTarget.z + 0.5 + activityOffsetZ
            : z - Math.sin(visitor.facing) * wobble
      const displayY =
        this.actorTerrainHeight(displayX, displayZ, y) +
        (visitor.state === 'sleeping' ? 0.12 : sitting ? -0.02 : 0.04 + bob) +
        jump
      const scaleY =
        sitting ? 0.84 : visitor.emotion === 'sad' && visitor.state !== 'sleeping' ? 0.92 : 1
      const stageFacing =
        atActivityTarget && visitor.state === 'partying' && visitor.activityTarget
          ? danceFloorFacing(
              visitor.activityTarget,
              visitor.concertId ?? null,
              floorStageIds,
              stageFocus,
            )
          : null
      const targetRotation = atSocialTarget
        ? Math.atan2(-socialOffsetX, -socialOffsetZ)
        : atActivityTarget
          ? visitor.state === 'bench-resting'
            ? visitor.facing
            : stageFacing ?? Math.atan2(-activityOffsetX, -activityOffsetZ)
          : visitor.route[0]
            ? Math.atan2(
                visitor.route[0].x + visitor.tileOffsetX - visitor.x,
                visitor.route[0].z + visitor.tileOffsetZ - visitor.z,
              )
            : visitor.facing
      const tilt =
        visitor.state === 'sleeping' ||
        visitor.state === 'injured' ||
        visitor.state === 'medical-transport'
          ? Math.PI / 2
          : detailed
            ? Math.sin(phase * 0.5) * 0.16 * intoxication
            : 0
      const strength =
        fleeing ? 1.2 : visitor.emotion === 'angry' ? 0.9 : visitor.emotion === 'sad' ? 0.32 : 0.65
      const limbSwing =
        visitor.state === 'sleeping' || visitor.state === 'medical-transport'
          ? 0
          : sitting
            ? Math.PI * 0.42
            : stride * (visitor.isDancing ? 1.15 : strength)
      const headTilt = visitor.emotion === 'sad' ? 0.35 : 0
      const shirtColor = shirtless
        ? this.visitorSkinColor
        : fleeing
          ? this.visitorColor.setHex(visitor.color).lerp(this.visitorPanicTint, 0.55)
          : this.visitorColor.setHex(visitor.color)
      const legColor = streaking || (appearance.skirt && !shirtless) ? this.visitorSkinColor : this.visitorPantsColor

      this.visitorPose.position.set(displayX, displayY, displayZ)
      this.visitorPose.rotation.set(fleeing ? 0.28 : 0, targetRotation, fleeing ? 0 : tilt)
      this.visitorPose.scale.set(appearance.width, scaleY * appearance.height, appearance.width)
      this.visitorPose.updateMatrix()
      this.setVisitorLimb(index, appearance.female ? this.visitorFemaleBodyInstances : this.visitorBodyInstances, 0, .39, 0, 0, shirtColor)
      ;(appearance.female ? this.visitorBodyInstances : this.visitorFemaleBodyInstances)?.setMatrixAt(index, hiddenMatrix)
      this.setVisitorLimb(index, this.visitorHeadInstances, 0, .605, 0, headTilt * .3, this.visitorSkinColor)
      this.setVisitorLimb(index, this.visitorLeftLegInstances, -.044, .275, 0, sitting ? -1.15 : limbSwing * .65, legColor)
      this.setVisitorLimb(index, this.visitorRightLegInstances, .044, .275, 0, sitting ? -1.15 : -limbSwing * .65, legColor)
      this.setVisitorLimb(index, this.visitorLeftArmInstances, appearance.female ? -.11 : -.128, .485, 0, visitor.isDancing ? -1.7 - stride * .45 : -limbSwing * .65, this.visitorSkinColor)
      this.setVisitorLimb(index, this.visitorRightArmInstances, appearance.female ? .11 : .128, .485, 0, visitor.isDancing ? -1.7 + stride * .45 : limbSwing * .65, this.visitorSkinColor)
      this.personDetails.place(appearance.variant, this.visitorPose.matrix, !shirtless)
      if (appearance.female) {
        if (shirtless) {
          this.setVisitorLimb(index, this.visitorBreastInstances, 0, .39, 0, 0, this.visitorSkinColor)
          this.visitorBustInstances?.setMatrixAt(index, hiddenMatrix)
        } else {
          this.setVisitorLimb(index, this.visitorBustInstances, 0, .39, 0, 0, shirtColor)
          this.visitorBreastInstances?.setMatrixAt(index, hiddenMatrix)
        }
        this.visitorPenisInstances?.setMatrixAt(index, hiddenMatrix)
      } else if (streaking) {
        this.setVisitorLimb(index, this.visitorPenisInstances, 0, .39, 0, 0, this.visitorSkinColor)
        this.visitorBreastInstances?.setMatrixAt(index, hiddenMatrix)
        this.visitorBustInstances?.setMatrixAt(index, hiddenMatrix)
      } else {
        this.visitorBreastInstances?.setMatrixAt(index, hiddenMatrix)
        this.visitorBustInstances?.setMatrixAt(index, hiddenMatrix)
        this.visitorPenisInstances?.setMatrixAt(index, hiddenMatrix)
      }

      const bubble = visitorBubbleKind(visitor)
      if (bubble) {
        const emotionBatch = this.getEmotionBatch(bubble, visitors.length)
        const size = bubble === 'panic' ? 1.55 : bubble === 'crushed' ? 1.2 : 1
        this.emotionPose.position.set(
          displayX,
          displayY + (bubble === 'panic' ? 1.02 : 0.82),
          displayZ,
        )
        this.emotionPose.scale.setScalar(size)
        this.emotionPose.quaternion.copy(this.camera.quaternion)
        this.emotionPose.updateMatrix()
        emotionBatch.setMatrixAt(emotionBatch.count++, this.emotionPose.matrix)
        this.emotionPose.scale.setScalar(1)
      }
      if (visitor.hasHandcart && !streaking) {
        const cart = this.getVisitorHandcart(cartIndex)
        cartIndex += 1
        cart.visible = true
        cart.position.set(
          displayX + Math.sin(targetRotation) * 0.36,
          displayY - 0.02,
          displayZ + Math.cos(targetRotation) * 0.36,
        )
        cart.position.y = this.actorTerrainHeight(cart.position.x, cart.position.z, y) + .02
        cart.rotation.y = targetRotation
      }
    })

    this.personDetails.finish()
    const used = visitors.length
    meshes.forEach((mesh) => {
      mesh.count = used
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
    for (const batch of this.emotionInstances.values()) batch.instanceMatrix.needsUpdate = true
    for (let index = cartIndex; index < this.visitorHandcarts.length; index += 1) {
      this.visitorHandcarts[index]!.visible = false
    }
  }

  private setVisitorLimb(
    index: number,
    mesh: InstancedMesh | null,
    x: number,
    y: number,
    z: number,
    swingX: number,
    color: Color,
  ): void {
    if (!mesh) return
    this.visitorLimb.position.set(x, y, z)
    this.visitorLimb.rotation.set(swingX, 0, 0)
    this.visitorLimb.scale.set(1, 1, 1)
    this.visitorLimb.updateMatrix()
    this.visitorMatrix.multiplyMatrices(this.visitorPose.matrix, this.visitorLimb.matrix)
    mesh.setMatrixAt(index, this.visitorMatrix)
    mesh.setColorAt(index, color)
  }

  private ensureVisitorInstances(count: number): void {
    if (this.visitorCapacity >= count && this.visitorBodyInstances) return
    const next = Math.max(32, count, this.visitorCapacity * 2)
    this.visitorPickMeshes.forEach((mesh) => {
      this.visitors.remove(mesh)
      mesh.dispose()
    })
    const create = (
      geometry: BufferGeometry,
      material: MeshStandardMaterial,
    ): InstancedMesh => {
      const instanced = new InstancedMesh(geometry, material, next)
      instanced.instanceMatrix.setUsage(DynamicDrawUsage)
      instanced.instanceColor = new InstancedBufferAttribute(new Float32Array(next * 3), 3)
      instanced.instanceColor.setUsage(DynamicDrawUsage)
      instanced.castShadow = false
      instanced.frustumCulled = false
      this.visitors.add(instanced)
      return instanced
    }
    const shirtMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.8,
    })
    shirtMaterial.userData.shared = true
    const pantMaterial = new MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.9,
    })
    pantMaterial.userData.shared = true
    this.visitorBodyInstances = create(this.visitorBodyGeometry, shirtMaterial)
    this.visitorFemaleBodyInstances = create(this.visitorFemaleBodyGeometry, shirtMaterial)
    this.visitorHeadInstances = create(this.visitorHeadGeometry, this.visitorSkinMaterial)
    this.visitorLeftLegInstances = create(this.visitorLegGeometry, pantMaterial)
    this.visitorRightLegInstances = create(this.visitorLegGeometry, pantMaterial)
    this.visitorLeftArmInstances = create(this.visitorArmGeometry, this.visitorSkinMaterial)
    this.visitorRightArmInstances = create(this.visitorArmGeometry, this.visitorSkinMaterial)
    this.visitorBreastInstances = create(this.visitorBreastGeometry, this.visitorSkinMaterial)
    this.visitorBustInstances = create(this.visitorBustGeometry, shirtMaterial)
    this.visitorPenisInstances = create(this.visitorPenisGeometry, this.visitorSkinMaterial)
    this.visitorPickMeshes = [
      this.visitorBodyInstances,
      this.visitorFemaleBodyInstances,
      this.visitorHeadInstances,
      this.visitorLeftLegInstances,
      this.visitorRightLegInstances,
      this.visitorLeftArmInstances,
      this.visitorRightArmInstances,
      this.visitorBreastInstances,
      this.visitorBustInstances,
      this.visitorPenisInstances,
    ]
    this.visitorCapacity = next
  }

  private getEmotionBatch(emotion: string, capacity: number): InstancedMesh {
    let batch = this.emotionInstances.get(emotion)
    if (!batch || batch.instanceMatrix.count < capacity) {
      const old = batch
      batch = new InstancedMesh(new PlaneGeometry(0.34, 0.34), new MeshBasicMaterial({
        map: this.getEmotionTexture(emotion), transparent: true, depthWrite: false, depthTest: false,
      }), Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, capacity)))))
      batch.count = 0
      batch.frustumCulled = false
      batch.renderOrder = 100
      batch.instanceMatrix.setUsage(DynamicDrawUsage)
      if (old) {
        this.visitors.remove(old); old.geometry.dispose(); (old.material as MeshBasicMaterial).dispose(); old.dispose()
      }
      this.visitors.add(batch)
      this.emotionInstances.set(emotion, batch)
    }
    return batch
  }

  private getVisitorHandcart(index: number): Group {
    const existing = this.visitorHandcarts[index]
    if (existing) return existing
    const cart = this.createSharedHandcart()
    cart.visible = false
    this.visitors.add(cart)
    this.visitorHandcarts[index] = cart
    return cart
  }

  private createSharedHandcart(): Group {
    const cart = new Group()
    const body = new Mesh(this.handcartBodyGeometry, this.handcartBodyMaterial)
    body.position.y = 0.12
    const gear = new Mesh(this.handcartGearGeometry, this.handcartGearMaterial)
    gear.position.y = 0.23
    cart.add(body, gear)
    ;[-0.14, 0.14].forEach((x) => {
      const wheel = new Mesh(this.handcartWheelGeometry, this.handcartWheelMaterial)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 0.065, 0.04)
      cart.add(wheel)
    })
    const handle = new Mesh(this.handcartHandleGeometry, this.handcartHandleMaterial)
    handle.position.set(0, 0.12, -0.3)
    handle.rotation.x = -0.18
    cart.add(handle)
    cart.userData.handcart = true
    return cart
  }

  private getCashTexture(amount: number): CanvasTexture {
    const cached = this.cashTextures.get(amount)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (context) {
      context.font = 'bold 42px sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.lineWidth = 9
      context.strokeStyle = 'rgba(17, 48, 29, 0.9)'
      context.strokeText(`+${amount.toLocaleString('de-DE')} €`, 128, 48)
      context.fillStyle = '#75f09a'
      context.fillText(`+${amount.toLocaleString('de-DE')} €`, 128, 48)
    }
    const texture = new CanvasTexture(canvas)
    this.cashTextures.set(amount, texture)
    return texture
  }

  private getEmotionTexture(emotion: string): CanvasTexture {
    const cached = this.emotionTextures.get(emotion)
    if (cached) return cached
    const icons: Record<string, string> = {
      neutral: '😐',
      happy: '🙂',
      sad: '😢',
      angry: '😠',
      excited: '🤩',
      sleeping: '💤',
      talking: '💬',
      dancing: '🎶',
      crushed: '😣',
      panic: '😱',
    }
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      context.font = '86px "Segoe UI Emoji", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(icons[emotion] ?? icons.neutral!, 64, 66)
    }
    const texture = new CanvasTexture(canvas)
    this.emotionTextures.set(emotion, texture)
    return texture
  }

  private updateCashEffects(effects: readonly CashEffect[]): void {
    const activeIds = new Set(effects.map((effect) => effect.id))
    this.cashEffectModels.forEach((sprite, id) => {
      if (activeIds.has(id)) return
      this.cashEffects.remove(sprite)
      sprite.material.dispose()
      this.cashEffectModels.delete(id)
    })

    effects.forEach((effect) => {
      let sprite = this.cashEffectModels.get(effect.id)
      if (!sprite) {
        sprite = new Sprite(
          new SpriteMaterial({
            map: this.getCashTexture(effect.amount),
            transparent: true,
            depthTest: false,
          }),
        )
        sprite.scale.set(1.8, 0.68, 1)
        sprite.renderOrder = 100
        this.cashEffectModels.set(effect.id, sprite)
        this.cashEffects.add(sprite)
      }
      const progress = Math.min(1, effect.age / 1.6)
      sprite.position.set(effect.x, effect.y + progress * 0.8, effect.z)
      sprite.material.opacity = 1 - progress * progress
    })
  }

  private bindEvents(): void {
    bindTouchCamera(this.canvas, {
      pan: (x, y) => this.panCamera(x, y),
      zoom: factor => this.zoomBy(factor),
      panWithOneFinger: () => this.touchPanMode || (this.currentSnapshot?.selectedTool === 'inspect' && !this.groundAreaHandler),
      cancelBuild: () => {
        this.groundAreaStart = null
        this.groundAreaEndKey = ''
        this.leftPointerDown = false
        this.painting = false
        this.dragging = false
        this.pointerDownCell = null
        this.lastPaintCell = null
        this.sceneryDragLock = null
        this.setPathDragPreview([], 0)
      },
    })
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
    this.canvas.addEventListener('pointerleave', () => { if (!this.pointerDownCell) this.hoveredCell = null })
    this.canvas.addEventListener('pointerdown', (event) => {
      this.groundAreaCancelled = false
      this.pickCell(event)
      this.dragging = event.button === 1 || event.button === 2
      this.leftPointerDown = event.button === 0
      this.painting = false
      this.pointerDownCell = this.hoveredCell ? { ...this.hoveredCell } : null
      this.lastPaintCell = null
      this.dragButton = event.button
      this.lastPointer.set(event.clientX, event.clientY)
      this.pointerDown.copy(this.lastPointer)
      this.canvas.setPointerCapture(event.pointerId)
      if (event.button === 0 && !(event.pointerType === 'touch' && this.touchPanMode) && this.groundAreaHandler && this.hoveredCell) {
        this.groundAreaStart = { ...this.hoveredCell }; this.groundAreaEndKey = ''; this.updateGroundAreaPreview()
      }
    })
    this.canvas.addEventListener('pointerup', (event) => {
      if (this.groundAreaCancelled) { this.groundAreaCancelled = false; return }
      if (event.button === 0 && this.groundAreaStart) {
        this.pickCell(event)
        if (this.hoveredCell) this.groundAreaHandler?.(this.groundAreaStart, this.hoveredCell, false)
        this.groundAreaStart = null; this.groundAreaEndKey = ''; this.leftPointerDown = false
        this.pointerDownCell = null; this.setPathDragPreview([], 0)
        return
      }
      const moved = this.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY))
      if (event.button === 0 && moved < 5 && this.staffPlacementHandler && this.hoveredCell) {
        this.staffPlacementHandler(this.hoveredCell)
        this.leftPointerDown = false; this.pointerDownCell = null
        return
      }
      if (event.button === 0 && moved < 5 && !this.painting && !(event.pointerType === 'touch' && this.touchPanMode)) {
        this.setRayFromPointer(event)
        const inspecting = this.currentSnapshot?.selectedTool === 'inspect'
        const staffHit = inspecting ? this.raycaster.intersectObjects([...(this.staffView.group.visible?this.staffView.group.children:[]),...this.supplyChainView.getStaffMeshes()],true)[0] : undefined
        const staffId = staffHit?.object.userData.staffId
        const visitorId = inspecting ? this.pickVisitor(event) : null
        const scenery = inspecting || this.currentSnapshot?.selectedTool === 'bulldoze' ? this.pickScenery() : null
        if (typeof staffId === 'string') this.onStaffClick(staffId)
        else if (visitorId) {
          this.onVisitorClick(visitorId)
        } else if (scenery) {
          this.onCellClick(scenery)
        } else if (this.hoveredCell) {
          this.onCellClick(this.hoveredCell)
        }
      }
      if (event.button === 2 && moved < 5) {
        const piece = this.pickCoasterPiece(event)
        if (piece) this.onCoasterPieceRightClick(piece.coasterId, piece.pieceIndex)
      }
      if (this.painting) this.onPathPaintEnd()
      this.dragging = false
      this.dragButton = -1
      this.leftPointerDown = false
      this.painting = false
      this.pointerDownCell = null
      this.lastPaintCell = null
      this.sceneryDragLock = null
    })
    this.canvas.addEventListener('pointercancel', () => {
      this.groundAreaStart = null; this.groundAreaEndKey = ''; this.leftPointerDown = false
      this.painting = false; this.dragging = false; this.sceneryDragLock = null; this.setPathDragPreview([], 0)
    })
    this.canvas.addEventListener('pointermove', (event) => {
      if (this.groundAreaStart) { this.pickCell(event); this.updateGroundAreaPreview(); return }
      if (this.dragging && (this.dragButton === 1 || this.dragButton === 2)) {
        this.panCamera(event.clientX - this.lastPointer.x, event.clientY - this.lastPointer.y)
        this.lastPointer.set(event.clientX, event.clientY)
        return
      }
      this.pickCell(event)
      const moved = this.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY))
      if (
        this.leftPointerDown &&
        moved >= 5 &&
        (isScenery(this.currentSnapshot?.selectedTool ?? '') || this.currentSnapshot?.selectedTool === 'path' ||
          this.currentSnapshot?.selectedTool === 'camping' ||
          this.currentSnapshot?.selectedTool === 'medicalArea' ||
          this.currentSnapshot?.selectedTool === 'wasteDump' ||
          this.currentSnapshot?.selectedTool === 'stageForecourt' ||
          this.currentSnapshot?.selectedTool === 'road' ||
          this.currentSnapshot?.selectedTool === 'parkingArea' ||
          this.currentSnapshot?.selectedTool === 'roadDirection' ||
          this.currentSnapshot?.selectedTool === 'roadSeparator' ||
          this.currentSnapshot?.selectedTool === 'fence' ||
          this.currentSnapshot?.selectedTool === 'crosswalk' ||
          this.currentSnapshot?.selectedTool === 'roadSpeed10' ||
          this.currentSnapshot?.selectedTool === 'roadSpeed30' ||
          this.currentSnapshot?.selectedTool === 'roadSpeed50' ||
          this.currentSnapshot?.selectedTool === 'terrainRaise' ||
          this.currentSnapshot?.selectedTool === 'terrainLower' ||
          this.currentSnapshot?.selectedTool === 'terrainFlatten' ||
          this.currentSnapshot?.selectedTool === 'bulldoze' ||
          this.currentSnapshot?.selectedTool === 'powerCable')
      ) {
        if (!this.painting && this.pointerDownCell) {
          this.onPathPaintStart(this.pointerDownCell)
          const tool = this.currentSnapshot?.selectedTool ?? ''
          if (isScenery(tool)) {
            const rotation = this.currentSnapshot!.buildRotation
            this.sceneryDragLock = {
              rotation,
              slot: scenerySlot(tool, this.pointerDownCell.localX, this.pointerDownCell.localZ, rotation) ?? 0,
            }
          }
        }
        this.painting = true
        if (this.pointerDownCell) this.paintCell(this.pointerDownCell)
        if (this.hoveredCell) this.paintCell(this.hoveredCell)
      }
    })
    this.canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        if (event.shiftKey) {
          this.onElevationChange(event.deltaY < 0 ? 1 : -1)
          return
        }
        this.zoom = MathUtils.clamp(this.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.55, 2.4)
        this.resize()
        this.updateCamera()
      },
      { passive: false },
    )
    window.addEventListener('keydown', event => {
      if (isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)) return
      if (event.key !== 'Escape' || !this.groundAreaStart) return
      this.setGroundAreaTool(this.groundAreaHandler)
      this.groundAreaCancelled = true; this.leftPointerDown = false; this.pointerDownCell = null
    })
    window.addEventListener('resize', () => this.resize())
  }

  private paintCell(cell: CellPosition): void {
    if (!this.lastPaintCell) {
      this.lastPaintCell = { ...cell }
      this.onCellPaint(cell)
      return
    }
    if (cell.x === this.lastPaintCell.x && cell.z === this.lastPaintCell.z) return

    let x = this.lastPaintCell.x
    let z = this.lastPaintCell.z
    const deltaX = Math.abs(cell.x - x)
    const deltaZ = Math.abs(cell.z - z)
    const stepX = x < cell.x ? 1 : -1
    const stepZ = z < cell.z ? 1 : -1
    let error = deltaX - deltaZ

    while (x !== cell.x || z !== cell.z) {
      const previousX = x
      const previousZ = z
      const doubleError = error * 2
      if (doubleError > -deltaZ) {
        error -= deltaZ
        x += stepX
      }
      if (doubleError < deltaX) {
        error += deltaX
        z += stepZ
      }
      if (x !== previousX && z !== previousZ) {
        this.onCellPaint({ x, z: previousZ })
      }
      this.onCellPaint({ x, z })
    }
    this.lastPaintCell = { ...cell }
  }

  private pickCell(event: PointerEvent): void {
    this.setRayFromPointer(event)
    const point = new Vector3()
    const terrainHit = this.raycaster.intersectObject(this.terrainGroup, true)[0]
    if (terrainHit) {
      point.copy(terrainHit.point)
    } else if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) {
      this.hoveredCell = null
      this.onCellHover(this.hoveredCell)
      this.updatePreview()
      if (this.staffPlacementHandler) this.updateStaffPlacementPreview(null)
      return
    }
    const x = Math.floor(point.x)
    const z = Math.floor(point.z)
    const half = this.worldSize / 2
    this.hoveredCell = x >= -half && x < half && z >= -half && z < half ? { x, z, localX: point.x - x, localZ: point.z - z } : null
    this.onCellHover(this.hoveredCell)
    this.updatePreview()
    if (this.staffPlacementHandler) this.updateStaffPlacementPreview(this.hoveredCell)
  }

  private pickScenery(): CellPosition | null {
    const hit = this.raycaster.intersectObjects(this.staticBuildingBatches.children, false)[0]
    const id = hit?.instanceId === undefined ? undefined : hit.object.userData.buildingIds?.[hit.instanceId]
    const building = id ? this.currentSnapshot?.buildings.find(b => b.id === id) : undefined
    if (!building || !isScenery(building.kind)) return null
    const position = sceneryTransform(building)
    return { x: building.x, z: building.z, localX: position.x, localZ: position.z, buildingId: building.id }
  }

  private pickVisitor(event: PointerEvent): string | null {
    if (this.logisticsMode) return null
    this.setRayFromPointer(event)
    const intersection = this.raycaster.intersectObjects(this.visitorPickMeshes, false)[0]
    const instanceId = intersection?.instanceId
    return typeof instanceId === 'number'
      ? this.visitorInstanceIds[instanceId] ?? null
      : null
  }

  private pickCoasterPiece(
    event: PointerEvent,
  ): { coasterId: string; pieceIndex: number } | null {
    this.setRayFromPointer(event)
    const intersection = this.raycaster.intersectObjects(this.coasterTracks.children, true)[0]
    const coasterId = intersection?.object.userData.coasterId
    const pieceIndex = intersection?.object.userData.pieceIndex
    return typeof coasterId === 'string' && typeof pieceIndex === 'number'
      ? { coasterId, pieceIndex }
      : null
  }

  private setRayFromPointer(event: PointerEvent): void {
    const bounds = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
  }

  private updatePreview(): void {
    this.sceneryPreview.visible = false
    if (this.constructionActive || this.rideGatePreview.visible) {
      this.preview.visible = false
      this.previewArrow.visible = false
      return
    }
    if (!this.hoveredCell || !this.currentSnapshot) {
      this.preview.visible = false
      this.previewArrow.visible = false
      return
    }

    const tool = this.currentSnapshot.selectedTool
    if (tool === 'ride' && this.bungeePreviewHeight !== null) {
      const cell = this.hoveredCell, key = `bungee:${this.bungeePreviewHeight}`
      if (this.sceneryPreviewKind !== key) {
        disposeChildren(this.sceneryPreview); this.sceneryPreviewKind = key
        const model = createBungeeModel(this.bungeePreviewHeight)
        model.traverse(o => { if (o instanceof Mesh) { const m = o.material as MeshStandardMaterial; m.transparent = true; m.opacity = .6; m.depthWrite = false; o.castShadow = false } })
        this.sceneryPreview.add(model)
      }
      this.sceneryPreview.visible = true
      this.sceneryPreview.scale.setScalar(1)
      this.sceneryPreview.position.set(cell.x + .5, this.currentSnapshot.buildElevation + getTerrainHeight(this.currentSnapshot.terrain, cell.x, cell.z), cell.z + .5)
      this.sceneryPreview.rotation.y = this.currentSnapshot.buildRotation * Math.PI / 2
      this.preview.visible = this.previewArrow.visible = false
      return
    }
    if (isScenery(tool)) {
      const cell = this.hoveredCell
      const rotation = this.sceneryDragLock?.rotation ?? this.currentSnapshot.buildRotation
      const slot = this.sceneryDragLock?.slot ?? scenerySlot(tool, cell.localX, cell.localZ, rotation)!
      const placement = sceneryTransform({ kind: tool as BuildingKind, rotation, decorationSlot: slot })
      if (tool !== this.sceneryPreviewKind) {
        disposeChildren(this.sceneryPreview)
        this.sceneryPreviewKind = tool
        const model = createRetroBuilding(tool as BuildingKind)!
        model.traverse(object => {
          if (!(object instanceof Mesh)) return
          const material = (object.material as MeshStandardMaterial).clone()
          material.userData = {}; material.transparent = true; material.opacity = .72; material.depthWrite = false
          object.material = material; object.castShadow = false
        })
        this.sceneryPreview.add(model)
      }
      const valid = this.placementValidator?.(tool as BuildingKind, cell.x, cell.z, slot) ?? true
      this.sceneryPreview.visible = true
      this.sceneryPreview.position.set(cell.x + placement.x, getTerrainHeight(this.currentSnapshot.terrain, cell.x, cell.z) + this.currentSnapshot.buildElevation, cell.z + placement.z)
      if (this.terrainShape) this.sceneryPreview.position.y = this.terrainShape.sample(cell.x + placement.x, cell.z + placement.z) + this.currentSnapshot.buildElevation
      this.sceneryPreview.rotation.y = placement.rotation * Math.PI / 2
      this.sceneryPreview.scale.set(placement.sx, placement.sy, placement.sz)
      this.sceneryPreview.traverse(object => { if (object instanceof Mesh) (object.material as MeshStandardMaterial).color.setHex(valid ? 0xffffff : 0xf05a65) })
      this.preview.visible = true; this.previewArrow.visible = false
      this.preview.position.copy(this.sceneryPreview.position); this.preview.position.y += .07
      const edge = isEdgeScenery(tool)
      this.preview.scale.set(edge ? .98 : .5, .12, edge ? .2 : .5)
      this.preview.rotation.y = placement.rotation * Math.PI / 2
      const marker = this.preview.material as MeshStandardMaterial
      marker.color.setHex(valid ? 0x8fdab0 : 0xf05a65)
      marker.emissive.copy(marker.color); marker.emissiveIntensity = .3
      return
    }
    this.preview.rotation.y = 0
    ;(this.preview.material as MeshStandardMaterial).emissiveIntensity = 0
    const objectsAtCell = this.currentSnapshot.buildings
      .filter((item) => occupiesBuildingCell(item,this.hoveredCell!.x,this.hoveredCell!.z))
      .sort((a, b) => b.elevation - a.elevation)
    const existing = objectsAtCell[0]
    const hovered = this.hoveredCell
    const campingOccupied = this.currentSnapshot.campingCells.some(
      (cell) => cell.x === hovered?.x && cell.z === hovered?.z,
    )
    const medicalOccupied = this.currentSnapshot.medicalCells.some(
      (cell) => cell.x === this.hoveredCell?.x && cell.z === this.hoveredCell?.z,
    )
    const forecourtOccupied = this.currentSnapshot.stageForecourtCells.some(
      (cell) => cell.x === this.hoveredCell?.x && cell.z === this.hoveredCell?.z,
    )
    const ground = getTerrainHeight(
      this.currentSnapshot.terrain,
      this.hoveredCell.x,
      this.hoveredCell.z,
    )
    const elevation =
      tool === 'bulldoze' ||
      tool === 'inspect' ||
      tool === 'camping' ||
      tool === 'medicalArea' ||
      tool === 'stageForecourt' ||
      tool === 'terrainRaise' ||
      tool === 'terrainLower' ||
      tool === 'terrainFlatten'
        ? existing?.elevation ?? ground
        : ground + this.currentSnapshot.buildElevation
    const stageDesign = tool==='stage' ? this.currentSnapshot.festival.stageTemplates?.find(t=>t.name===this.currentSnapshot!.festival.selectedStageTemplate) : undefined
    const footprint=stageSize(stageDesign,this.currentSnapshot.buildRotation)
    this.preview.scale.set(footprint.width,1,footprint.depth)
    this.preview.visible = true
    this.preview.position.set(
      this.hoveredCell.x + footprint.width/2,
      elevation + 0.07,
      this.hoveredCell.z + footprint.depth/2,
    )
    const occupied =
      Boolean(existing) ||
      campingOccupied ||
      medicalOccupied ||
      forecourtOccupied
    const buildingDefinition = BUILDINGS[tool as BuildingKind]
    const validBusStopPosition =
      tool === 'busStop' &&
      Boolean(
        objectsAtCell.find(
          (item) =>
            item.kind === 'path' &&
            item.elevation === 0 &&
            item.pathType === 'normal',
        ),
      ) &&
      !this.currentSnapshot.logistics.roadCells.some(
        (road) =>
          road.x === this.hoveredCell?.x &&
          road.z === this.hoveredCell?.z,
      ) &&
      this.currentSnapshot.logistics.roadCells.some(
        (road) =>
          Math.abs(road.x - this.hoveredCell!.x) +
            Math.abs(road.z - this.hoveredCell!.z) ===
          1,
      )
    const collides =
      Boolean(buildingDefinition) &&
      tool !== 'busStop' &&
      objectsAtCell.some((item) => {
        if (
          (tool === 'securityGate' || tool === 'bench' || tool === 'fence') &&
          item.kind === 'path'
        ) {
          return false
        }
        if (
          tool === 'fence' &&
          item.kind === 'fence' &&
          item.rotation !== this.currentSnapshot?.buildRotation
        ) {
          return false
        }
        const itemTop = item.elevation + BUILDINGS[item.kind].height
        const previewTop = elevation + buildingDefinition.height
        return item.elevation < previewTop && elevation < itemTop
      })
    const valid = stageDesign ? !stageSiteIssue(this.currentSnapshot,stageDesign,hovered.x,hovered.z,this.currentSnapshot.buildRotation) :
      tool === 'bulldoze'
        ? occupied
        : tool === 'camping'
          ? !existing
          : tool === 'medicalArea'
            ? !existing && !campingOccupied
            : tool === 'stageForecourt'
              ? !existing && !campingOccupied && !medicalOccupied
              : tool === 'busStop'
                ? validBusStopPosition
          : tool === 'inspect' || tool === 'coaster' || !collides
    const showDirectionArrow =
      (Boolean(buildingDefinition) && tool !== 'path') ||
      tool === 'roadDirection' ||
      tool === 'roadSeparator'
    const material = this.preview.material as MeshStandardMaterial
    material.color.set(valid ? 0x55dd88 : 0xe84d4d)

    this.previewArrow.visible = showDirectionArrow
    if (showDirectionArrow) {
      const angle = this.currentSnapshot.buildRotation * (Math.PI / 2)
      this.previewArrow.position.set(
        this.hoveredCell.x + 0.5 + Math.sin(angle) * 0.62,
        elevation + 0.32,
        this.hoveredCell.z + 0.5 + Math.cos(angle) * 0.62,
      )
      this.previewArrow.rotation.set(Math.PI / 2, angle, 0)
      const arrowMaterial = this.previewArrow.material as MeshStandardMaterial
      arrowMaterial.color.copy(material.color)
    }
  }

  touchPanMode = false

  zoomBy(factor: number): void {
    this.zoom = MathUtils.clamp(this.zoom * factor, 0.55, 2.4)
    this.resize()
    this.updateCamera()
  }

  private panCamera(deltaX: number, deltaY: number): void {
    const scale = 0.018 / this.zoom
    const right = new Vector3(Math.cos(this.cameraAngle), 0, -Math.sin(this.cameraAngle))
    const forward = new Vector3(Math.sin(this.cameraAngle), 0, Math.cos(this.cameraAngle))
    this.cameraTarget.addScaledVector(right, -deltaX * scale)
    this.cameraTarget.addScaledVector(forward, -deltaY * scale)
    const limit = this.worldSize / 2
    this.cameraTarget.x = MathUtils.clamp(this.cameraTarget.x, -limit, limit)
    this.cameraTarget.z = MathUtils.clamp(this.cameraTarget.z, -limit, limit)
    this.updateCamera()
  }

  private updateVisitorFollow(
    visitors: readonly Visitor[],
    immediate = false,
  ): void {
    if (!this.followedVisitorId) return
    const visitor = visitors.find((candidate) => candidate.id === this.followedVisitorId)
    if (!visitor) {
      this.followedVisitorId = null
      return
    }
    const target = new Vector3(visitor.x, visitor.y + 0.25, visitor.z)
    if (visitor.state === 'riding' && this.currentSnapshot) {
      const coaster = this.currentSnapshot.coasters.find((candidate) =>
        candidate.train.passengerIds.includes(visitor.id),
      )
      if (coaster) {
        const passengerIndex = coaster.train.passengerIds.indexOf(visitor.id)
        const carIndex = Math.floor(
          passengerIndex / COASTER_TYPES[coaster.typeId].carCapacity,
        )
        const car = this.trainModels.get(coaster.id)?.children[carIndex]
        if (car) target.set(car.position.x, car.position.y, car.position.z)
      }
    }
    if (immediate) this.cameraTarget.copy(target)
    else this.cameraTarget.lerp(target, 0.2)
    this.updateCamera()
  }

  private updateCamera(): void {
    const horizontalDistance = this.cameraDistance
    this.camera.position.set(
      this.cameraTarget.x + Math.sin(this.cameraAngle) * horizontalDistance,
      20,
      this.cameraTarget.z + Math.cos(this.cameraAngle) * horizontalDistance,
    )
    this.camera.lookAt(this.cameraTarget)
  }

  private resize(): void {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width === 0 || height === 0) return

    this.renderer.setPixelRatio(scenePixelRatio(width, height))
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    const viewHeight = 20 / this.zoom
    this.camera.left = (-viewHeight * aspect) / 2
    this.camera.right = (viewHeight * aspect) / 2
    this.camera.top = viewHeight / 2
    this.camera.bottom = -viewHeight / 2
    this.camera.near = 0.1
    this.camera.far = 100
    this.camera.updateProjectionMatrix()
  }
}
