import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { downloadText } from './ics';

export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

/**
 * Hands a text file to the person. The website downloads it; the phone apps
 * can't download, so they save it and open the share sheet, where the
 * person picks their calendar app (or mail, Drive, and so on).
 */
export async function saveTextFile(filename: string, text: string, mime: string): Promise<SaveResult> {
  if (!Capacitor.isNativePlatform()) {
    downloadText(filename, text, mime);
    return 'downloaded';
  }
  const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: filename, files: [uri] });
    return 'shared';
  } catch (err) {
    // Closing the share sheet without picking an app rejects with "Share canceled".
    if (err instanceof Error && /cancel/i.test(err.message)) return 'cancelled';
    throw err;
  }
}
