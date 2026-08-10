import type { NextConfig } from "next";

const NextConfig = {
  output: "export",
  trailingSlash: true, // avoids 404s on GitHub Pages' static file routing
  basePath: "/your-repo-name", // only needed for project pages (see note below)
  images: { unoptimized: true }, // harmless even though this app doesn't use next/image
};

module.exports = NextConfig;
