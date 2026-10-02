import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDelete'>;

const DELETED_ITEMS = [
  '계정 정보 (이름, 이메일)',
  '모든 달리기 기록과 경로',
  '작성한 게시글, 댓글, 좋아요',
  '등록한 코스, 목표, 팔로우 관계',
  '챌린지·소모임 참여 기록 (내가 만든 소모임·챌린지는 다른 멤버에게 넘어갑니다)',
];

export default function AccountDeleteScreen({ navigation }: Props) {
  const { deleteAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (!password) { Alert.alert('알림', '비밀번호를 입력해주세요.'); return; }
    Alert.alert('계정 삭제', '정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount(password);
            // 성공 시 로그아웃되어 로그인 화면으로 전환됨
          } catch (e: any) {
            setDeleting(false);
            Alert.alert('삭제 실패', e?.response?.data?.message ?? '계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={deleting}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 삭제</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>탈퇴하면 아래 데이터가 즉시 영구 삭제됩니다.</Text>
        <View style={styles.listBox}>
          {DELETED_ITEMS.map((item) => (
            <Text key={item} style={styles.listItem}>• {item}</Text>
          ))}
        </View>

        <TouchableOpacity style={styles.confirmRow} onPress={() => setConfirmed((v) => !v)}
          accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}>
          <Text style={[styles.checkbox, confirmed && styles.checkboxOn]}>{confirmed ? '✓' : ''}</Text>
          <Text style={styles.confirmText}>위 내용을 확인했으며, 데이터를 복구할 수 없다는 데 동의합니다.</Text>
        </TouchableOpacity>

        <Text style={styles.label}>본인 확인을 위해 비밀번호를 입력해주세요</Text>
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#AAA"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!deleting}
        />

        <TouchableOpacity
          style={[styles.deleteBtn, (!confirmed || deleting) && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!confirmed || deleting}
        >
          {deleting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.deleteBtnText}>계정 영구 삭제</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 16, color: '#4CAF50' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  body: { padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  listBox: { backgroundColor: '#FFF5F5', borderRadius: 12, padding: 16, marginBottom: 20 },
  listItem: { fontSize: 14, color: '#555', lineHeight: 24 },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 },
  confirmText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CCC', textAlign: 'center', lineHeight: 19, fontSize: 14, color: '#FFFFFF', overflow: 'hidden' },
  checkboxOn: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA', marginBottom: 20 },
  deleteBtn: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
