import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView,
  Platform, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useRunningTracker } from '../hooks/useRunningTracker';
import { createRun } from '../api/runs';
import { initHealthKit, getRunHealthData } from '../hooks/useHealthKit';
import { getCourses } from '../api/courses';
import { savePendingRun } from '../storage/runStorage';

interface Course { id: string; name: string; distance: number; }

type Props = NativeStackScreenProps<RootStackParamList, 'Running'>;

export default function RunningScreen({ navigation }: Props) {
  const tracker = useRunningTracker();
  const [started, setStarted] = useState(false);
  const [healthKitReady, setHealthKitReady] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      initHealthKit().then(setHealthKitReady);
    }
  }, []);

  const openCourseModal = useCallback(async () => {
    setCourseModalVisible(true);
    setLoadingCourses(true);
    try {
      const result = await getCourses();
      setCourses(result);
    } catch {}
    finally { setLoadingCourses(false); }
  }, []);

  const handleStart = async () => {
    setStarted(true);
    startTimeRef.current = new Date();
    await tracker.start();
  };

  const handlePauseResume = async () => {
    if (tracker.isPaused) await tracker.resume();
    else tracker.pause();
  };

  const handleStop = () => {
    Alert.alert('달리기 종료', '현재 기록을 저장하고 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '저장하고 종료',
        onPress: async () => {
          tracker.stop();
          if (tracker.distance > 0) {
            let healthData = null;
            if (healthKitReady && startTimeRef.current) {
              try { healthData = await getRunHealthData(startTimeRef.current, new Date()); } catch {}
            }
            const payload = {
              distance: tracker.distance,
              duration: tracker.elapsed,
              pace: tracker.pace,
              calories: healthData?.activeCalories ?? tracker.calories,
              coordinates: tracker.coordinates,
              courseId: selectedCourse?.id,
              avgHeartRate: healthData?.avgHeartRate ?? undefined,
              maxHeartRate: healthData?.maxHeartRate ?? undefined,
              minHeartRate: healthData?.minHeartRate ?? undefined,
            };
            try {
              await createRun(payload);
            } catch {
              await savePendingRun({
                localId: Date.now().toString(),
                createdAt: new Date().toISOString(),
                ...payload,
              });
              Alert.alert('임시 저장됨', '네트워크 오류로 기록이 기기에 임시 저장되었습니다.\n기록 화면을 열면 자동으로 동기화됩니다.');
            }
          }
          tracker.reset();
          navigation.goBack();
        },
      },
      {
        text: '저장 없이 종료',
        style: 'destructive',
        onPress: () => { tracker.stop(); tracker.reset(); navigation.goBack(); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {!started
          ? <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancelText}>취소</Text></TouchableOpacity>
          : <View />}
        <Text style={styles.topTitle}>달리기</Text>
        <View style={{ width: 40 }} />
      </View>

      {tracker.locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{tracker.locationError}</Text>
        </View>
      )}

      {healthKitReady && started && (
        <View style={styles.healthBanner}>
          <Text style={styles.healthBannerText}>❤️ Apple Watch 심박수 연동 중</Text>
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
          <>
            <TouchableOpacity style={styles.courseSelectBtn} onPress={openCourseModal}>
              <Text style={styles.courseSelectText}>
                {selectedCourse ? `📍 ${selectedCourse.name} (${selectedCourse.distance}km)` : '🗺️  코스 선택 (선택사항)'}
              </Text>
              {selectedCourse && (
                <TouchableOpacity onPress={() => setSelectedCourse(null)}>
                  <Text style={styles.courseSelectClear}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>▶  시작</Text>
            </TouchableOpacity>
          </>
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
      <Modal visible={courseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>코스 선택</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.noCourseBtn} onPress={() => { setSelectedCourse(null); setCourseModalVisible(false); }}>
              <Text style={styles.noCourseText}>코스 없이 달리기</Text>
            </TouchableOpacity>
            {loadingCourses ? (
              <ActivityIndicator color="#4CAF50" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={courses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.courseItem, selectedCourse?.id === item.id && styles.courseItemSelected]}
                    onPress={() => { setSelectedCourse(item); setCourseModalVisible(false); }}
                  >
                    <Text style={styles.courseItemName}>{item.name}</Text>
                    <Text style={styles.courseItemDist}>{item.distance}km</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.noCourseText}>등록된 코스가 없습니다</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  cancelText: { fontSize: 16, color: '#AAA' },
  topTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  errorBanner: { backgroundColor: '#FF3B30', marginHorizontal: 20, borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },
  healthBanner: { backgroundColor: '#1C2128', marginHorizontal: 20, borderRadius: 8, padding: 8, marginBottom: 4, alignItems: 'center' },
  healthBannerText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  statsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  mainStat: { alignItems: 'center', marginBottom: 48 },
  mainStatValue: { fontSize: 88, fontWeight: '700', color: '#FFFFFF', lineHeight: 92 },
  mainStatUnit: { fontSize: 22, color: '#4CAF50', fontWeight: '600', marginTop: -8 },
  subStats: { flexDirection: 'row', backgroundColor: '#1C2128', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 12, width: '100%', justifyContent: 'space-around' },
  subStatItem: { alignItems: 'center', flex: 1 },
  subStatValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subStatLabel: { fontSize: 12, color: '#888' },
  subStatDivider: { width: 1, backgroundColor: '#2D333B' },
  statusBadge: { alignItems: 'center', paddingVertical: 20 },
  statusText: { fontSize: 14, color: '#888' },
  runningIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  runningText: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  controls: { paddingHorizontal: 40, paddingBottom: 48 },
  startBtn: { backgroundColor: '#4CAF50', borderRadius: 40, paddingVertical: 22, alignItems: 'center' },
  startBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  activeControls: { flexDirection: 'row', gap: 20 },
  stopBtn: { flex: 1, backgroundColor: '#FF3B30', borderRadius: 40, paddingVertical: 22, alignItems: 'center' },
  stopBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  pauseBtn: { flex: 1, backgroundColor: '#1C2128', borderWidth: 2, borderColor: '#4CAF50', borderRadius: 40, paddingVertical: 22, alignItems: 'center' },
  pauseBtnText: { color: '#4CAF50', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  courseSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C2128', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  courseSelectText: { color: '#AAA', fontSize: 14 },
  courseSelectClear: { color: '#666', fontSize: 16, paddingLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1C2128', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  modalClose: { fontSize: 18, color: '#888' },
  noCourseBtn: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2D333B', marginBottom: 8 },
  noCourseText: { color: '#888', fontSize: 14 },
  courseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  courseItemSelected: { backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 8, paddingHorizontal: 8 },
  courseItemName: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  courseItemDist: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
});
