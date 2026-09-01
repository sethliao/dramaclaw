// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/confirm-dialog-host";
import {
  useExportConfigBackup,
  useImportConfigBackup,
  type ConfigBackupExportData,
} from "@/lib/queries/config-backup";

function downloadBackup(data: ConfigBackupExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `dramaclaw-config-backup-${data.exported_at.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ConfigBackupSection() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const exportMutation = useExportConfigBackup();
  const importMutation = useImportConfigBackup();

  const handleExport = async () => {
    setBusy("export");
    try {
      const response = await exportMutation.mutateAsync();
      if (response.ok) {
        downloadBackup(response.data);
        toast.success(t("settings.backup.exportSuccess"));
      } else {
        toast.error(response.error || t("settings.backup.exportFailed"));
      }
    } catch {
      toast.error(t("settings.backup.exportFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleFileChosen = async (file: File | undefined) => {
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error(t("settings.backup.invalidJson"));
      return;
    }
    const settings = (parsed as { settings?: unknown })?.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      toast.error(t("settings.backup.invalidBundle"));
      return;
    }
    const confirmed = await confirmDialog({
      title: t("settings.backup.importConfirmTitle"),
      description: t("settings.backup.importConfirm", {
        name: file.name,
        count: Object.keys(settings).length,
      }),
      confirmText: t("settings.backup.importConfirmAction"),
      confirmVariant: "destructive",
    });
    if (!confirmed) return;
    setBusy("import");
    try {
      const response = await importMutation.mutateAsync(
        settings as Record<string, string>,
      );
      if (response.ok) {
        toast.success(
          t("settings.backup.importSuccess", {
            count: response.data.imported_keys,
          }),
        );
      } else {
        toast.error(response.error || t("settings.backup.importFailed"));
      }
    } catch {
      toast.error(t("settings.backup.importFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        <h3 className="font-heading text-sm font-medium text-foreground">
          {t("settings.backup.title")}
        </h3>
        <span className="ml-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {t("settings.backup.badge")}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("settings.backup.description")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={busy !== null}
        >
          {busy === "export" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {t("settings.backup.exportButton")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "import" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {t("settings.backup.importButton")}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            handleFileChosen(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
        {t("settings.backup.hint")}
      </p>
    </section>
  );
}
