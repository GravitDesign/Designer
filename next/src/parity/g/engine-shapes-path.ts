import { PathUtil } from "../../engine/geometry/path-util.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Shape } from "../../engine/scene/shape.ts";

// GPathBase.AnchorPoint(s), GCompoundPath.Paths and GShape.HitResult are
// reached through their owners, as in the old barrel.
export const engineShapesPath = {
  GShape: Shape,
  GPathBase: PathBase,
  GPath: Path,
  GCompoundPath: CompoundPath,
  GPathUtil: PathUtil,
  GCompoundShape: CompoundShape,
};
