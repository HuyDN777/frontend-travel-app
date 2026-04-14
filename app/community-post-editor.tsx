import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AccessGate } from '@/components/auth/access-gate';
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
import { getSessionUserId, getSessionUser } from '@/utils/session';

const MAX_IMAGES = 5;

export default function CommunityPostEditorScreen() {
  const user = getSessionUser();
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isEdit = useMemo(() => !!postId, [postId]);

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


    try {
      setLoading(true);

      const uploadedUrls = pickedImageUris.length
        ? await uploadCommunityImages(pickedImageUris.map((item) => item.trim()))
        : [];
      const finalImageUrls = [...imageUrls.filter((item) => !!item.trim()), ...uploadedUrls].slice(0, MAX_IMAGES);

      const payload: CommunityPostPayload = {
        title: '', // gửi title rỗng để backend không lỗi, FE không cần nhập
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
    <AccessGate required="user">
      <ThemedView style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: palette.border }]}> 
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <ThemedText type="defaultSemiBold">{isEdit ? 'Edit Post' : 'New Post'}</ThemedText>
          <Button title="Post" onPress={handleSubmit} loading={loading} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.form}>
            <View style={styles.userRow}>
              <Image source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/100?img=12' }} style={styles.userAvatar} />
              <View style={{ marginLeft: 12 }}>
                <ThemedText type="defaultSemiBold" style={styles.userName}>{user?.fullName || user?.username || 'User'}</ThemedText>
              </View>
            </View>
            <Input
              placeholder="Chia sẻ khoảnh khắc du lịch của bạn..."
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
            <View style={styles.actionRow}>
              <Pressable onPress={handleTakePhoto} style={styles.actionIcon}><ThemedText>📷</ThemedText></Pressable>
              <Pressable onPress={handlePickImageFromLibrary} style={styles.actionIcon}><ThemedText>🖼️</ThemedText></Pressable>
              <Input placeholder="Vị trí" value={location} onChangeText={setLocation} style={styles.actionInput} />
              <Input placeholder="Chi phí ước tính" value={budget} onChangeText={setBudget} keyboardType="numeric" style={styles.actionInput} />
            </View>
          </Card>
        </ScrollView>
      </ThemedView>
    </AccessGate>
  );
}

const styles = StyleSheet.create({
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: '#E8E3D8',
    },
    userName: {
      fontSize: 16,
      color: '#222',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F8F6F2',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E8E3D8',
      marginRight: 4,
    },
    actionInput: {
      flex: 1,
      minWidth: 60,
      marginHorizontal: 2,
      backgroundColor: '#F8F6F2',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E8E3D8',
      paddingHorizontal: 8,
      fontSize: 13,
      height: 36,
    },
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
