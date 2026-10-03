import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import {
  emptyJournal,
  migrateJournal,
  validateJournal,
  type Journal,
  type JournalPort,
  type Language,
  type BackupPort,
} from "@meniere/product-core";

const keyOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const temporaryDirectory = new Directory(Paths.cache, "journal-sharing");
const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`;
export const clock = {
  now: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};
export const ids = { next: () => Crypto.randomUUID() };

async function protectDirectory(directory: Directory) {
  directory.create({ idempotent: true });
  if (Platform.OS === "ios")
    await requireNativeModule("JournalPrivacy").excludeFromBackup(
      directory.uri,
    );
}
export function cleanTemporaryFiles() {
  if (temporaryDirectory.exists) temporaryDirectory.delete();
  temporaryDirectory.create({ idempotent: true });
}
async function unlock(db: SQLite.SQLiteDatabase, key: string) {
  await db.execAsync(`PRAGMA key = ${sqlString(key)};`);
  const cipher = await db.getFirstAsync<{ cipher_version: string }>(
    "PRAGMA cipher_version",
  );
  if (!cipher?.cipher_version) throw new Error("ENCRYPTION_UNAVAILABLE");
}

export class EncryptedJournal implements JournalPort, BackupPort {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly directory: Directory;
  private readonly keyName: string;
  constructor(
    private language: Language,
    private namespace: "journal" | "qa" = "journal",
  ) {
    this.directory = new Directory(Paths.document, `private-${namespace}`);
    this.keyName = `meniere-${namespace}-database-key-v1`;
  }
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
  get databaseUri() {
    return new File(this.directory, "journal.db").uri;
  }
  private async open() {
    if (this.db) return this.db;
    await protectDirectory(this.directory);
    let key = await SecureStore.getItemAsync(this.keyName, keyOptions);
    const exists = new File(this.directory, "journal.db").exists;
    if (exists && !key) throw new Error("KEY_UNAVAILABLE");
    // iOS keychain entries may survive uninstall. A new empty installation gets a new key.
    if (!exists || !key) {
      key = Array.from(await Crypto.getRandomBytesAsync(32), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      await SecureStore.setItemAsync(this.keyName, key, keyOptions);
    }
    const db = await SQLite.openDatabaseAsync(
      "journal.db",
      {},
      this.directory.uri,
    );
    try {
      await unlock(db, key);
      const version = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if ((version?.user_version ?? 0) > 2) throw new Error("NEWER_DATABASE");
      await db.execAsync(
        "PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON; CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); PRAGMA user_version = 2;",
      );
      this.db = db;
      return db;
    } catch (error) {
      await db.closeAsync();
      throw error;
    }
  }
  async load(): Promise<Journal> {
    const db = await this.open();
    const row = await db.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM journal WHERE id = 1",
    );
    if (!row) return emptyJournal(this.language);
    const raw: unknown = JSON.parse(row.payload);
    const journal = migrateJournal(raw);
    if (
      (raw as { schemaVersion: number }).schemaVersion !== journal.schemaVersion
    )
      await this.save(journal);
    return journal;
  }
  async save(journal: Journal): Promise<void> {
    validateJournal(journal);
    const db = await this.open();
    // The whole snapshot is one atomic SQLite statement on the unlocked connection.
    // Expo's exclusive transaction opens another connection without the SQLCipher key.
    await db.runAsync(
      "INSERT INTO journal (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
      JSON.stringify(journal),
    );
  }
  async erase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
    if (this.directory.exists) this.directory.delete();
    await SecureStore.deleteItemAsync(this.keyName, keyOptions);
    if (this.namespace === "journal") cleanTemporaryFiles();
  }
  async create(password: string): Promise<string> {
    if (password.length < 12 || password.length > 1024)
      throw new Error("PASSWORD_LENGTH");
    const db = await this.open();
    const file = new File(
      temporaryDirectory,
      `Meniere-Journal-${Crypto.randomUUID()}.mjb`,
    );
    let attached = false;
    try {
      await db.runAsync(
        "ATTACH DATABASE ? AS manual_backup KEY ?",
        file.uri.replace(/^file:\/\//, ""),
        password,
      );
      attached = true;
      await db.getFirstAsync("SELECT sqlcipher_export('manual_backup')");
      await db.execAsync("PRAGMA manual_backup.user_version = 2");
      await db.execAsync("DETACH DATABASE manual_backup");
      attached = false;
      return file.uri;
    } catch (error) {
      if (attached)
        await db.execAsync("DETACH DATABASE manual_backup").catch(() => {});
      if (file.exists) file.delete();
      throw error;
    }
  }
  async inspect(uri: string, password: string): Promise<Journal> {
    const source = new File(uri);
    if (!source.exists || source.size > 50 * 1024 * 1024)
      throw new Error("INVALID_BACKUP");
    const file = new File(
      temporaryDirectory,
      `restore-${Crypto.randomUUID()}.mjb`,
    );
    await source.copy(file);
    const db = await SQLite.openDatabaseAsync(
      file.name,
      {},
      temporaryDirectory.uri,
    );
    try {
      await unlock(db, password);
      const integrity = await db.getAllAsync("PRAGMA cipher_integrity_check");
      if (integrity.length) throw new Error("BACKUP_INTEGRITY_FAILED");
      const version = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if (![1, 2].includes(version?.user_version ?? 0))
        throw new Error("BACKUP_VERSION_INVALID");
      const row = await db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM journal WHERE id = 1",
      );
      if (!row) throw new Error("BACKUP_RECORDS_MISSING");
      const raw: unknown = JSON.parse(row.payload);
      if (
        (raw as { schemaVersion: number }).schemaVersion !==
        version?.user_version
      )
        throw new Error("BACKUP_VERSION_INVALID");
      return migrateJournal(raw);
    } finally {
      await db.closeAsync();
      if (file.exists) file.delete();
    }
  }
  async dispose(): Promise<void> {
    cleanTemporaryFiles();
  }
}
