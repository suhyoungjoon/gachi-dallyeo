import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { formatDuration } from '../hooks/useRunningTracker';
import { createCourse } from '../api/courses';

type Props = NativeStackScreenProps<RootStackParamList, 'RunDetail'>;

function getRegion(coords: { latitude: number; longitude: number }[]) {
  if (coords.length === 0) return { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.003),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.003),
  };
}

export default function RunDetailScreen({ navigation, route }: Props) {
  const { run } = route.params;
  const insets = useSafeAreaInsets();
  const coords: { latitude: number; longitude: number }[] = Array.isArray(run.coordinates) ? run.coordinates : [];
  const region = getRegion(coords);

  const [modalVisible, setModalVisible] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveAsCourse = async () => {
    if (!courseName.trim()) { Alert.alert('알림', '코스 이름을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await createCourse({
        name: courseName.trim(),
        distance: run.distance,
        description: courseDesc.trim() || undefined,
        coordinates: coords,
      });
      setModalVisible(false);
      setCourseName('');
      setCourseDesc('');
      Alert.alert('저장 완료', '코스 탭에서 확인할 수 있어요.', [{ text: '확인' }]);
    } catch {
      Alert.alert('오류', '코스 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>달리기 기록</Text>
        {coords.length > 1 ? (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text style={styles.saveAsCourse}>코스 저장</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {coords.length > 1 ? (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={region}
          scrollEnabled
          zoomEnabled
        >
          <Polyline coordinates={coords} strokeColor="#4CAF50" strokeWidth={4} />
          <Marker coordinate={coords[0]} title="출발" pinColor="#4CAF50" />
          <Marker coordinate={coords[coords.length - 1]} title="도착" pinColor="#FF3B30" />
        </MapView>
      ) : (
        <View style={styles.noMap}>
          <Text style={styles.noMapText}>경로 데이터가 없습니다</Text>
        </View>
      )}

      <ScrollView style={styles.stats} showsVerticalScrollIndicator={false}>
        <View style={styles.statGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{run.distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>거리 (km)</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(run.duration)}</Text>
            <Text style={styles.statLabel}>시간</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{run.pace}</Text>
            <Text style={styles.statLabel}>페이스 /km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{run.calories}</Text>
            <Text style={styles.statLabel}>칼로리 (kcal)</Text>
          </View>
          {run.avgHeartRate && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{run.avgHeartRate}</Text>
              <Text style={styles.statLabel}>평균 심박수 (bpm)</Text>
            </View>
          )}
          {run.maxHeartRate && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{run.maxHeartRate}</Text>
              <Text style={styles.statLabel}>최고 심박수 (bpm)</Text>
            </View>
          )}
        </View>
        {run.course && (
          <View style={styles.courseTag}>
            <Text style={styles.courseTagText}>📍 {run.course.name}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>이 경로를 코스로 저장</Text>
            <Text style={styles.modalSub}>거리 {run.distance.toFixed(2)}km · {coords.length}개 지점</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="코스 이름 (예: 한강공원 5km)"
              placeholderTextColor="#AAA"
              value={courseName}
              onChangeText={setCourseName}
            />
            <TextInput
              style={[styles.modalInput, { height: 72 }]}
              placeholder="설명 (선택)"
              placeholderTextColor="#AAA"
              value={courseDesc}
              onChangeText={setCourseDesc}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveAsCourse} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.modalConfirmText}>저장</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { fontSize: 16, color: '#4CAF50', minWidth: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  saveAsCourse: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  map: { width: '100%', height: 300 },
  noMap: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEEEEE' },
  noMapText: { fontSize: 14, color: '#AAA' },
  stats: { flex: 1, padding: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statItem: { backgroundColor: '#FFFFFF', flex: 1, minWidth: '44%', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#999' },
  courseTag: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, alignItems: 'center' },
  courseTagText: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 12, backgroundColor: '#FAFAFA' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontWeight: '700' },
});
