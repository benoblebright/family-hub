import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 음성 답장 업로드 (1~2분 녹음)
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
