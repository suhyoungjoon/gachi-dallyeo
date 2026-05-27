import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { dummyCourses } from '../data/dummyData';

export default function CourseScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>코스</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchPlaceholder}>🔍  코스 이름 검색</Text>
      </View>

      <Text style={styles.sectionTitle}>내 코스 기록</Text>
      {dummyCourses.map((course) => (
        <TouchableOpacity key={course.id} style={styles.courseCard}>
          <View style={styles.courseTop}>
            <Text style={styles.courseName}>{course.name}</Text>
            <Text style={styles.courseDistance}>{course.distance}km</Text>
          </View>

          <View style={styles.courseStats}>
            <View style={styles.courseStatItem}>
              <Text style={styles.courseStatLabel}>내 최고기록</Text>
              <Text style={styles.courseStatValue}>{course.myBest}</Text>
            </View>
            <View style={styles.courseStatItem}>
              <Text style={styles.courseStatLabel}>평균 페이스</Text>
              <Text style={styles.courseStatValue}>{course.avgPace}/km</Text>
            </View>
            <View style={styles.courseStatItem}>
              <Text style={styles.courseStatLabel}>달린 횟수</Text>
              <Text style={styles.courseStatValue}>{course.runCount}회</Text>
            </View>
          </View>

          <View style={styles.courseFooter}>
            <Text style={styles.courseParticipants}>👥 {course.participants}명이 이 코스를 달렸어요</Text>
            <Text style={styles.courseCompare}>기록 비교 ›</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addCourseButton}>
        <Text style={styles.addCourseText}>+ 새 코스 등록</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  searchBar: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchPlaceholder: { color: '#AAAAAA', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginBottom: 8, color: '#1A1A1A' },
  courseCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  courseDistance: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  courseStatItem: { alignItems: 'center' },
  courseStatLabel: { fontSize: 11, color: '#999', marginBottom: 3 },
  courseStatValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseParticipants: { fontSize: 12, color: '#888' },
  courseCompare: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  addCourseButton: {
    margin: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  addCourseText: { color: '#4CAF50', fontWeight: '600', fontSize: 15 },
});
