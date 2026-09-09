import type { GameSnapshot } from './GameState'
import { getTerrainHeight, isWaterHeight } from './terrain'
import { groundInfo } from './ground'
import { stageAudienceCells, buildingFootprint, stageSize, type StageDesign } from './stageDesign'
export function stageSiteIssue(s:Readonly<GameSnapshot>,design:StageDesign,x:number,z:number,rotation:number,ignoreId?:string):string|null {
  const ground=getTerrainHeight(s.terrain,x,z),half=s.scenario.worldSize/2,size=stageSize(design,rotation)
  if(x < -half||z < -half||x+size.width>half||z+size.depth>half)return 'Bühnenfläche liegt außerhalb des Geländes'
  for(const c of buildingFootprint({x,z,rotation,stageDesign:design})){
    const height=getTerrainHeight(s.terrain,c.x,c.z)
    if(isWaterHeight(height))return 'Bühnenfläche darf nicht im Wasser liegen'
    if(Math.abs(height-ground)>.01)return 'Gesamte Bühnenfläche zuerst einebnen'
    if(groundInfo(s,c.x,c.z).bearing<2)return 'Gesamte Bühnenfläche braucht tragfähigen Untergrund'
  }
  const contains=(p:{x:number;z:number})=>p.x>=x&&p.x<x+size.width&&p.z>=z&&p.z<z+size.depth
  const audience=stageAudienceCells({x,z,rotation,stageDesign:design})
  const blocksPerson=(p:{x:number;z:number})=>contains(p)&&!audience.some(c=>c.x===Math.floor(p.x)&&c.z===Math.floor(p.z))
  if(s.visitors.some(blocksPerson)||s.staff.some(blocksPerson))return 'Bühnenfläche muss frei von Besuchern und Personal sein'
  if(s.buildings.some(b=>{const other=stageSize(b.stageDesign,b.rotation);return b.id!==ignoreId&&b.x<x+size.width&&b.x+other.width>x&&b.z<z+size.depth&&b.z+other.depth>z}))return 'Bühnenfläche ist bereits bebaut – Gebäude oder Bäume zuerst entfernen'
  if([s.campingCells,s.medicalCells,s.stageForecourtCells.filter(c=>!ignoreId||c.stageId!==ignoreId),s.wasteDumpCells,s.logistics.roadCells,s.logistics.parkingCells,s.festival.infrastructure.depots].some(cells=>cells.some(contains)))return 'Bühnenfläche überschneidet sich mit Wegen, Logistik oder ausgewiesenen Bereichen'
  return null
}
