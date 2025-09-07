import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

const plugins = [
  resolve(),
  commonjs(),
  typescript({
    compilerOptions: {
      declaration: false,
      outDir: undefined,
    },
  }),
];

const entries = [
  { name: "index", input: "src/index.ts" },
  { name: "lnclient", input: "src/lnclient/index.ts" },
  { name: "nwc", input: "src/nwc/index.ts" },
  { name: "oauth", input: "src/oauth/index.ts" },
  { name: "webln", input: "src/webln/index.ts" },
];

const subBundles = entries.flatMap(({ name, input }) => [
  {
    input,
    plugins,
    output: {
      file: `dist/esm/${name}.js`,
      format: "esm",
      sourcemap: true,
    },
  },
  {
    input,
    plugins,
    output: {
      file: `dist/cjs/${name}.cjs`,
      format: "cjs",
      sourcemap: true,
    },
  },
  {
    input,
    plugins: [dts()],
    output: {
      file: `dist/types/${name}.d.ts`,
      format: "es",
    },
  },
]);

const umdBundle = {
  input: "src/index.ts",
  plugins: [...plugins, terser()],
  output: {
    file: "dist/alby-sdk.umd.js",
    format: "umd",
    name: "AlbySdk",
    sourcemap: true,
  },
};

export default [...subBundles, umdBundle];
