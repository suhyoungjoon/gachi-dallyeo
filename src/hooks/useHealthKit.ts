import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.StepCount,
    ],
    write: [],
  },
};

let initialized = false;

export async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (initialized) return true;

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) { resolve(false); return; }
      initialized = true;
      resolve(true);
    });
  });
}

export interface HeartRateSample {
  value: number;    // bpm
  startDate: string;
  endDate: string;
}

export interface HealthRunData {
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  activeCalories: number | null;
}

// 특정 시간 범위의 심박수 샘플 조회
export async function getHeartRateSamples(
  startDate: Date,
  endDate: Date
): Promise<HeartRateSample[]> {
  if (Platform.OS !== 'ios') return [];

  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };
    AppleHealthKit.getHeartRateSamples(options, (err, results: HealthValue[]) => {
      if (err || !results) { resolve([]); return; }
      resolve(
        results.map((r) => ({
          value: r.value,
          startDate: r.startDate,
          endDate: r.endDate,
        }))
      );
    });
  });
}

// 특정 시간 범위의 활성 칼로리 조회
async function getActiveCalories(startDate: Date, endDate: Date): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;

  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    AppleHealthKit.getActiveEnergyBurned(options, (err, results: HealthValue[]) => {
      if (err || !results?.length) { resolve(null); return; }
      const total = results.reduce((sum, r) => sum + r.value, 0);
      resolve(Math.round(total));
    });
  });
}

// 달리기 종료 후 전체 헬스 데이터 조회
export async function getRunHealthData(
  startDate: Date,
  endDate: Date
): Promise<HealthRunData> {
  const [samples, activeCalories] = await Promise.all([
    getHeartRateSamples(startDate, endDate),
    getActiveCalories(startDate, endDate),
  ]);

  if (!samples.length) {
    return { avgHeartRate: null, maxHeartRate: null, minHeartRate: null, activeCalories };
  }

  const values = samples.map((s) => s.value);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return { avgHeartRate: avg, maxHeartRate: max, minHeartRate: min, activeCalories };
}
