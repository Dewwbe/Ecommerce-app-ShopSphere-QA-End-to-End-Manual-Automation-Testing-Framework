import { describe, it, expect } from "vitest";
import client from "./client";

// A custom adapter avoids any real network call; it echoes the request config back.
function echoAdapter(config) {
  return Promise.resolve({ data: {}, status: 200, statusText: "OK", headers: {}, config });
}

describe("api client", () => {
  it("defaults baseURL to the gateway", () => {
    expect(client.defaults.baseURL).toBe("http://localhost:4000");
  });

  it("attaches a Bearer token when one is stored", async () => {
    localStorage.setItem("token", "abc123");
    const res = await client.get("/x", { adapter: echoAdapter });
    expect(res.config.headers.Authorization).toBe("Bearer abc123");
  });

  it("sends no Authorization header when logged out", async () => {
    const res = await client.get("/x", { adapter: echoAdapter });
    expect(res.config.headers.Authorization).toBeUndefined();
  });
});
