import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunRecord } from '../types';

const STORAGE_KEY = 'run_records';

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
