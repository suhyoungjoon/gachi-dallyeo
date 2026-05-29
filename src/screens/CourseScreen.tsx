import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCourses, createCourse } from '../api/courses';
import { RootStackParamList } from '../../App';

interface Course {
  id: string;
  name: string;
  distance: number;
  description?: string | null;
  createdBy: { id: string; name: string };
  _count: { runs: number };
}

export default function CourseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [distance, setDistance] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getCourses()
        .then((c) => { if (active) setCourses(c); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleCreate = async () => {
    if (!name.trim() || !distance) { Alert.alert('알림', '코스명과 거리를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const course = await createCourse({ name: name.trim(), distance: parseFloat(distance), description: description.trim() || undefined });
      setCourses((prev) => [course, ...prev]);
      setModalVisible(false);
      setName(''); setDistance(''); setDescription('');
    } catch {
      Alert.alert('오류', '코스 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>코스</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>등록된 코스가 없어요</Text>
              <Text style={styles.emptyDesc}>첫 번째 코스를 등록해보세요!</Text>
            </View>
          ) : (
            courses.map((course) => (
              <TouchableOpacity key={course.id} style={styles.courseCard} onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}>
                <View style={styles.courseTop}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseDistance}>{course.distance}km</Text>
                </View>
                {course.description ? <Text style={styles.courseDesc}>{course.description}</Text> : null}
                <View style={styles.courseFooter}>
                  <Text style={styles.courseParticipants}>👥 {course._count.runs}번 달렸어요</Text>
                  <Text style={styles.courseBy}>by {course.createdBy.name}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.addCourseButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addCourseText}>+ 새 코스 등록</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>새 코스 등록</Text>
            <TextInput style={styles.modalInput} placeholder="코스 이름" placeholderTextColor="#AAA" value={name} onChangeText={setName} />
            <TextInput style={styles.modalInput} placeholder="거리 (km, 예: 5.2)" placeholderTextColor="#AAA" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
            <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="설명 (선택)" placeholderTextColor="#AAA" value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate} disabled={saving}>
                <Text style={styles.modalConfirmText}>{saving ? '등록 중...' : '등록'}</Text>
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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  courseCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  courseDistance: { backgroundColor: '#E8F5E9', color: '#4CAF50', fontWeight: '700', fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  courseDesc: { fontSize: 13, color: '#888', marginBottom: 10 },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  courseParticipants: { fontSize: 12, color: '#888' },
  courseBy: { fontSize: 12, color: '#AAA' },
  addCourseButton: { margin: 16, borderWidth: 2, borderColor: '#4CAF50', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  addCourseText: { color: '#4CAF50', fontWeight: '600', fontSize: 15 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 12, backgroundColor: '#FAFAFA' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontWeight: '700' },
});
