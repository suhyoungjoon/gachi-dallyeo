import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { dummyCommunityPosts } from '../data/dummyData';

const CATEGORIES = ['전체', '후기', '질문', '모임', '장비'];
const CATEGORY_COLORS: Record<string, string> = {
  후기: '#4CAF50',
  질문: '#2196F3',
  모임: '#FF9800',
  장비: '#9C27B0',
};

export default function CommunityScreen() {
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const filtered =
    selectedCategory === '전체'
      ? dummyCommunityPosts
      : dummyCommunityPosts.filter((p) => p.category === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <TouchableOpacity style={styles.writeButton}>
          <Text style={styles.writeButtonText}>글쓰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={styles.categoryContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((post) => (
          <TouchableOpacity key={post.id} style={styles.postCard}>
            <View style={styles.postTop}>
              <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[post.category] ?? '#888') + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[post.category] ?? '#888' }]}>
                  {post.category}
                </Text>
              </View>
              <Text style={styles.postDate}>{post.date}</Text>
            </View>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.postBottom}>
              <Text style={styles.postAuthor}>{post.author}</Text>
              <View style={styles.postMeta}>
                <Text style={styles.postMetaText}>👍 {post.likes}</Text>
                <Text style={styles.postMetaText}>💬 {post.comments}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  writeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  writeButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  categoryBar: { backgroundColor: '#FFFFFF', maxHeight: 52 },
  categoryContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryChipActive: { backgroundColor: '#4CAF50' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  categoryChipTextActive: { color: '#FFFFFF' },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  postTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600' },
  postDate: { fontSize: 12, color: '#AAA' },
  postTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  postBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { fontSize: 13, color: '#888' },
  postMeta: { flexDirection: 'row', gap: 12 },
  postMetaText: { fontSize: 13, color: '#888' },
});
