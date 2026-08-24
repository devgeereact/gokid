// Lets plain Node import a module that `require()`s bundled images.
//
// `src/lib/study.ts` opens with eleven `require("../../assets/images/*.png")` calls, because that is
// how Metro registers an asset. Node has no asset registry, so importing the catalogue throws on the
// first PNG — which is why the earlier content checks in this repo were written as regex scans over
// the source text. Those scans re-implement TypeScript badly: they cannot see a spread, an inherited
// default, or a set assembled anywhere other than one object literal, so they check the shape of the
// file rather than the shape of the data.
//
// This resolves any image import to a stub module exporting a number, which is what Metro's registry
// hands back at runtime. The audit then reads the real, fully-assembled catalogue.
//
// Used as `node --import tsx --import ./scripts/asset-hook.mjs <script>`.
import { registerHooks } from "node:module"

const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i

registerHooks({
  resolve(specifier, context, next) {
    if (IMAGE.test(specifier)) return { url: `asset-stub:${specifier}`, format: "module", shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    // Metro asset modules are opaque numbers at runtime; a stub that is one keeps every consumer
    // (`<Image source={set.hero} />`, `illustration !== undefined`) behaving as it does in the app.
    if (url.startsWith("asset-stub:")) return { format: "module", source: "export default 1", shortCircuit: true }
    return next(url, context)
  },
})
