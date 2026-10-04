import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import {
  csvExport,
  type DocumentPort,
  type SharePort,
} from "@meniere/product-core";
import { temporaryDirectory } from "./storage";
import { renderSummary } from "./document-renderer";
export const documents: DocumentPort = {
  async preview(summary, language) {
    // Android resolves when the print window opens, before it reads its content.
    // Pass HTML so the native print adapter owns the preview's lifetime.
    await Print.printAsync({
      html: renderSummary(summary, language),
      width: 595,
      height: 842,
    });
  },
  async pdf(summary, language) {
    const printed = await Print.printToFileAsync({
      html: renderSummary(summary, language),
      width: 595,
      height: 842,
    });
    const file = new File(
      temporaryDirectory,
      `Meniere-Journal-${Date.now()}.pdf`,
    );
    await new File(printed.uri).move(file);
    return file.uri;
  },
  async csv(journal) {
    const file = new File(
      temporaryDirectory,
      `Meniere-Journal-${Date.now()}.csv`,
    );
    file.write(csvExport(journal));
    return file.uri;
  },
};
export const sharing: SharePort = {
  async share(uri, mime) {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("SHARING_UNAVAILABLE");
    // Choosing a receiver does not mean it has finished reading the file.
    // Shared files stay in private cache until the next app initialization/erase.
    await Sharing.shareAsync(uri, {
      mimeType: mime,
      UTI:
        mime === "application/pdf"
          ? "com.adobe.pdf"
          : mime === "text/csv"
            ? "public.comma-separated-values-text"
            : "public.data",
    });
  },
};
