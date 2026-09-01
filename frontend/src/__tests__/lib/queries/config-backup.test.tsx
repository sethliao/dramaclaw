// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ky from "ky";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/lib/api", () => ({
  api: ky.create({ baseUrl: "http://localhost:3000/" }),
  uploadApi: ky.create({ baseUrl: "http://localhost:3000/" }),
}));

import {
  useExportConfigBackup,
  useImportConfigBackup,
} from "@/lib/queries/config-backup";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const SAMPLE_SETTINGS = {
  model_gateway_mode: "custom",
  custom_newapi_base_url: "http://127.0.0.1:8790/v1",
  custom_newapi_api_key: "drama-gateway-local",
};

describe("config-backup queries", () => {
  it("exports the full settings bundle", async () => {
    server.use(
      http.get(
        "http://localhost:3000/api/v1/config-backup/export",
        () =>
          HttpResponse.json({
            ok: true,
            data: {
              format_version: 1,
              exported_at: "2026-09-01T00:00:00Z",
              settings: SAMPLE_SETTINGS,
            },
          }),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useExportConfigBackup(), {
      wrapper: wrapper(queryClient),
    });

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(response!.ok).toBe(true);
    if (response!.ok) {
      expect(response!.data.settings.model_gateway_mode).toBe("custom");
      expect(Object.keys(response!.data.settings)).toHaveLength(3);
    }
  });

  it("imports a settings bundle and reports the imported key count", async () => {
    let postedBody: unknown;
    server.use(
      http.post(
        "http://localhost:3000/api/v1/config-backup/import",
        async ({ request }) => {
          postedBody = await request.json();
          return HttpResponse.json({
            ok: true,
            data: {
              format_version: 1,
              exported_at: "2026-09-01T00:00:00Z",
              imported_keys: 3,
              settings: SAMPLE_SETTINGS,
            },
          });
        },
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useImportConfigBackup(), {
      wrapper: wrapper(queryClient),
    });

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync(SAMPLE_SETTINGS);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postedBody).toEqual({ settings: SAMPLE_SETTINGS });
    expect(response!.ok).toBe(true);
    if (response!.ok) {
      expect(response!.data.imported_keys).toBe(3);
    }
  });

  it("surfaces an ok:false error response without throwing", async () => {
    server.use(
      http.post(
        "http://localhost:3000/api/v1/config-backup/import",
        () =>
          HttpResponse.json(
            { ok: false, error: "Field 'settings' must be an object." },
            { status: 400 },
          ),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useImportConfigBackup(), {
      wrapper: wrapper(queryClient),
    });

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>>;
    await act(async () => {
      response = await result.current.mutateAsync({});
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(response!.ok).toBe(false);
    if (!response!.ok) {
      expect(response!.error).toContain("settings");
    }
  });
});
