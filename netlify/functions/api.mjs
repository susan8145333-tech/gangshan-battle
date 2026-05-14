import { Buffer } from 'node:buffer';
import { Duplex, Readable, Writable } from 'node:stream';
import serverModule from '../../server.js';

function applyNetlifyEnv() {
  const env = globalThis.Netlify?.env;
  if (!env) return;
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STATE_ID']) {
    const value = env.get(key);
    if (value) process.env[key] = value;
  }
}

async function getServerModule() {
  applyNetlifyEnv();
  await serverModule.initializeGame();
  return serverModule;
}

function headersObject(headers) {
  const output = {};
  headers.forEach((value, key) => {
    output[key.toLowerCase()] = value;
  });
  return output;
}

function appendHeader(headers, name, value) {
  const key = String(name).toLowerCase();
  if (Array.isArray(value)) {
    value.forEach(item => appendHeader(headers, key, item));
    return;
  }
  if (headers.has(key)) {
    headers.append(key, String(value));
  } else {
    headers.set(key, String(value));
  }
}

function errorResponse(error) {
  return new Response(JSON.stringify({
    error: 'server error',
  }), {
    status: 500,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

class FunctionResponse extends Writable {
  constructor(resolve) {
    super();
    this.statusCode = 200;
    this.statusMessage = 'OK';
    this.headers = new Headers();
    this.chunks = [];
    this.resolve = resolve;
    this.sent = false;
    this.setHeader = (name, value) => {
      this.headers.delete(String(name).toLowerCase());
      appendHeader(this.headers, name, value);
    };
    this.getHeader = name => this.headers.get(String(name).toLowerCase());
    this.getHeaders = () => Object.fromEntries(this.headers.entries());
    this.hasHeader = name => this.headers.has(String(name).toLowerCase());
    this.removeHeader = name => this.headers.delete(String(name).toLowerCase());
    this.writeHead = (statusCode, reasonOrHeaders, maybeHeaders) => {
      this.statusCode = statusCode;
      const headers = typeof reasonOrHeaders === 'object' ? reasonOrHeaders : maybeHeaders;
      if (headers) {
        Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
      }
      return this;
    };
    this.write = (chunk, encoding, callback) => {
      if (chunk) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof callback === 'function') callback();
      return true;
    };
    this.end = (chunk, encoding, callback) => {
      if (chunk) this.write(chunk, encoding);
      if (!this.sent) {
        this.sent = true;
        const body = Buffer.concat(this.chunks);
        this.resolve(new Response(body, {
          status: this.statusCode,
          headers: this.headers,
        }));
      }
      if (typeof callback === 'function') callback();
      return this;
    };
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    callback();
  }

}

function createNodeRequest(request, body) {
  let pushed = false;
  const url = new URL(request.url);
  const nodeReq = new Readable({
    read() {
      if (pushed) return;
      pushed = true;
      if (body.length) this.push(body);
      this.push(null);
    },
  });
  nodeReq.url = `${url.pathname}${url.search}`;
  nodeReq.originalUrl = nodeReq.url;
  nodeReq.method = request.method;
  nodeReq.headers = headersObject(request.headers);
  if (body.length && !nodeReq.headers['content-length']) {
    nodeReq.headers['content-length'] = String(body.length);
  }
  const socket = new Duplex({
    read() {},
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  socket.encrypted = url.protocol === 'https:';
  socket.remoteAddress = request.headers.get('x-nf-client-connection-ip') || '';
  nodeReq.socket = socket;
  nodeReq.connection = nodeReq.socket;
  return nodeReq;
}

export default async (request) => {
  try {
    const { app } = await getServerModule();
    const body = Buffer.from(await request.arrayBuffer());
    return await new Promise(resolve => {
      const nodeReq = createNodeRequest(request, body);
      const nodeRes = new FunctionResponse(resolve);
      app.handle(nodeReq, nodeRes, error => {
        if (error) {
          console.error(error);
          resolve(errorResponse(error));
        } else if (!nodeRes.sent) {
          resolve(new Response(JSON.stringify({ error: 'not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json; charset=utf-8' },
          }));
        }
      });
    });
  } catch (error) {
    console.error(error);
    return errorResponse(error);
  }
};

export const config = {
  path: '/api/*',
};
