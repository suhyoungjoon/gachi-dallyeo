import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !passwordConfirm) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? '회원가입에 실패했습니다.';
      Alert.alert('회원가입 실패', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>같이달려와 함께 시작해보세요!</Text>

        <TextInput
          style={styles.input}
          placeholder="이름 (닉네임)"
          placeholderTextColor="#AAA"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#AAA"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor="#AAA"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#AAA"
          secureTextEntry
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
        />

        <TouchableOpacity
          style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.signupBtnText}>가입하기</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#4CAF50' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 36 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  signupBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupBtnDisabled: { opacity: 0.6 },
  signupBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
