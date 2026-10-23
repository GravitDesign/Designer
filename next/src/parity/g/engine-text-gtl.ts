import { TLUtil } from "../../engine/text/gtl/tl-util.ts";
import { TLDirectionTextTransformer } from "../../engine/text/tl-direction-text-transformer.ts";
import { TLPathTextTransformer } from "../../engine/text/tl-path-text-transformer.ts";

// Only the names the old G barrel had (vendor module 1); the rest of the
// GTL engine was reachable only through GText.
export const engineTextGtl = {
  GTLPathTextTransformer: TLPathTextTransformer,
  GTLDirectionTextTransformer: TLDirectionTextTransformer,
  GTLUtil: TLUtil,
};
