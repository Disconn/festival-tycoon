import type { GameSnapshot } from './GameState'
import { stageAudienceCells } from './stageDesign'
export function syncStageAudience(s:GameSnapshot):void {
  const cells=s.stageForecourtCells.filter(c=>!c.stageId)
  for(const stage of s.buildings){if(!stage.stageDesign)continue;for(const c of stageAudienceCells(stage))cells.push({...c,elevation:stage.elevation,stageId:stage.id})}
  s.stageForecourtCells=cells
}
