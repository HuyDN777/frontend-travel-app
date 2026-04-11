import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  uploadCommunityImages,
  type CommunityPostPayload,
} from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

const MAX_IMAGES = 5;

export default function CommunityPostEditorScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isEdit = useMemo(() => !!postId, [postId]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pickedImageUris, setPickedImageUris] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);

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
        setImageUrls(post.imageUrls ?? (post.imageUrl ? [post.imageUrl] : []));
        setPickedImageUris([]);
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

  async function handlePickImageFromLibrary() {
    const currentCount = imageUrls.length + pickedImageUris.length;
    const remainingSlots = MAX_IMAGES - currentCount;
    if (remainingSlots <= 0) {
      Alert.alert('Limit', `Toi da ${MAX_IMAGES} anh cho mot bai viet`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', 'Can cap quyen thu vien anh de chon anh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.55,
      base64: false,
    });

    if (result.canceled) return;

    const uris = (result.assets ?? []).map((asset) => asset.uri).filter(Boolean);
    if (!uris.length) return;

    setPickedImageUris((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
  }

  async function handleTakePhoto() {
    const currentCount = imageUrls.length + pickedImageUris.length;
    if (currentCount >= MAX_IMAGES) {
      Alert.alert('Limit', `Toi da ${MAX_IMAGES} anh cho mot bai viet`);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', 'Can cap quyen camera de chup anh');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.55,
      base64: false,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPickedImageUris((prev) => [...prev, uri].slice(0, MAX_IMAGES));
  }

  function handleRemovePicked(uri: string) {
    setPickedImageUris((prev) => prev.filter((item) => item !== uri));
    setImageUrls((prev) => prev.filter((item) => item !== uri));
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

      const uploadedUrls = pickedImageUris.length
        ? await uploadCommunityImages(pickedImageUris.map((item) => item.trim()))
        : [];
      const finalImageUrls = [...imageUrls.filter((item) => !!item.trim()), ...uploadedUrls].slice(0, MAX_IMAGES);

      const payload: CommunityPostPayload = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: finalImageUrls[0] || undefined,
        imageUrls: finalImageUrls,
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
          <Input placeholder="Title" value={title} onChangeText={setTitle} />
          <Input
            placeholder="Share your travel moments..."
            value={content}
            onChangeText={setContent}
            multiline
            style={styles.multiline}
          />

          {[...imageUrls, ...pickedImageUris].length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
              {[...imageUrls, ...pickedImageUris].map((uri, idx) => (
                <Pressable key={`${uri}-${idx}`} onPress={() => handleRemovePicked(uri)} style={styles.previewWrap}>
                  <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                  <View style={styles.removeBadge}>
                    <ThemedText style={styles.removeBadgeText}>×</ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Button
            title={`Chon anh tu thu vien (${imageUrls.length + pickedImageUris.length}/${MAX_IMAGES})`}
            variant="secondary"
            onPress={handlePickImageFromLibrary}
          />
          <Button title="Chup anh" variant="secondary" onPress={handleTakePhoto} />

          <Input placeholder="Location" value={location} onChangeText={setLocation} />
          <Input placeholder="Budget (optional)" value={budget} onChangeText={setBudget} keyboardType="numeric" />

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
  multiline: {
    minHeight: moderateScale(120),
    alignItems: 'flex-start',
  },
  imagePreview: {
    width: moderateScale(140),
    height: moderateScale(140),
    borderRadius: Radius.lg,
  },
  previewRow: {
    gap: Spacing.sm,
  },
  previewWrap: {
    position: 'relative',
  },
  removeBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 18,
    marginTop: -1,
  },
});
