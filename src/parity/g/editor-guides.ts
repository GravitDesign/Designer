import { ActionGuide } from "../../editor/guides/action-guide.ts";
import { BBoxGuide } from "../../editor/guides/bbox-guide.ts";
import { DistanceHelper } from "../../editor/guides/distance-helper.ts";
import { FullPixelsGuide } from "../../editor/guides/full-pixels-guide.ts";
import { GridGuide } from "../../editor/guides/grid-guide.ts";
import { Guide } from "../../editor/guides/guide.ts";
import { GuideLinesGuide } from "../../editor/guides/guide-lines-guide.ts";
import { Guides } from "../../editor/guides/guides.ts";
import { LabelGuide } from "../../editor/guides/label-guide.ts";
import { PageGuide } from "../../editor/guides/page-guide.ts";
import { PageLabelGuide } from "../../editor/guides/page-label-guide.ts";
import { PointsGuide } from "../../editor/guides/points-guide.ts";
import { SymbolLabelGuide } from "../../editor/guides/symbol-label-guide.ts";

export const editorGuides = {
  GGuide: Guide,
  GGuides: Guides,
  GBBoxGuide: BBoxGuide,
  GGridGuide: GridGuide,
  GGuideLinesGuide: GuideLinesGuide,
  GPointsGuide: PointsGuide,
  GPageGuide: PageGuide,
  GFullPixelsGuide: FullPixelsGuide,
  GLabelGuide: LabelGuide,
  GPageLabelGuide: PageLabelGuide,
  GSymbolLabelGuide: SymbolLabelGuide,
  GActionGuide: ActionGuide,
  GDistanceHelper: DistanceHelper,
};
