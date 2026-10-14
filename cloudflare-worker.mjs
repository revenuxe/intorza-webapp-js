import app from './.open-next/worker.js';
export * from './.open-next/worker.js';
import { protectDeploymentResponse } from './src/lib/deployment-response.mjs';
import { protectAppRequest } from './src/lib/request-protection.mjs';

export default {
  async fetch(request, env, ctx) {
    const blocked = await protectAppRequest(request, env);
    if (blocked) return blocked;
    return protectDeploymentResponse(request, await app.fetch(request, env, ctx));
  },
};
