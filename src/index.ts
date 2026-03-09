export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export const STATUSES = [
  "request",
  "item",
  "bulk",
  "done",
  "error",
  "cancel"
] as const;

export type Status = (typeof STATUSES)[number];

export interface Frame {
  id: string;
  parent_id?: string;
  created_ms: number;
  expires_in: number;
  from?: string;
  call: string;
  status: Status;
  trace?: JsonValue;
  data: JsonObject;
}

export class FrameValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`invalid frame ${field}: ${message}`);
    this.name = "FrameValidationError";
    this.field = field;
  }
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: Status): boolean {
  return status === "done" || status === "error" || status === "cancel";
}

export function validateFrame(frame: Frame): void {
  if (frame.id.length === 0) {
    throw new FrameValidationError("id", "must not be empty");
  }
  if (frame.call.length === 0) {
    throw new FrameValidationError("call", "must not be empty");
  }
  if (!isStatus(frame.status)) {
    throw new FrameValidationError("status", "must be a supported lifecycle value");
  }
  if (frame.data === undefined) {
    throw new FrameValidationError("data", "must not be undefined");
  }
  if (typeof frame.data !== "object" || frame.data === null || Array.isArray(frame.data)) {
    throw new FrameValidationError("data", "must be a JSON object");
  }
}

export function encodeFrame(frame: Frame): string {
  validateFrame(frame);
  return JSON.stringify(frame);
}

export function decodeFrame(json: string): Frame {
  const parsed = JSON.parse(json) as Partial<Frame>;
  const frame: Frame = {
    id: parsed.id ?? "",
    created_ms: parsed.created_ms ?? 0,
    expires_in: parsed.expires_in ?? 0,
    call: parsed.call ?? "",
    status: parsed.status as Status,
    data: parsed.data === undefined ? {} : (parsed.data as Frame["data"])
  };
  if (parsed.parent_id !== undefined) {
    frame.parent_id = parsed.parent_id;
  }
  if (parsed.from !== undefined) {
    frame.from = parsed.from;
  }
  if (parsed.trace !== undefined) {
    frame.trace = parsed.trace;
  }

  validateFrame(frame);
  return frame;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
