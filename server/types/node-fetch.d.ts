declare module 'node-fetch' {
  export default function fetch(
    url: string | URL,
    init?: RequestInit
  ): Promise<Response>;

  export interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit;
    redirect?: RequestRedirect;
    signal?: AbortSignal;
  }

  export interface Response {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Headers;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
  }

  export type HeadersInit = Headers | string[][] | Record<string, string>;
  export type BodyInit = string | ArrayBuffer | Blob | URLSearchParams;
  export type RequestRedirect = 'follow' | 'error' | 'manual';
} 