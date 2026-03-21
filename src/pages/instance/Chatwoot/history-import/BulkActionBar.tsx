import { CheckCircle2, Upload, Wand2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BulkActionBarProps = {
  selectedCount: number;
  hasJobId: boolean;
  onImportEligible: () => void;
  onImportSelected: () => void;
  onRebuildSelected: () => void;
  onClearSelection: () => void;
};

export function BulkActionBar({
  selectedCount,
  hasJobId,
  onImportEligible,
  onImportSelected,
  onRebuildSelected,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedCount === 0 && !hasJobId) return null;

  return (
    <div className="sticky bottom-0 z-10 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <Badge variant="secondary">{selectedCount} selecionado(s)</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
                <XCircle className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!hasJobId} onClick={onImportEligible}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Importar elegiveis
          </Button>
          {selectedCount > 0 && (
            <>
              <Button type="button" size="sm" disabled={!hasJobId} onClick={onImportSelected}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Importar selecionados ({selectedCount})
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={!hasJobId} onClick={onRebuildSelected}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Rebuild selecionados ({selectedCount})
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
