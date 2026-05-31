import { useCallback, useEffect, useState } from 'react';
import { loadFileIndex, type FileEntry } from '../utils/files';

export type FileIndexStatus = 'indexing' | 'ready' | 'error';

interface UseFileIndexResult {
    fileIndex: FileEntry[];
    status: FileIndexStatus;
    reload: () => Promise<number>;
}

export function useFileIndex(cwd: string): UseFileIndexResult {
    const [fileIndex, setFileIndex] = useState<FileEntry[]>([]);
    const [status, setStatus] = useState<FileIndexStatus>('indexing');

    const reload = useCallback(async () => {
        setStatus('indexing');
        try {
            const idx = await loadFileIndex(cwd);
            setFileIndex(idx);
            setStatus('ready');
            return idx.length;
        } catch {
            setFileIndex([]);
            setStatus('error');
            return 0;
        }
    }, [cwd]);

    useEffect(() => {
        let cancelled = false;
        setStatus('indexing');
        loadFileIndex(cwd)
            .then((idx) => {
                if (!cancelled) {
                    setFileIndex(idx);
                    setStatus('ready');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFileIndex([]);
                    setStatus('error');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [cwd]);

    return { fileIndex, status, reload };
}
