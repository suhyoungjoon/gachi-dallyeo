import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Coordinate } from '../types';

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

export function useRunningTracker() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  }, [stopTimer]);

  const subscribeLocation = useCallback(async () => {
    subRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const coord: Coordinate = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCoordinates((prev) => [...prev, coord]);
        if (lastCoordRef.current) {
          const delta = haversineKm(lastCoordRef.current, coord);
          // GPS 노이즈 필터: 한 스텝에 100m 이상 점프 무시
          if (delta < 0.1) {
            setDistance((prev) => prev + delta);
          }
        }
        lastCoordRef.current = coord;
      }
    );
  }, []);

  const unsubscribeLocation = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('위치 권한이 필요합니다. 설정에서 허용해 주세요.');
      return;
    }
    setLocationError(null);
    setIsRunning(true);
    setIsPaused(false);
    startTimer();
    await subscribeLocation();
  }, [startTimer, subscribeLocation]);

  const pause = useCallback(() => {
    setIsPaused(true);
    stopTimer();
    unsubscribeLocation();
    lastCoordRef.current = null; // 재개 시 첫 좌표 기준 리셋
  }, [stopTimer, unsubscribeLocation]);

  const resume = useCallback(async () => {
    setIsPaused(false);
    startTimer();
    await subscribeLocation();
  }, [startTimer, subscribeLocation]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    stopTimer();
    unsubscribeLocation();
  }, [stopTimer, unsubscribeLocation]);

  const reset = useCallback(() => {
    setDistance(0);
    setElapsed(0);
    setCoordinates([]);
    lastCoordRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      unsubscribeLocation();
    };
  }, [stopTimer, unsubscribeLocation]);

  const distanceRounded = Math.round(distance * 100) / 100;

  return {
    isRunning,
    isPaused,
    distance: distanceRounded,
    elapsed,
    duration: formatDuration(elapsed),
    pace: formatPace(elapsed, distance),
    calories: Math.round(distanceRounded * 65), // 65 kcal/km 기준
    coordinates,
    locationError,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
