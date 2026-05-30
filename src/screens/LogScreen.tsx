import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getMyRuns, getMyStats, createRun } from '../api/runs';
import { formatDuration } from '../hooks/useRunningTracker';
import { getPendingRuns, removePendingRun } from '../storage/runStorage';
import { PendingRun } from '../types';

interface Run {
  id: string;
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  createdAt: string;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  minHeartRate?: number | null;
  course?: { id: string; name: string } | null;
}

interface Stats {
  totalRuns: number;
  totalDistance: number;
  totalDuration: number;
  monthlyRuns: number;
  monthlyDistance: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, '0'), month: String(d.getMonth() + 1).padStart(2, '0') };
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingRuns, setPendingRuns] = useState<PendingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async (active: { current: boolean }) => {
    const [serverRuns, serverStats, pending] = await Promise.all([
      getMyRuns().catch(() => []),
      getMyStats().catch(() => null),
      getPendingRuns(),
    ]);
    if (!active.current) return;
    setRuns(serverRuns);
    setStats(serverStats);
    setPendingRuns(pending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const active = { current: true };
      setLoading(true);
      loadData(active).finally(() => { if (active.current) setLoading(false); });
      return () => { active.current = false; };
    }, [loadData])
  );

  const handleSyncAll = async () => {
    if (pendingRuns.length === 0) return;
    setSyncing(true);
    let successCount = 0;
    for (const pending of pendingRuns) {
      try {
        await createRun({
          distance: pending.distance,
          duration: pending.duration,
          pace: pending.pace,
          calories: pending.calories,
          coordinates: pending.coordinates,
          courseId: pending.courseId,
          avgHeartRate: pending.avgHeartRate,
          maxHeartRate: pending.maxHeartRate,
          minHeartRate: pending.minHeartRate,
        });
        await removePendingRun(pending.localId);
        successCount++;
      } catch {}
    }
    setSyncing(false);
    if (successCount > 0) {
      Alert.alert('동기화 완료', `${successCount}개의 기록이 서버에 업로드되었습니다.`);
      const active = { current: true };
      loadData(active);
    } else {
      Alert.alert('동기화 실패', '네트워크 연결을 확인해주세요.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>운동 기록</Text>
      </View>

      {pendingRuns.length > 0 && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerLeft}>
            <Text style={styles.pendingDot}>●</Text>
            <Text style={styles.pendingBannerText}>
              미동기화 기록 {pendingRuns.length}개
            </Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncAll} disabled={syncing}>
            {syncing
              ? <ActivityIndicator color="#FF9800" size="small" />
              : <Text style={styles.syncBtnText}>동기화</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.monthSummary}>
        <Text style={styles.monthTitle}>내 전체 기록</Text>
        <View style={styles.monthStats}>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{stats?.totalDistance ?? 0}km</Text>
            <Text style={styles.monthStatLabel}>총 거리</Text>
          </View>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{stats?.totalRuns ?? 0}회</Text>
            <Text style={styles.monthStatLabel}>러닝 횟수</Text>
          </View>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{formatDuration(stats?.totalDuration ?? 0)}</Text>
            <Text style={styles.monthStatLabel}>총 시간</Text>
          </View>
        </View>
      </View>

      {pendingRuns.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>미동기화 기록</Text>
          {pendingRuns.map((run) => {
            const { day, month } = formatDate(run.createdAt);
            return (
              <View key={run.localId} style={[styles.logCard, styles.pendingCard]}>
                <View style={styles.logDate}>
                  <Text style={styles.logDay}>{day}</Text>
                  <Text style={styles.logMonth}>{month}월</Text>
                </View>
                <View style={styles.logDivider} />
                <View style={styles.logMain}>
                  <View style={styles.pendingRow}>
                    <Text style={styles.logDistance}>{run.distance.toFixed(2)} km</Text>
                    <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>미동기화</Text></View>
                  </View>
                  <View style={styles.logDetails}>
                    <Text style={styles.logDetailText}>⏱ {formatDuration(run.duration)}</Text>
                    <Text style={styles.logDetailText}>⚡ {run.pace}/km</Text>
                    <Text style={styles.logDetailText}>🔥 {run.calories}kcal</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.sectionTitle}>최근 기록</Text>

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : runs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏃</Text>
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>홈 화면에서 달리기를 시작해보세요!</Text>
        </View>
      ) : (
        runs.map((run) => {
          const { day, month } = formatDate(run.createdAt);
          return (
            <TouchableOpacity key={run.id} style={styles.logCard} onPress={() => navigation.navigate('RunDetail', { run })}>
              <View style={styles.logDate}>
                <Text style={styles.logDay}>{day}</Text>
                <Text style={styles.logMonth}>{month}월</Text>
              </View>
              <View style={styles.logDivider} />
              <View style={styles.logMain}>
                <Text style={styles.logDistance}>{run.distance.toFixed(2)} km</Text>
                {run.course && <Text style={styles.logCourse}>📍 {run.course.name}</Text>}
                <View style={styles.logDetails}>
                  <Text style={styles.logDetailText}>⏱ {formatDuration(run.duration)}</Text>
                  <Text style={styles.logDetailText}>⚡ {run.pace}/km</Text>
                  <Text style={styles.logDetailText}>🔥 {run.calories}kcal</Text>
                  {run.avgHeartRate && (
                    <Text style={styles.logDetailText}>❤️ {run.avgHeartRate}bpm</Text>
                  )}
                </View>
              </View>
              <Text style={styles.logArrow}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  pendingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8E1', marginHorizontal: 16, marginTop: 12, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendingDot: { color: '#FF9800', fontSize: 10 },
  pendingBannerText: { fontSize: 13, color: '#7A5800', fontWeight: '600' },
  syncBtn: { backgroundColor: '#FF9800', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, minWidth: 56, alignItems: 'center' },
  syncBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  monthSummary: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginVertical: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  monthTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  monthStats: { flexDirection: 'row', justifyContent: 'space-around' },
  monthStatItem: { alignItems: 'center' },
  monthStatValue: { fontSize: 20, fontWeight: '700', color: '#4CAF50' },
  monthStatLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginBottom: 8, color: '#1A1A1A' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#999' },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  pendingCard: { borderWidth: 1, borderColor: '#FFE0B2' },
  logDate: { alignItems: 'center', width: 40 },
  logDay: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  logMonth: { fontSize: 11, color: '#999' },
  logDivider: { width: 1, height: 48, backgroundColor: '#ECECEC', marginHorizontal: 14 },
  logMain: { flex: 1 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  logDistance: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pendingBadgeText: { fontSize: 10, color: '#FF9800', fontWeight: '700' },
  logCourse: { fontSize: 12, color: '#4CAF50', marginBottom: 4 },
  logDetails: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  logDetailText: { fontSize: 12, color: '#666' },
  logArrow: { fontSize: 22, color: '#CCC' },
});
