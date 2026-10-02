import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import {
  RunSession, elapsedSeconds, loadSession, reloadSession, subscribeSession,
  startSession, pauseSession, resumeSession, finishSession, discardSession, ensureUpdatesForSession,
} from '../tasks/runSession';

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secs: number, km: number): string {
  if (km < 0.01) return "--'--\"";
  const ps = secs / km;
  const m = Math.floor(ps / 60);
  const s = Math.floor(ps % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export interface RunSummary {
  distance: number;
  elapsed: number;
  pace: string;
  calories: number;
  coordinates: RunSession['coordinates'];
  startedAt: Date;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const caloriesFor = (km: number) => Math.round(km * 65); // 65 kcal/km 기준

// 실제 위치 기록은 백그라운드 태스크(tasks/runSession)가 담당하고, 이 훅은 그 세션을 화면에 보여준다.
export function useRunningTracker() {
  const [session, setSession] = useState<RunSession | null>(null);
  const [restored, setRestored] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setRestored(!!s);
      if (s) ensureUpdatesForSession().catch(() => {});
    });
    const unsubscribe = subscribeSession(setSession);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') reloadSession();
    });
    return () => { mounted = false; unsubscribe(); appState.remove(); };
  }, []);

  const isRunning = !!session;
  const isPaused = session?.status === 'paused';

  // 경과 시간은 타임스탬프로 계산하므로 화면이 꺼져 있던 동안도 정확하다. 여기선 표시만 1초마다 갱신.
  useEffect(() => {
    if (!isRunning || isPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning, isPaused]);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('위치 권한이 필요합니다. 설정에서 허용해 주세요.');
      return false;
    }
    try {
      await startSession();
      setLocationError(null);
      setNow(Date.now());
      return true;
    } catch {
      setLocationError('위치 기록을 시작하지 못했습니다. 위치 서비스가 켜져 있는지 확인해 주세요.');
      return false;
    }
  }, []);

  const pause = useCallback(() => pauseSession(), []);

  const resume = useCallback(async () => {
    try {
      await resumeSession();
      setNow(Date.now());
    } catch {
      setLocationError('위치 기록을 재개하지 못했습니다.');
    }
  }, []);

  // 종료 시점의 최종 기록을 돌려준다 (저장용)
  const stop = useCallback(async (): Promise<RunSummary | null> => {
    const final = await finishSession();
    if (!final) return null;
    const elapsed = elapsedSeconds(final);
    const distance = round2(final.distance);
    return {
      distance,
      elapsed,
      pace: formatPace(elapsed, final.distance),
      calories: caloriesFor(distance),
      coordinates: final.coordinates,
      startedAt: new Date(final.startedAt),
    };
  }, []);

  const discard = useCallback(() => discardSession(), []);

  const elapsed = session ? elapsedSeconds(session, now) : 0;
  const distance = round2(session?.distance ?? 0);

  return {
    isRunning,
    isPaused,
    restored,
    distance,
    elapsed,
    duration: formatDuration(elapsed),
    pace: formatPace(elapsed, session?.distance ?? 0),
    calories: caloriesFor(distance),
    coordinates: session?.coordinates ?? [],
    startedAt: session ? new Date(session.startedAt) : null,
    locationError,
    start,
    pause,
    resume,
    stop,
    discard,
  };
}
