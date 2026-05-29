import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { createPost } from '../api/posts';

const CATEGORIES = ['후기', '질문', '모임', '장비'];

type Props = NativeStackScreenProps<RootStackParamList, 'WritePost'>;

export default function WritePostScreen({ navigation }: Props) {
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!category) { Alert.alert('알림', '카테고리를 선택해주세요.'); return; }
    if (!title.trim()) { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    if (!content.trim()) { Alert.alert('알림', '내용을 입력해주세요.'); return; }
    setLoading(true);
    try {
      await createPost({ category, title: title.trim(), content: content.trim() });
      navigation.goBack();
    } catch {
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>글쓰기</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#4CAF50" /> : <Text style={styles.submitText}>등록</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력해주세요"
          placeholderTextColor="#AAA"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>내용</Text>
        <TextInput
          style={styles.contentInput}
          placeholder="내용을 입력해주세요"
          placeholderTextColor="#AAA"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cancelText: { fontSize: 16, color: '#666' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 16 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
  categoryChipActive: { backgroundColor: '#4CAF50' },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: '#666' },
  categoryChipTextActive: { color: '#FFFFFF' },
  titleInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  contentInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA', minHeight: 200 },
});
