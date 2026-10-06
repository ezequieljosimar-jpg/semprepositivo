import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mock.request }));
import { serverEnv } from "@/lib/server-env.server";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("request-scoped server configuration", () => {
  it("reads runtime secrets without requiring process.env", () => {
    vi.stubEnv("PROGRESS_SESSION_SECRET", "");
    mock.request.mockReturnValue({
      runtime: { cloudflare: { env: { PROGRESS_SESSION_SECRET: "isolated-runtime-test-secret" } } },
    });
    expect(serverEnv("PROGRESS_SESSION_SECRET")).toBe("isolated-runtime-test-secret");
    expect(process.env["PROGRESS_SESSION_SECRET"]).toBe("");
  });
  it("does not reuse bindings between requests", () => {
    vi.stubEnv("PROGRESS_SESSION_SECRET", "");
    mock.request
      .mockReturnValueOnce({
        runtime: { cloudflare: { env: { PROGRESS_SESSION_SECRET: "first-request" } } },
      })
      .mockReturnValueOnce({});
    expect(serverEnv("PROGRESS_SESSION_SECRET")).toBe("first-request");
    expect(serverEnv("PROGRESS_SESSION_SECRET")).toBe("");
  });
  it("keeps Node development support without request bindings", () => {
    vi.stubEnv("PROGRESS_SESSION_SECRET", "isolated-node-test-secret");
    mock.request.mockImplementation(() => {
      throw new Error("no request");
    });
    expect(serverEnv("PROGRESS_SESSION_SECRET")).toBe("isolated-node-test-secret");
  });
});
