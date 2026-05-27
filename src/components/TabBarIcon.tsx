import React from 'react';
import { Text, StyleSheet } from 'react-native';

const ICONS: Record<string, { active: string; inactive: string }> = {
  home:      { active: '🏠', inactive: '🏠' },
  log:       { active: '📋', inactive: '📋' },
  course:    { active: '🗺️', inactive: '🗺️' },
  community: { active: '👥', inactive: '👥' },
  profile:   { active: '👤', inactive: '👤' },
};

type Props = { name: keyof typeof ICONS; focused: boolean };

export default function TabBarIcon({ name, focused }: Props) {
  return (
    <Text style={[styles.icon, focused && styles.focused]}>
      {ICONS[name]?.active ?? '•'}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22, opacity: 0.5 },
  focused: { opacity: 1 },
});
