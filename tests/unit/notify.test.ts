import { afterEach, describe, expect, it, vi } from "vitest";
import { send } from "@/lib/notify";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ntfy channel", () => {
  it("publishes JSON to the server root so emoji titles work", async () => {
    vi.stubEnv("NTFY_URL", "https://ntfy.sh/my-topic");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await send("ntfy", { title: "⏰ Deepavali — Today", body: "hello" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ntfy.sh/");
    expect(JSON.parse(init.body)).toMatchObject({ topic: "my-topic", title: "⏰ Deepavali — Today", message: "hello" });
  });

  it("refuses to send when not configured", async () => {
    vi.stubEnv("NTFY_URL", "");
    await expect(send("ntfy", { title: "x", body: "y" })).rejects.toThrow(/not configured/);
  });
});
