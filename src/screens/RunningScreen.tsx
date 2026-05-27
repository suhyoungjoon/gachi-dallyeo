import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useRunningTracker } from '../hooks/useRunningTracker';
import { saveRun } from '../storage/runStorage';
import { RunRecord } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Running'>;

export default function RunningScreen({ navigation }: Props) {
  const tracker = useRunningTracker();
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    setStarted(true);
    await tracker.start();
  };

  const handlePauseResume = async () => {
    if (tracker.isPaused) {
      await tracker.resume();
    } else {
      tracker.pause();
    }
  };

  const handleStop = () => {
    Alert.alert('달리기 종료', '현재 기록을 저장하고 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '저장하고 종료',
        onPress: async () => {
          tracker.stop();
          if (tracker.distance > 0) {
            const record: RunRecord = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              distance: tracker.distance,
              duration: tracker.elapsed,
              pace: tracker.pace,
              calories: tracker.calories,
              coordinates: tracker.coordinates,
            };
            await saveRun(record);
          }
          tracker.reset();
          navigation.goBack();
        },
      },
      {
        text: '저장 없이 종료',
        style: 'destructive',
        onPress: () => {
          tracker.stop();
          tracker.reset();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {!started ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.topTitle}>달리기</Text>
        <View style={{ width: 40 }} />
      </View>

      {tracker.locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{tracker.locationError}</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{tracker.distance.toFixed(2)}</Text>
          <Text style={styles.mainStatUnit}>km</Text>
        </View>

        <View style={styles.subStats}>
          <View style={styles.subStatItem}>
            <Text style={styles.subStatValue}>{tracker.duration}</Text>
            <Text style={styles.subStatLabel}>시간</Text>
          </View>
          <View style={styles.subStatDivider} />
          <View style={styles.subStatItem}>
            <Text style={styles.subStatValue}>{tracker.pace}</Text>
            <Text style={styles.subStatLabel}>페이스 /km</Text>
          </View>
          <View style={styles.subStatDivider} />
          <View style={styles.subStatItem}>
            <Text style={styles.subStatValue}>{tracker.calories}</Text>
            <Text style={styles.subStatLabel}>칼로리</Text>
          </View>
        </View>
      </View>

      <View style={styles.statusBadge}>
        {!started && <Text style={styles.statusText}>시작 버튼을 눌러 달리기를 시작하세요</Text>}
        {started && tracker.isPaused && <Text style={styles.statusText}>일시정지됨</Text>}
        {started && tracker.isRunning && !tracker.isPaused && (
          <View style={styles.runningIndicator}>
            <View style={styles.runningDot} />
            <Text style={styles.runningText}>기록 중</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {!started ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>▶  시작</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
              <Text style={styles.stopBtnText}>■{'\n'}종료</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseResume}>
              <Text style={styles.pauseBtnText}>
                {tracker.isPaused ? '▶\n재개' : '❚❚\n일시정지'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cancelText: { fontSize: 16, color: '#AAA' },
  topTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  errorBanner: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainStat: { alignItems: 'center', marginBottom: 48 },
  mainStatValue: { fontSize: 88, fontWeight: '700', color: '#FFFFFF', lineHeight: 92 },
  mainStatUnit: { fontSize: 22, color: '#4CAF50', fontWeight: '600', marginTop: -8 },
  subStats: {
    flexDirection: 'row',
    backgroundColor: '#1C2128',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    width: '100%',
    justifyContent: 'space-around',
  },
  subStatItem: { alignItems: 'center', flex: 1 },
  subStatValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subStatLabel: { fontSize: 12, color: '#888' },
  subStatDivider: { width: 1, backgroundColor: '#2D333B' },
  statusBadge: { alignItems: 'center', paddingVertical: 20 },
  statusText: { fontSize: 14, color: '#888' },
  runningIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  runningText: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  controls: { paddingHorizontal: 40, paddingBottom: 48 },
  startBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 40,
    paddingVertical: 22,
    alignItems: 'center',
  },
  startBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  activeControls: { flexDirection: 'row', gap: 20 },
  stopBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 40,
    paddingVertical: 22,
    alignItems: 'center',
  },
  stopBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#1C2128',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 40,
    paddingVertical: 22,
    alignItems: 'center',
  },
  pauseBtnText: { color: '#4CAF50', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
