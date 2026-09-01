// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ErrorResponse, OkResponse } from "@/types/api";

export interface ConfigBackupExportData {
  format_version: number;
  exported_at: string;
  settings: Record<string, string>;
}

export interface ConfigBackupImportData extends ConfigBackupExportData {
  imported_keys: number;
}

/** Download the full runtime configuration bundle. */
export function useExportConfigBackup() {
  return useMutation({
    mutationFn: () =>
      api
        .get("api/v1/config-backup/export")
        .json<OkResponse<ConfigBackupExportData> | ErrorResponse>(),
  });
}

/** Re-apply a previously exported settings bundle (upsert semantics). */
export function useImportConfigBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) =>
      api
        .post("api/v1/config-backup/import", {
          json: { settings },
          throwHttpErrors: false,
        })
        .json<OkResponse<ConfigBackupImportData> | ErrorResponse>(),
    onSuccess: (response) => {
      if (response.ok) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.modelGateway(),
        });
      }
    },
  });
}
