import type { Journal } from "@meniere/product-core";
export interface ScreenProps {
  journal: Journal;
  busy: boolean;
  commit: (next: Journal) => Promise<boolean>;
  run: (action: () => Promise<void>) => Promise<void>;
  onEditingChange: (editing: boolean) => void;
}
