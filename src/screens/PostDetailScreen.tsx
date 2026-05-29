import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getPostDetail, addComment, toggleLike, deletePost } from '../api/posts';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const CATEGORY_COLORS: Record<string, string> = {
  후기: '#4CAF50', 질문: '#2196F3', 모임: '#FF9800', 장비: '#9C27B0',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function PostDetailScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPostDetail(postId)
      .then((d) => { setData(d.post); setIsLiked(d.isLiked); setLikeCount(d.post._count.likes); })
      .catch(() => Alert.alert('오류', '게시글을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleLike = async () => {
    try {
      const res = await toggleLike(postId);
      setIsLiked(res.liked);
      setLikeCount((prev) => prev + (res.liked ? 1 : -1));
    } catch {}
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(postId, comment.trim());
      setData((prev: any) => ({ ...prev, comments: [...prev.comments, newComment] }));
      setComment('');
    } catch {
      Alert.alert('오류', '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('삭제', '게시글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await deletePost(postId); navigation.goBack(); }
        catch { Alert.alert('오류', '삭제에 실패했습니다.'); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        {data?.userId === user?.id && (
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteText}>삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[data?.category] ?? '#888') + '20' }]}>
          <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[data?.category] ?? '#888' }]}>{data?.category}</Text>
        </View>
        <Text style={styles.title}>{data?.title}</Text>
        <View style={styles.postMeta}>
          <Text style={styles.author}>{data?.user?.name}</Text>
          <Text style={styles.date}>{timeAgo(data?.createdAt)}</Text>
        </View>
        <Text style={styles.content}>{data?.content}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
            <Text style={styles.likeBtnText}>{isLiked ? '👍' : '👍'} {likeCount}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>댓글 {data?.comments?.length ?? 0}</Text>
          {data?.comments?.map((c: any) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.user.name}</Text>
                <Text style={styles.commentDate}>{timeAgo(c.createdAt)}</Text>
              </View>
              <Text style={styles.commentContent}>{c.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="댓글을 입력하세요"
          placeholderTextColor="#AAA"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <TouchableOpacity style={styles.commentSubmit} onPress={handleComment} disabled={submitting}>
          <Text style={styles.commentSubmitText}>{submitting ? '...' : '등록'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 16, color: '#4CAF50' },
  deleteText: { fontSize: 15, color: '#FF3B30' },
  body: { flex: 1, padding: 16 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  categoryBadgeText: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  author: { fontSize: 14, fontWeight: '600', color: '#555' },
  date: { fontSize: 13, color: '#AAA' },
  content: { fontSize: 15, color: '#333', lineHeight: 24, marginBottom: 20 },
  actions: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, marginBottom: 20 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeBtnText: { fontSize: 15, color: '#555', fontWeight: '600' },
  commentSection: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  commentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  commentItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#333' },
  commentDate: { fontSize: 12, color: '#AAA' },
  commentContent: { fontSize: 14, color: '#555', lineHeight: 20 },
  commentInputRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 12, gap: 8, alignItems: 'flex-end' },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80, color: '#1A1A1A' },
  commentSubmit: { backgroundColor: '#4CAF50', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  commentSubmitText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
