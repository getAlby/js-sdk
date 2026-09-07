import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const pkg = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
) as {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function run(cmd: string, args: string[], cwd: string): string {
  try {
    return execFileSync(cmd, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new Error(
      `${cmd} ${args.join(" ")}\n${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message}`,
    );
  }
}

describe("@webbtc/webln-types consumer packaging", () => {
  test("is listed in dependencies so published d.ts imports resolve", () => {
    expect(pkg.dependencies?.["@webbtc/webln-types"]).toBeTruthy();
    expect(pkg.devDependencies?.["@webbtc/webln-types"]).toBeUndefined();
  });

  test("a clean TypeScript consumer typechecks without installing webln-types by hand", () => {
    const distTypes = path.join(repoRoot, "dist/types/index.d.ts");
    if (!existsSync(distTypes)) {
      throw new Error("dist/types missing; run yarn build before yarn test");
    }

    const dir = mkdtempSync(path.join(tmpdir(), "getalby-sdk-consumer-"));
    try {
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({
          name: "getalby-sdk-webln-types-consumer",
          private: true,
          type: "module",
        }),
      );
      writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            target: "ES2022",
            strict: true,
            skipLibCheck: false,
            noEmit: true,
          },
          include: ["index.ts"],
        }),
      );
      writeFileSync(
        path.join(dir, "index.ts"),
        [
          'import { NostrWebLNProvider } from "@getalby/sdk";',
          'import { Client } from "@getalby/sdk/oauth";',
          "export type Provider = NostrWebLNProvider;",
          "export type OAuthClient = Client;",
        ].join("\n"),
      );

      run(
        "npm",
        ["pack", "--ignore-scripts", "--pack-destination", dir],
        repoRoot,
      );
      const tarball = path.join(dir, `getalby-sdk-${pkg.version}.tgz`);
      expect(existsSync(tarball)).toBe(true);

      run("npm", ["install", "--omit=dev", tarball], dir);

      const consumerPkg = JSON.parse(
        readFileSync(path.join(dir, "package.json"), "utf8"),
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      expect(consumerPkg.dependencies?.["@webbtc/webln-types"]).toBeUndefined();
      expect(
        consumerPkg.devDependencies?.["@webbtc/webln-types"],
      ).toBeUndefined();

      const tsc = path.join(repoRoot, "node_modules/typescript/bin/tsc");
      run(tsc, ["--noEmit", "-p", "tsconfig.json"], dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});
