import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ошибки типов в node_modules не дают забилдить проект. Вынужденная мера
  },
};

export default nextConfig;
