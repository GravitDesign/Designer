/**
 * A stand-in for XMLHttpRequest in the font provider tests: requests are
 * recorded and answered by the test (respond, fail).
 */
import { vi } from "vitest";

export class FakeRequest {
  static sent: FakeRequest[] = [];

  method = "";
  url = "";
  responseType = "";
  status = 0;
  response: unknown = null;
  onload: ((this: FakeRequest) => void) | null = null;
  onerror: ((this: FakeRequest) => void) | null = null;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  send(): void {
    FakeRequest.sent.push(this);
  }

  respond(status: number, response: unknown): void {
    this.status = status;
    this.response = response;
    this.onload?.call(this);
  }

  fail(): void {
    this.onerror?.call(this);
  }
}

/** Installs FakeRequest as XMLHttpRequest and clears the request log. */
export function installFakeXhr(): void {
  FakeRequest.sent = [];
  vi.stubGlobal("XMLHttpRequest", FakeRequest);
}

/** The urls requested so far. */
export function requestedUrls(): string[] {
  return FakeRequest.sent.map((request) => request.url);
}
