const fs = require("fs");
const path = require("path");

const dir = path.join(
  __dirname,
  "..",
  "public",
  "assets",
  "img",
  "new-document",
);

const icons = {
  uiux: [
    '<rect width="10" height="14" x="3" y="8" rx="2" />',
    '<path d="M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4" />',
    '<path d="M8 18h.01" />',
  ],
  social: ['<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />'],
  print: [
    '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />',
    '<path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />',
    '<rect x="6" y="14" width="12" height="8" rx="1" />',
  ],
  presentation: [
    '<path d="M2 3h20" />',
    '<path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />',
    '<path d="m7 21 5-5 5 5" />',
  ],
  web: [
    '<circle cx="12" cy="12" r="10" />',
    '<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />',
    '<path d="M2 12h20" />',
  ],
  video: [
    '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />',
    '<path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />',
    '<path d="m6.18 5.276 3.1 3.899" />',
    '<path d="m12.296 3.464 3.02 3.956" />',
  ],
};

const STROKE_WIDTH = "0.75";

function makeSvg(elements, strokeColor) {
  return `<!-- Lucide Icons (ISC License) - https://lucide.dev -->
<svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${strokeColor}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">
  ${elements.join("\n  ")}
</svg>
`;
}

for (const [name, elements] of Object.entries(icons)) {
  fs.writeFileSync(
    path.join(dir, `preset-${name}-white.svg`),
    makeSvg(elements, "rgb(173,173,173)"),
  );
  fs.writeFileSync(
    path.join(dir, `preset-${name}-black.svg`),
    makeSvg(elements, "rgb(114,114,114)"),
  );
  console.log(`  preset-${name}-white.svg + black.svg`);
}

console.log(`\nAll icons generated with stroke-width="${STROKE_WIDTH}"`);
