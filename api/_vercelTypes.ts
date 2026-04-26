import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  body?: any;
  cookies: Record<string, string>;
  query: Record<string, string | string[]>;
};

export type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  send: (body?: any) => VercelResponse;
  json: (body: any) => VercelResponse;
};
