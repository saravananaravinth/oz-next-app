// oz-next-app/tools/fast-glob-compat/index.mjs
import glob from "./index.cjs";

const globSync = glob.sync;
export { glob, glob as async, globSync, globSync as sync };
export default glob;
