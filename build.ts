#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm, mkdir } from "fs/promises";
import path from "path";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🏗️  Bun Build Script

Usage: bun run build.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --sourcemap <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --help, -h               Show this help message

Example:
  bun run build.ts --outdir=dist --minify --sourcemap=linked --external=react,react-dom
`);
  process.exit(0);
}

const toCamelCase = (str: string): string => str.replace(/-([a-z])/g, g => g[1].toUpperCase());

const parseValue = (value: string): any => {
  if (value === "true") return true;
  if (value === "false") return false;

  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  if (value.includes(",")) return value.split(",").map(v => v.trim());

  return value;
};

function parseArgs(): Partial<Bun.BuildConfig> {
  const config: Partial<Bun.BuildConfig> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (!arg.startsWith("--")) continue;

    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    if (!arg.includes("=") && (i === args.length - 1 || args[i + 1]?.startsWith("--"))) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2) as [string, string];
    } else {
      key = arg.slice(2);
      value = args[++i] ?? "";
    }

    key = toCamelCase(key);

    if (key.includes(".")) {
      const [parentKey, childKey] = key.split(".");
      config[parentKey] = config[parentKey] || {};
      config[parentKey][childKey] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  return config;
}

const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

console.log("\n🚀 Starting build process...\n");

const cliConfig = parseArgs();
const outdir = cliConfig.outdir || path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  console.log(`🗑️ Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

const start = performance.now();

const htmlFiles = [...new Bun.Glob("**.html").scanSync("src")]
  .map(a => path.resolve("src", a))
  .filter(dir => !dir.includes("node_modules"));
const entrypoints = [path.resolve("src", "frontend.tsx")];
console.log(`📄 Found ${htmlFiles.length} HTML ${htmlFiles.length === 1 ? "file" : "files"} to process\n`);

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [plugin],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  splitting: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  entryNames: "[name]-[hash]",
  chunkNames: "chunk-[hash]",
  assetNames: "asset-[hash]",
  ...cliConfig,
});

const jsOutput = result.outputs.find(output => output.path.endsWith(".js") && !output.path.endsWith(".js.map"))?.path;
const cssOutput = result.outputs.find(output => output.path.endsWith(".css") && !output.path.endsWith(".css.map"))?.path;

console.log(`\n📌 All build outputs:`);
result.outputs.forEach(output => {
  console.log(`   ${path.basename(output.path)} (${output.kind})`);
});

let jsFilename = jsOutput ? path.basename(jsOutput) : "frontend.js";
const cssFilename = cssOutput ? path.basename(cssOutput) : "";

// Si pas de hash, ajouter un hash basé sur le contenu du fichier
if (jsFilename === "frontend.js" && jsOutput) {
  const fileContent = await Bun.file(jsOutput).text();
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fileContent));
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
  const hashedName = `frontend-${hashHex}.js`;
  const newPath = path.resolve(outdir, hashedName);
  await Bun.write(newPath, fileContent);
  jsFilename = hashedName;
  console.log(`\n✏️  Renamed ${path.basename(jsOutput)} → ${hashedName}\n`);
}

console.log(`\n📌 Final files to use:`);
console.log(`   JS: ${jsFilename}`);
console.log(`   CSS: ${cssFilename || "(none)"}\n`);


for (const htmlPath of htmlFiles) {
  const htmlName = path.basename(htmlPath);
  let htmlContent = await Bun.file(htmlPath).text();

  // Ajouter le lien CSS s'il n'existe pas déjà
  if (cssFilename && !htmlContent.includes(cssFilename)) {
    htmlContent = htmlContent.replace("</head>", `    <link rel="stylesheet" href="./${cssFilename}">\n  </head>`);
  }

  // Remplacer le script frontend.tsx par le JS généré
  const scriptTag = `<script type="module" src="./frontend.tsx"></script>`;
  htmlContent = htmlContent.replace(scriptTag, `<script type="module" src="./${jsFilename}"></script>`);

  await Bun.write(path.resolve(outdir, htmlName), htmlContent);
  console.log(`📄 Wrote HTML page: ${htmlName}`);
}

const end = performance.now();

// Copy static assets
const assets = [...new Bun.Glob("**/*.{ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,otf,eot,txt}").scanSync("src")];
for (const asset of assets) {
  const srcPath = path.resolve("src", asset);
  const destPath = path.resolve(outdir, asset);
  const destDir = path.dirname(destPath);
  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }
  await Bun.write(destPath, Bun.file(srcPath));
  console.log(`📦 Copied asset: ${asset}`);
}

const outputTable = result.outputs.map(output => ({
  File: path.relative(process.cwd(), output.path),
  Type: output.kind,
  Size: formatFileSize(output.size),
}));

console.table(outputTable);
const buildTime = (end - start).toFixed(2);

console.log(`\n✅ Build completed in ${buildTime}ms\n`);
