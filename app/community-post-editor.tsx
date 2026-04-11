import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateScale } from '@/utils/responsive';
import {
  createCommunityPost,
  getCommunityPost,
  updateCommunityPost,
  uploadCommunityImage,
  type CommunityPostPayload,
} from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

export default function CommunityPostEditorScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isEdit = useMemo(() => !!postId, [postId]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const budgetHint = useMemo(() => 'Nhap so tien theo VND, co the de trong neu khong muon set.', []);

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/login');
      return;
    }

    if (!isEdit || !postId) return;

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const post = await getCommunityPost(Number(postId));
        if (!mounted) return;
        setTitle(post.title ?? '');
        setContent(post.content ?? '');
        setImageUrl(post.imageUrl ?? '');
        setPickedImageUri('');
        setLocation(post.location ?? '');
        setBudget(post.budget ? String(post.budget) : '');
      } catch (error: any) {
        Alert.alert('Error', error?.message ?? 'Khong tai duoc bai viet');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isEdit, postId]);

  async function handlePickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', fromCamera ? 'Can cap quyen camera de chup anh' : 'Can cap quyen thu vien anh de chon anh');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: false });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    if (asset.uri) {
      setPickedImageUri(asset.uri);
    }
  }

  async function handleSubmit() {
    if (!getSessionUserId()) {
      router.replace('/login');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Validation', 'Title khong duoc de trong');
      return;
    }

    try {
      setLoading(true);

      let finalImageUrl = imageUrl.trim();
      if (pickedImageUri.trim()) {
        const uploaded = await uploadCommunityImage(pickedImageUri.trim());
        finalImageUrl = uploaded.imageUrl;
      }

      const payload: CommunityPostPayload = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: finalImageUrl,
        location: location.trim(),
        budget: budget.trim() ? Number(budget) : null,
      };

      if (isEdit && postId) {
        await updateCommunityPost(Number(postId), payload);
      } else {
        await createCommunityPost(payload);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the luu bai viet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
        <ThemedText type="defaultSemiBold">{isEdit ? 'Edit Post' : 'New Post'}</ThemedText>
        <Button title="Post" onPress={handleSubmit} loading={loading} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.form}>
          <View style={styles.heroBlock}>
            <ThemedText type="defaultSemiBold">{isEdit ? 'Update your moment' : 'Share your travel moment'}</ThemedText>
            <ThemedText style={[styles.helperText, { color: palette.textMuted }]}>Chup anh hoac lay tu dien thoai, budget co the bo trong.</ThemedText>
          </View>

          <Input placeholder="Title" value={title} onChangeText={setTitle} />
          <Input
            placeholder="Share your travel moments..."
            value={content}
            onChangeText={setContent}
            multiline
            style={styles.multiline}
          />

          {pickedImageUri || imageUrl ? (
            <Image source={{ uri: pickedImageUri || imageUrl }} style={styles.imagePreview} contentFit="cover" />
          ) : null}

          <View style={styles.imageActions}>
            <Button
              title={pickedImageUri || imageUrl ? 'Doi anh' : 'Chon anh'}
              variant="secondary"
              style={styles.flexBtn}
              onPress={() => handlePickImage(false)}
            />
            <Button
              title="Chup anh"
              variant="secondary"
              style={styles.flexBtn}
              onPress={() => handlePickImage(true)}
            />
          </View>

          <Input placeholder="Location" value={location} onChangeText={setLocation} />
          <View style={styles.budgetBlock}>
            <Input placeholder="Budget (VND, optional)" value={budget} onChangeText={setBudget} keyboardType="numeric" />
            <ThemedText style={[styles.helperText, { color: palette.textMuted }]}>{budgetHint}</ThemedText>
          </View>

          <Button title={isEdit ? 'Save changes' : 'Create post'} size="lg" onPress={handleSubmit} loading={loading} />
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    padding: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
    borderRadius: Radius.xl,
  },
  heroBlock: {
    gap: Spacing.xs,
  },
  helperText: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
  },
  multiline: {
    minHeight: moderateScale(120),
    alignItems: 'flex-start',
  },
  imagePreview: {
    width: '100%',
    height: moderateScale(190),
    borderRadius: Radius.lg,
  },
  imageActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  budgetBlock: {
    gap: Spacing.xs,
  },
});
