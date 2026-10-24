// Old: chunk.vendor.js module 913 (big.js, embedded).
//
// The bundle embeds big.js 6.2.2 (sqrt and toNumber go through
// `+stringify(...)`, which 6.2.1 doesn't). The precise intersection
// variants use it with the default configuration (DP 20, RM 1, strict
// off), so Number(big) and Math.pow(big, ...) convert through valueOf as
// in the old code. This is the only file that imports the package.
import Big from "big.js";

export { Big };
