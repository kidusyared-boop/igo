import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ on: false, writeFile: vi.fn(), share: vi.fn(), download: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.on } }));
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Encoding: { UTF8: 'utf8' }, Filesystem: { writeFile: native.writeFile } }));
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }));
vi.mock('../services/ics', () => ({ downloadText: native.download }));

import { saveTextFile } from '../services/saveFile';

describe('saving the calendar file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.writeFile.mockResolvedValue({ uri: 'file:///cache/trip.ics' });
  });

  it('downloads on the website', async () => {
    native.on = false;
    expect(await saveTextFile('trip.ics', 'X', 'text/calendar')).toBe('downloaded');
    expect(native.download).toHaveBeenCalledWith('trip.ics', 'X', 'text/calendar');
    expect(native.share).not.toHaveBeenCalled();
  });

  it('saves and opens the share sheet in the phone apps', async () => {
    native.on = true;
    native.share.mockResolvedValue({});
    expect(await saveTextFile('trip.ics', 'X', 'text/calendar')).toBe('shared');
    expect(native.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'trip.ics', data: 'X', directory: 'CACHE' }));
    expect(native.share).toHaveBeenCalledWith({ title: 'trip.ics', files: ['file:///cache/trip.ics'] });
  });

  it('treats closing the share sheet as a cancel, not an error', async () => {
    native.on = true;
    native.share.mockRejectedValue(new Error('Share canceled'));
    expect(await saveTextFile('trip.ics', 'X', 'text/calendar')).toBe('cancelled');
  });

  it('passes real failures on', async () => {
    native.on = true;
    native.share.mockRejectedValue(new Error('No activity found'));
    await expect(saveTextFile('trip.ics', 'X', 'text/calendar')).rejects.toThrow('No activity found');
  });
});
