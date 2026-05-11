import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAppStore } from '../store/appStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const { documents, setActiveDocument } = useAppStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[Typography.heading2, styles.title, { color: colors.textPrimary }]}>
        My Documents
      </Text>

      {documents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[Typography.bodyMedium, { color: colors.textSecondary }]}>
            No documents yet. Upload a PDF to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                setActiveDocument(item.id);
                navigation.navigate('Chat', { documentId: item.id });
              }}
            >
              <Text style={[Typography.titleMedium, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { marginBottom: 16 },
  list: { gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, borderWidth: 1, padding: 16 },
});
