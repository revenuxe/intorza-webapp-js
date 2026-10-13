import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

function handler(secret?: string) {
  let callback: (request: Request) => Promise<Response>;
  let databaseCalls = 0;
  const source = fs.readFileSync(path.resolve(__dirname, '../../supabase/functions/razorpay-webhook/index.ts'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText, {
    serve: (fn: typeof callback) => { callback = fn; },
    createClient: () => { databaseCalls++; throw new Error('Test must not reach database'); },
    crypto: webcrypto, Uint8Array, TextEncoder, Response, console: { log() {}, error() {} },
    Deno: { env: { get: (name: string) => name === 'RAZORPAY_WEBHOOK_SECRET' ? secret : undefined } },
  });
  return { invoke: (request: Request) => callback(request), calls: () => databaseCalls };
}

// Only status/headers/body access is needed to exercise the rejection paths.
class Request {
  method: string;
  headers: { get: (name: string) => string | null };
  private body: string;
  constructor(_url: string, options: { method: string; body: string; headers?: Record<string, string> }) {
    this.method = options.method;
    this.body = options.body;
    this.headers = { get: name => options.headers?.[name] || null };
  }
  async text() { return this.body; }
}
class Response {
  status: number;
  constructor(_body: unknown, options: { status?: number } = {}) { this.status = options.status || 200; }
}
const { TextEncoder } = require('node:util');

describe('payment webhook authentication', () => {
  it('fails closed when the secret is missing', async () => {
    const test = handler();
    expect((await test.invoke(new Request('https://test.invalid', { method: 'POST', body: '{}' }))).status).toBe(503);
    expect(test.calls()).toBe(0);
  });
  it.each([undefined, 'invalid', '0'.repeat(64)])('rejects absent, malformed and incorrect signatures before database access', async signature => {
    const test = handler('test-secret');
    const response = await test.invoke(new Request('https://test.invalid', { method: 'POST', body: '{}', headers: signature ? { 'x-razorpay-signature': signature } : {} }));
    expect([400, 401]).toContain(response.status);
    expect(test.calls()).toBe(0);
  });
});
