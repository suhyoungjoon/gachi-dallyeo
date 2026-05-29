import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunRecord, PendingRun } from '../types';

const STORAGE_KEY = 'run_records';
const PENDING_KEY = 'pending_runs';

export async function saveRun(run: RunRecord): Promise<void> {
  const existing = await getAllRuns();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([run, ...existing]));
}

export async function getAllRuns(): Promise<RunRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteRun(id: string): Promise<void> {
  const existing = await getAllRuns();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter((r) => r.id !== id))
  );
}

export async function savePendingRun(run: PendingRun): Promise<void> {
  const existing = await getPendingRuns();
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([run, ...existing]));
}

export async function getPendingRuns(): Promise<PendingRun[]> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removePendingRun(localId: string): Promise<void> {
  const existing = await getPendingRuns();
  await AsyncStorage.setItem(
    PENDING_KEY,
    JSON.stringify(existing.filter((r) => r.localId !== localId))
  );
}
