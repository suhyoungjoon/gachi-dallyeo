import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Coordinate } from '../types';

// 화면이 꺼지거나 앱이 백그라운드로 가도 위치를 받기 위해 expo-task-manager 태스크로 기록한다.
// 태스크는 React 바깥에서 실행되므로 세션 상태는 AsyncStorage에 저장하고, 화면은 구독해서 읽는다.
// 이 파일은 index.ts에서 import되어 defineTask가 전역 스코프에서 실행되어야 한다.

export const RUN_LOCATION_TASK = 'run-location-task';
const SESSION_KEY = 'active_run_session';

const MAX_ACCURACY_M = 50;   // 이보다 부정확한 좌표는 버림
const MAX_SPEED_MPS = 12;    // 약 43km/h 이상으로 튀는 좌표는 GPS 오차로 보고 거리에서 제외

export interface RunSession {
  status: 'running' | 'paused';
  startedAt: number;               // epoch ms
  activeMs: number;                // 직전 구간까지 누적된 달린 시간
  segmentStartedAt: number | null; // 현재 달리는 구간 시작 시각 (일시정지 중이면 null)
  distance: number;                // km
  coordinates: Coordinate[];
  lastPoint: { latitude: number; longitude: number; timestamp: number } | null;
}

function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

export function elapsedSeconds(session: RunSession, now = Date.now()): number {
  const running = session.segmentStartedAt ? now - session.segmentStartedAt : 0;
  return Math.floor((session.activeMs + running) / 1000);
}

// ---- 저장소 (태스크와 화면이 동시에 쓰지 않도록 쓰기를 직렬화) ----

let cache: RunSession | null | undefined;
let writeQueue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(s: RunSession | null) => void>();

export async function loadSession(): Promise<RunSession | null> {
  if (cache !== undefined) return cache;
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  cache = raw ? JSON.parse(raw) : null;
  return cache ?? null;
}

function mutate(fn: (s: RunSession | null) => RunSession | null): Promise<RunSession | null> {
  const next = writeQueue.then(async () => {
    const updated = fn(await loadSession());
    cache = updated;
    if (updated) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    else await AsyncStorage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l(updated));
    return updated;
  });
  writeQueue = next.catch(() => {});
  return next;
}

export function subscribeSession(listener: (s: RunSession | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// 앱이 다시 활성화될 때 디스크 값을 다시 읽음 (헤드리스로 실행된 태스크가 쓴 내용 반영)
export async function reloadSession(): Promise<RunSession | null> {
  await writeQueue;
  cache = undefined;
  const s = await loadSession();
  listeners.forEach((l) => l(s));
  return s;
}

// ---- 위치 처리 ----

function appendLocations(locations: Location.LocationObject[]) {
  return mutate((s) => {
    if (!s || s.status !== 'running' || !s.segmentStartedAt) return s;
    const segmentStart = s.segmentStartedAt;
    let { distance, lastPoint } = s;
    const coordinates = [...s.coordinates];

    const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
    for (const loc of sorted) {
      if (loc.timestamp < segmentStart) continue;
      if (loc.coords.accuracy != null && loc.coords.accuracy > MAX_ACCURACY_M) continue;
      const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp };
      if (lastPoint) {
        if (point.timestamp <= lastPoint.timestamp) continue;
        const deltaKm = haversineKm(lastPoint, point);
        const speed = (deltaKm * 1000) / ((point.timestamp - lastPoint.timestamp) / 1000);
        // 튄 좌표는 경로에서도 제외. 실제로 이동한 경우 시간이 쌓이면 속도가 정상 범위로 돌아와 다시 받아들여짐
        if (speed > MAX_SPEED_MPS) continue;
        distance += deltaKm;
      }
      lastPoint = point;
      coordinates.push({ latitude: point.latitude, longitude: point.longitude });
    }
    return { ...s, distance, lastPoint, coordinates };
  });
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(RUN_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await appendLocations(data.locations);
});

async function startUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 3,
    timeInterval: 2000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: '같이달려 · 달리기 기록 중',
      notificationBody: '화면이 꺼져도 경로와 거리를 계속 기록합니다.',
      notificationColor: '#4CAF50',
      killServiceOnDestroy: false,
    },
  });
}

async function stopUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
  }
}

// ---- 세션 제어 (화면에서 호출) ----

export async function startSession(): Promise<void> {
  const now = Date.now();
  await mutate(() => ({
    status: 'running',
    startedAt: now,
    activeMs: 0,
    segmentStartedAt: now,
    distance: 0,
    coordinates: [],
    lastPoint: null,
  }));
  try {
    await startUpdates();
  } catch (e) {
    await mutate(() => null);
    throw e;
  }
}

export async function pauseSession(): Promise<void> {
  await stopUpdates();
  const now = Date.now();
  await mutate((s) => s && s.status === 'running'
    ? { ...s, status: 'paused', activeMs: s.activeMs + (now - (s.segmentStartedAt ?? now)), segmentStartedAt: null, lastPoint: null }
    : s);
}

export async function resumeSession(): Promise<void> {
  await mutate((s) => s && s.status === 'paused' ? { ...s, status: 'running', segmentStartedAt: Date.now() } : s);
  await startUpdates();
}

// 앱이 강제 종료됐다가 다시 열렸을 때 달리는 중이던 세션이면 위치 업데이트를 다시 보장
export async function ensureUpdatesForSession(): Promise<void> {
  const s = await loadSession();
  if (s?.status === 'running') await startUpdates();
}

// 종료: 위치 업데이트를 멈추고 최종 세션 값을 돌려준 뒤 저장소를 비운다
export async function finishSession(): Promise<RunSession | null> {
  await stopUpdates();
  await writeQueue;
  const s = await loadSession();
  const final = s && s.segmentStartedAt
    ? { ...s, activeMs: s.activeMs + (Date.now() - s.segmentStartedAt), segmentStartedAt: null }
    : s;
  await mutate(() => null);
  return final;
}

export async function discardSession(): Promise<void> {
  await stopUpdates();
  await mutate(() => null);
}
