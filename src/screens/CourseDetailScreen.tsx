import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getCourseDetail } from '../api/courses';
import { formatDuration } from '../hooks/useRunningTracker';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetail'>;

export default function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourseDetail(courseId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;

  const { course, leaderboard, myBest } = data ?? {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.courseInfo}>
        <Text style={styles.courseName}>{course?.name}</Text>
        <Text style={styles.courseDistance}>{course?.distance}km</Text>
        {course?.description ? <Text style={styles.courseDesc}>{course.description}</Text> : null}
      </View>

      {myBest && (
        <View style={styles.myBestCard}>
          <Text style={styles.myBestTitle}>내 최고 기록</Text>
          <View style={styles.myBestStats}>
            <View style={styles.myBestItem}>
              <Text style={styles.myBestValue}>{formatDuration(myBest.duration)}</Text>
              <Text style={styles.myBestLabel}>시간</Text>
            </View>
            <View style={styles.myBestItem}>
              <Text style={styles.myBestValue}>{myBest.pace}/km</Text>
              <Text style={styles.myBestLabel}>페이스</Text>
            </View>
            <View style={styles.myBestItem}>
              <Text style={styles.myBestValue}>{myBest.calories}kcal</Text>
              <Text style={styles.myBestLabel}>칼로리</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>리더보드 🏆</Text>
      {leaderboard?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>아직 기록이 없어요. 첫 번째 주자가 되어보세요!</Text>
        </View>
      ) : (
        leaderboard?.map((run: any, index: number) => (
          <View key={run.id} style={[styles.leaderRow, run.userId === user?.id && styles.leaderRowMe]}>
            <Text style={[styles.rank, index < 3 && styles.rankTop]}>{index + 1}</Text>
            <Text style={styles.leaderName}>{run.user.name}{run.userId === user?.id ? ' (나)' : ''}</Text>
            <View style={styles.leaderStats}>
              <Text style={styles.leaderTime}>{formatDuration(run.duration)}</Text>
              <Text style={styles.leaderPace}>{run.pace}/km</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  backText: { fontSize: 16, color: '#4CAF50' },
  courseInfo: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12 },
  courseName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  courseDistance: { fontSize: 16, color: '#4CAF50', fontWeight: '600', marginBottom: 6 },
  courseDesc: { fontSize: 14, color: '#888' },
  myBestCard: { backgroundColor: '#4CAF50', marginHorizontal: 16, borderRadius: 14, padding: 18, marginBottom: 16 },
  myBestTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  myBestStats: { flexDirection: 'row', justifyContent: 'space-around' },
  myBestItem: { alignItems: 'center' },
  myBestValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  myBestLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginBottom: 8, color: '#1A1A1A' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 14 },
  leaderRowMe: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
  rank: { fontSize: 16, fontWeight: '700', color: '#AAA', width: 28 },
  rankTop: { color: '#FF9800' },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  leaderStats: { alignItems: 'flex-end' },
  leaderTime: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  leaderPace: { fontSize: 12, color: '#888' },
  emptyState: { alignItems: 'center', paddingVertical: 32, marginHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
});
