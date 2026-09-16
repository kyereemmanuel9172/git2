import { NextRequest, NextResponse } from 'next/server';
import { decompressResponse } from '@/lib/proxy-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const backendPath = pathSegments.join('/');
  const backendUrl = `${BACKEND_URL}/${backendPath}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'origin' || key.toLowerCase() === 'referer') return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const backendRes = await fetch(backendUrl, init);

  const rawBuffer = Buffer.from(await backendRes.arrayBuffer());
  const contentEncoding = backendRes.headers.get('content-encoding');
  const bodyBuffer = await decompressResponse(rawBuffer, contentEncoding);

  const responseHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return;
    if (key.toLowerCase() === 'content-encoding') return;
    if (key.toLowerCase() === 'content-length') return;
    responseHeaders.set(key, value);
  });
  responseHeaders.set('content-length', String(bodyBuffer.length));

  return new NextResponse(new Uint8Array(bodyBuffer), {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}
