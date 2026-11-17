import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getFirebaseSessionUser: mocks.user, isAdminUser: mocks.admin }));
vi.mock("@/lib/db/supabase-admin", () => ({ createAdminClient: () => ({ from: mocks.from, storage: { from: () => ({ download: mocks.download }) } }) }));
import { GET } from "./route";
const params = { id: "123e4567-e89b-42d3-a456-426614174001" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ uid: "admin" }); mocks.admin.mockReturnValue(true);
  mocks.from.mockReturnValue(mocks); mocks.select.mockReturnValue(mocks); mocks.eq.mockReturnValue(mocks);
  mocks.single.mockResolvedValue({ data: { storage_path: "private/path", source_url: "https://oss-hk.247fitness.hk/image.jpg" }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob(["image"], { type: "image/jpeg" }), error: null });
});
it.each([false, true])("denies anonymous and ordinary users before reading private data (logged in: %s)", async loggedIn => {
  mocks.user.mockResolvedValue(loggedIn ? { uid: "ordinary" } : null); mocks.admin.mockReturnValue(false);
  for (const suffix of ["", "?original=1"]) {
    const response = await GET(new Request(`http://localhost/image${suffix}`), { params });
    expect(response.status).toBe(loggedIn ? 403 : 401);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
  expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.download).not.toHaveBeenCalled();
});
it("serves private bytes for admins without sharing a Storage URL", async () => {
  const response = await GET(new Request("http://localhost/image"), { params });
  expect(response.status).toBe(200); expect(await response.text()).toBe("image");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("location")).toBeNull();
});
it("requires admin access to open the captured source URL", async () => {
  const response = await GET(new Request("http://localhost/image?original=1"), { params });
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://oss-hk.247fitness.hk/image.jpg");
  expect(mocks.download).not.toHaveBeenCalled();
});
it("returns 404 for missing records or bytes", async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: {} });
  expect((await GET(new Request("http://localhost/image"), { params })).status).toBe(404);
  mocks.download.mockResolvedValue({ data: null, error: {} });
  expect((await GET(new Request("http://localhost/image"), { params })).status).toBe(404);
});
