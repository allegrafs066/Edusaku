import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import DocumentCard from '../components/DocumentCard';
import PDFUploader from '../components/PDFUploader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const { documents, setActiveDocument, isUploadingPDF } = useAppStore();

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUploadPress() {
    // Backend engineer wires real file-picker logic here via the store / service layer.
    // For now, show a placeholder alert so the FAB is visibly interactive.
    Alert.alert(
      'Upload PDF',
      'PDF picker will be implemented by the backend engineer.',
      [{ text: 'OK' }],
    );
  }

  function handleDocumentPress(documentId: string) {
    setActiveDocument(documentId);
    navigation.navigate('Chat', { documentId });
  }

  function handleDocumentLongPress(documentId: string, title: string) {
    Alert.alert(
      title,
      'What would you like to do?',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => useAppStore.getState().removeDocument(documentId),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {documents.length === 0 ? (
        // ── Empty state ──────────────────────────────────────────────────────
        <View style={styles.emptyState}>
          {/* Illustration placeholder */}
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIconText}>📄</Text>
          </View>

          <Text style={[Typography.titleMedium, styles.emptyTitle, { color: colors.textPrimary }]}>
            No documents yet
          </Text>
          <Text style={[Typography.bodySmall, styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap the + button to upload your first PDF.{'\n'}
            Everything stays on your device.
          </Text>
        </View>
      ) : (
        // ── Document list ────────────────────────────────────────────────────
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // Extra bottom padding so last card isn't hidden behind FAB
          ListFooterComponent={<View style={styles.listFooter} />}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => handleDocumentPress(item.id)}
              onLongPress={() => handleDocumentLongPress(item.id, item.title)}
            />
          )}
        />
      )}

      {/* Floating action button */}
      <PDFUploader
        onPress={handleUploadPress}
        loading={isUploadingPDF}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  listFooter: {
    height: 96, // clears the FAB (56 + 28 bottom + buffer)
  },
});
