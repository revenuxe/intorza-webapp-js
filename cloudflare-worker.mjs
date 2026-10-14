import app from './.open-next/worker.js';
export * from './.open-next/worker.js';
import { protectDeploymentResponse } from './src/lib/deployment-response.mjs';

export default {
  async fetch(request, env, ctx) {
    return protectDeploymentResponse(request, await app.fetch(request, env, ctx));
  },
};
