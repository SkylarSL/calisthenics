import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/calisthenics", // replace with your actual repo name, e.g. "/calisthenics-skill-tree"
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
