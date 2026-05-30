import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPosts } from '../api/posts';
import { RootStackParamList } from '../../App';

const CATEGORIES = ['전체', '후기', '질문', '모임', '장비'];
const CATEGORY_COLORS: Record<string, string> = {
  후기: '#4CAF50', 질문: '#2196F3', 모임: '#FF9800', 장비: '#9C27B0',
};

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
  _count: { comments: number; likes: number };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getPosts(selectedCategory === '전체' ? undefined : selectedCategory)
        .then((p) => { if (active) setPosts(p); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [selectedCategory])
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <TouchableOpacity style={styles.writeButton} onPress={() => navigation.navigate('WritePost')}>
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
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>게시글이 없어요</Text>
              <Text style={styles.emptyDesc}>첫 번째 글을 작성해보세요!</Text>
            </View>
          ) : (
            posts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.postCard} onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                <View style={styles.postTop}>
                  <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[post.category] ?? '#888') + '20' }]}>
                    <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[post.category] ?? '#888' }]}>{post.category}</Text>
                  </View>
                  <Text style={styles.postDate}>{timeAgo(post.createdAt)}</Text>
                </View>
                <Text style={styles.postTitle}>{post.title}</Text>
                <View style={styles.postBottom}>
                  <Text style={styles.postAuthor}>{post.user.name}</Text>
                  <View style={styles.postMeta}>
                    <Text style={styles.postMetaText}>👍 {post._count.likes}</Text>
                    <Text style={styles.postMetaText}>💬 {post._count.comments}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  writeButton: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  writeButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  categoryBar: { backgroundColor: '#FFFFFF', maxHeight: 52 },
  categoryContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  categoryChipActive: { backgroundColor: '#4CAF50' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  categoryChipTextActive: { color: '#FFFFFF' },
  postCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600' },
  postDate: { fontSize: 12, color: '#AAA' },
  postTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  postBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { fontSize: 13, color: '#888' },
  postMeta: { flexDirection: 'row', gap: 12 },
  postMetaText: { fontSize: 13, color: '#888' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#999' },
});
