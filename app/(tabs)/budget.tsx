import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createTripExpense,
  deleteTripExpense,
  getExpenseCategoryAnalytics,
  getTripBalance,
  getTripBudgets,
  getTripExpenses,
  updateTripExpense,
  upsertTripBudget,
} from '@/services/api/finance';
import type { BudgetRow, CategoryAnalyticsRes, ExpenseRow, TripBalanceRes } from '@/types/api';
import { getMyTrips, getTripMembers, type InviteCompanionRes, type TripItem } from '@/utils/api';
import { getSessionUser, getSessionUserId } from '@/utils/session';

function formatVND(raw: string): string {
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
}

function formatDateYmd(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function BudgetScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { tripName, destination, startDate, endDate } = useLocalSearchParams<{
    tripName: string;
    destination: string;
    startDate: string;
    endDate: string;
  }>();

  const setupMode = Boolean(destination && startDate && endDate);
  const [rawAmount, setRawAmount] = useState('');

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [balance, setBalance] = useState<TripBalanceRes | null>(null);
  const [analytics, setAnalytics] = useState<CategoryAnalyticsRes[]>([]);

  const [budgetCategory, setBudgetCategory] = useState('Tổng');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Ăn uống');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState('');
  const [editingAmount, setEditingAmount] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [tripPickerVisible, setTripPickerVisible] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'to' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [memberNameById, setMemberNameById] = useState<Record<number, string>>({});

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );

  const filteredTrips = useMemo(() => {
    const q = tripSearchQuery.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) =>
      `${trip.tripName} ${trip.destination}`.toLowerCase().includes(q)
    );
  }, [trips, tripSearchQuery]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, row) => sum + (row.amount || 0), 0),
    [expenses]
  );
  useEffect(() => {
    if (setupMode) return;
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoadingTrips(true);
        const myTrips = await getMyTrips(userId);
        if (!mounted) return;
        setTrips(myTrips);
        if (myTrips.length > 0) {
          setSelectedTripId(myTrips[0].id);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Không tải được danh sách chuyến đi';
        Alert.alert('Lỗi', msg);
      } finally {
        setLoadingTrips(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, setupMode]);

  useEffect(() => {
    if (setupMode || !selectedTripId) return;
    void loadFinance(selectedTripId);
    void loadMemberNames(selectedTripId);
  }, [setupMode, selectedTripId]);

  async function loadFinance(tripId: number) {
    try {
      setLoadingFinance(true);
      const [budgetRows, expenseRows, tripBalance, chartRows] = await Promise.all([
        getTripBudgets(tripId),
        getTripExpenses(tripId, { fromDate, toDate }),
        getTripBalance(tripId),
        getExpenseCategoryAnalytics(tripId),
      ]);
      setBudgets(budgetRows);
      setExpenses(expenseRows);
      setBalance(tripBalance);
      setAnalytics(chartRows);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không tải được dữ liệu tài chính';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoadingFinance(false);
    }
  }

  async function loadMemberNames(tripId: number) {
    const currentUserId = getSessionUserId();
    if (!currentUserId) return;

    const me = getSessionUser();
    const nextMap: Record<number, string> = {
      [currentUserId]: me?.fullName || me?.username || 'Bạn',
    };

    try {
      const members = await getTripMembers(tripId, currentUserId);
      (members || []).forEach((member: InviteCompanionRes) => {
        if (typeof member?.userId !== 'number') return;
        nextMap[member.userId] = member.inviteeName || `User #${member.userId}`;
      });
    } catch {
      // Keep self-only mapping as fallback.
    }

    setMemberNameById(nextMap);
  }

  function handleChangeText(text: string) {
    setRawAmount(text.replace(/\D/g, ''));
  }

  function handleNext() {
    const amount = parseInt(rawAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Ngân sách không hợp lệ', 'Vui lòng nhập số tiền ngân sách.');
      return;
    }
    if (!destination || !startDate || !endDate) {
      Alert.alert('Lỗi', 'Thiếu thông tin chuyến đi. Vui lòng quay lại bước trước.');
      return;
    }
    router.push({
      pathname: '/(tabs)/itinerary',
      params: { tripName, destination, startDate, endDate, budget: rawAmount },
    });
  }

  async function handleSaveBudget() {
    if (!selectedTripId) return;
    const amount = Number(budgetLimit.replace(/\D/g, ''));
    if (!budgetCategory.trim() || !amount || amount <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập danh mục và hạn mức ngân sách hợp lệ.');
      return;
    }
    try {
      await upsertTripBudget(selectedTripId, {
        category: budgetCategory.trim(),
        limitAmount: amount,
      });
      setBudgetLimit('');
      await loadFinance(selectedTripId);
      Alert.alert('Thành công', 'Đã lưu ngân sách.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không lưu được ngân sách';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleAddExpense() {
    if (!selectedTripId) return;
    const amount = Number(expenseAmount.replace(/\D/g, ''));
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }
    if (!expenseCategory.trim() || !amount || amount <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Nhập danh mục và số tiền chi tiêu hợp lệ.');
      return;
    }
    try {
      await createTripExpense(selectedTripId, {
        userId,
        amount,
        category: expenseCategory.trim(),
        description: expenseDescription.trim() || undefined,
      });
      setExpenseAmount('');
      setExpenseDescription('');
      await loadFinance(selectedTripId);
      Alert.alert('Thành công', 'Đã ghi nhận chi tiêu.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thêm được chi tiêu';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleApplyDateFilter() {
    if (!selectedTripId) return;
    await loadFinance(selectedTripId);
  }

  async function handleClearDateFilter() {
    if (!selectedTripId) return;
    setFromDate('');
    setToDate('');
    await loadFinance(selectedTripId);
  }

  function openDatePicker(target: 'from' | 'to') {
    const initial =
      target === 'from'
        ? (fromDate ? new Date(`${fromDate}T00:00:00`) : new Date())
        : (toDate ? new Date(`${toDate}T00:00:00`) : new Date());
    setTempDate(initial);
    setDatePickerTarget(target);
  }

  function applyPickedDate(date: Date) {
    const value = formatDateYmd(date.toISOString());
    if (datePickerTarget === 'from') {
      setFromDate(value);
      if (toDate && toDate < value) {
        setToDate('');
      }
    } else if (datePickerTarget === 'to') {
      setToDate(value);
    }
  }

  function onDatePickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setDatePickerTarget(null);
      if (event.type === 'set' && selected) {
        applyPickedDate(selected);
      }
      return;
    }
    if (selected) setTempDate(selected);
  }

  function confirmIosDate() {
    applyPickedDate(tempDate);
    setDatePickerTarget(null);
  }

  function beginEditExpense(row: ExpenseRow) {
    setEditingExpenseId(row.id);
    setEditingCategory(row.category || '');
    setEditingAmount(String(Math.round(row.amount || 0)));
    setEditingDescription(row.description || '');
  }

  function cancelEditExpense() {
    setEditingExpenseId(null);
    setEditingCategory('');
    setEditingAmount('');
    setEditingDescription('');
  }

  async function handleUpdateExpense() {
    if (!selectedTripId || !editingExpenseId) return;
    const amount = Number(editingAmount.replace(/\D/g, ''));
    if (!editingCategory.trim() || !amount || amount <= 0) {
      Alert.alert('Thiếu dữ liệu', 'Danh mục và số tiền cập nhật chưa hợp lệ.');
      return;
    }
    try {
      await updateTripExpense(selectedTripId, editingExpenseId, {
        amount,
        category: editingCategory.trim(),
        description: editingDescription.trim() || undefined,
      });
      cancelEditExpense();
      await loadFinance(selectedTripId);
      Alert.alert('Thành công', 'Đã cập nhật chi tiêu.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không cập nhật được chi tiêu';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleDeleteExpense(expenseId: number) {
    if (!selectedTripId) return;
    Alert.alert('Xóa chi tiêu', 'Bạn chắc chắn muốn xóa giao dịch này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTripExpense(selectedTripId, expenseId);
            await loadFinance(selectedTripId);
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Không xóa được chi tiêu';
            Alert.alert('Lỗi', msg);
          }
        },
      },
    ]);
  }

  if (setupMode) {
    return (
      <View style={[styles.root, { backgroundColor: palette.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.heroContainer}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
              }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.35)', top: insets.top + Spacing.md }]}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={[Typography.bodySemi, { color: '#FFF' }]}>Thiết lập ngân sách</Text>
            </View>
          </View>

          <View style={styles.cardContainer}>
            <Card style={styles.card}>
              <View style={styles.cardInner}>
                <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
                  <Ionicons name="wallet-outline" size={28} color={palette.primary} />
                </View>

                {destination ? (
                  <Text style={[Typography.caption, { color: palette.textMuted, textAlign: 'center' }]}>
                    Chuyến đi đến <Text style={{ color: palette.text, fontWeight: '700' }}>{destination}</Text>
                  </Text>
                ) : null}

                <Text style={[Typography.titleLG, styles.cardTitle, { color: palette.text }]}>
                  Tổng ngân sách{'\n'}cho chuyến đi này là bao nhiêu?
                </Text>

                <View
                  style={[
                    styles.amountWrap,
                    { backgroundColor: palette.background, borderColor: palette.border },
                  ]}>
                  <TextInput
                    value={formatVND(rawAmount)}
                    onChangeText={handleChangeText}
                    keyboardType="numeric"
                    style={[styles.amountInput, { color: palette.text }]}
                    placeholder="0"
                    placeholderTextColor={palette.textMuted}
                  />
                  <Text style={[styles.currencySymbol, { color: palette.textMuted }]}>₫</Text>
                </View>
              </View>
            </Card>
          </View>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Button
              title="Tiếp theo →"
              size="lg"
              style={styles.footerBtn}
              onPress={handleNext}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  const maxSpent = analytics.length ? Math.max(...analytics.map((a) => a.spent || 0), 1) : 1;

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.financeContent, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled">
        <Text style={[Typography.titleLG, { color: palette.text }]}>Quản lý tài chính chuyến đi</Text>
        <Text style={[Typography.caption, { color: palette.textMuted }]}>
          Đặt ngân sách, ghi chi tiêu, theo dõi số dư và phân tích danh mục.
        </Text>

        <Card style={styles.financeCard}>
          <Text style={[Typography.bodySemi, { color: palette.text }]}>Chọn chuyến đi</Text>
          {loadingTrips ? (
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Đang tải danh sách chuyến đi...</Text>
          ) : trips.length === 0 ? (
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Bạn chưa có chuyến đi nào.</Text>
          ) : (
            <View style={styles.tripSelectWrap}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>
                {selectedTrip
                  ? `${selectedTrip.tripName} · ${selectedTrip.destination}`
                  : 'Chưa chọn chuyến đi'}
              </Text>
              <Button
                title="Chọn chuyến đi"
                variant="secondary"
                onPress={() => setTripPickerVisible(true)}
              />
            </View>
          )}
        </Card>

        {selectedTripId ? (
          <>
            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Số dư hiện tại</Text>
              <View style={styles.summaryGrid}>
                <View>
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>Tổng ngân sách</Text>
                  <Text style={[Typography.bodySemi, { color: palette.text }]}>
                    {formatVND(String(Math.round(balance?.budgetTotal || 0)))}₫
                  </Text>
                </View>
                <View>
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>Đã chi</Text>
                  <Text style={[Typography.bodySemi, { color: palette.text }]}>
                    {formatVND(String(Math.round(balance?.expenseTotal || 0)))}₫
                  </Text>
                </View>
                <View>
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>Còn lại</Text>
                  <Text
                    style={[
                      Typography.bodySemi,
                      { color: (balance?.remainingBalance || 0) >= 0 ? '#1F8A4D' : palette.danger },
                    ]}>
                    {formatVND(String(Math.round(balance?.remainingBalance || 0)))}₫
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Đặt ngân sách</Text>
              <TextInput
                value={budgetCategory}
                onChangeText={setBudgetCategory}
                placeholder="Danh mục (VD: Tổng, Ăn uống, Di chuyển)"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
              />
              <TextInput
                value={formatVND(budgetLimit)}
                onChangeText={(value) => setBudgetLimit(value.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="Hạn mức ngân sách"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
              />
              <Button title="Lưu ngân sách" onPress={() => void handleSaveBudget()} />
            </Card>

            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Ghi nhận chi tiêu</Text>
              <TextInput
                value={expenseCategory}
                onChangeText={setExpenseCategory}
                placeholder="Danh mục (VD: Ăn uống)"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
              />
              <TextInput
                value={formatVND(expenseAmount)}
                onChangeText={(value) => setExpenseAmount(value.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="Số tiền chi"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
              />
              <TextInput
                value={expenseDescription}
                onChangeText={setExpenseDescription}
                placeholder="Mô tả (tuỳ chọn)"
                placeholderTextColor={palette.textMuted}
                style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
              />
              <Button title="Thêm chi tiêu" onPress={() => void handleAddExpense()} />
            </Card>

            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Phân tích chi tiêu</Text>
              <View style={[styles.donutWrap, { backgroundColor: palette.surface }]}>
                {analytics.slice(0, 5).map((row, idx) => {
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                  return (
                    <View key={`legend-${row.category}`} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors[idx % colors.length] }]} />
                      <Text style={[Typography.caption, { color: palette.text, flex: 1 }]} numberOfLines={1}>
                        {row.category}
                      </Text>
                      <Text style={[Typography.caption, { color: palette.textMuted }]}>{row.percentage.toFixed(1)}%</Text>
                    </View>
                  );
                })}
              </View>
              {analytics.length === 0 ? (
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Chưa có dữ liệu để phân tích.</Text>
              ) : (
                analytics.map((row) => (
                  <View key={row.category} style={styles.chartRow}>
                    <View style={styles.chartHeader}>
                      <Text style={[Typography.caption, { color: palette.text }]}>{row.category}</Text>
                      <Text style={[Typography.caption, { color: palette.textMuted }]}>
                        {formatVND(String(Math.round(row.spent)))}₫ ({row.percentage.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={[styles.chartTrack, { backgroundColor: palette.border }]}>
                      <View
                        style={[
                          styles.chartFill,
                          { width: `${Math.max(6, (row.spent / maxSpent) * 100)}%`, backgroundColor: '#3B82F6' },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Lọc theo ngày</Text>
              <View style={styles.filterRow}>
                <Pressable
                  onPress={() => openDatePicker('from')}
                  style={[styles.dateField, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Ionicons name="calendar-outline" size={16} color={palette.primary} />
                  <Text style={[Typography.caption, { color: fromDate ? palette.text : palette.textMuted, flex: 1 }]}>
                    {fromDate || 'Từ ngày'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openDatePicker('to')}
                  style={[styles.dateField, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Ionicons name="calendar-outline" size={16} color={palette.primary} />
                  <Text style={[Typography.caption, { color: toDate ? palette.text : palette.textMuted, flex: 1 }]}>
                    {toDate || 'Đến ngày'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.filterActions}>
                <Button title="Áp dụng" variant="secondary" onPress={() => void handleApplyDateFilter()} />
                <Button title="Xóa lọc" variant="ghost" onPress={() => void handleClearDateFilter()} />
              </View>
            </Card>

            <Card style={styles.financeCard}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Chi tiêu gần đây</Text>
              {expenses.length === 0 ? (
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Chưa có giao dịch nào.</Text>
              ) : (
                expenses
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((row) => (
                    <View key={row.id} style={[styles.expenseRow, { borderBottomColor: palette.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.caption, { color: palette.text }]}>{row.category}</Text>
                        <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={1}>
                          {row.description || 'Không có mô tả'}
                        </Text>
                        <Text style={[Typography.caption, { color: palette.textMuted }]}>
                          {formatDateYmd(row.createdAt) || 'Không rõ ngày'}
                        </Text>
                        <Text style={[Typography.caption, { color: palette.textMuted }]}>
                          Người chi: {memberNameById[row.userId] || `User #${row.userId}`}
                        </Text>
                      </View>
                      <Pressable onPress={() => beginEditExpense(row)} style={styles.rowIconBtn}>
                        <Ionicons name="create-outline" size={18} color={palette.text} />
                      </Pressable>
                      <Pressable onPress={() => void handleDeleteExpense(row.id)} style={styles.rowIconBtn}>
                        <Ionicons name="trash-outline" size={18} color={palette.danger} />
                      </Pressable>
                      <Text style={[Typography.bodySemi, { color: palette.text }]}>
                        {formatVND(String(Math.round(row.amount || 0)))}₫
                      </Text>
                    </View>
                  ))
              )}
            </Card>

            {editingExpenseId ? (
              <Card style={styles.financeCard}>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>Chỉnh sửa chi tiêu #{editingExpenseId}</Text>
                <TextInput
                  value={editingCategory}
                  onChangeText={setEditingCategory}
                  placeholder="Danh mục"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
                />
                <TextInput
                  value={formatVND(editingAmount)}
                  onChangeText={(value) => setEditingAmount(value.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="Số tiền"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
                />
                <TextInput
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder="Mô tả"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
                />
                <View style={styles.filterActions}>
                  <Button title="Lưu chỉnh sửa" onPress={() => void handleUpdateExpense()} />
                  <Button title="Hủy" variant="ghost" onPress={cancelEditExpense} />
                </View>
              </Card>
            ) : null}

            <Text style={[Typography.caption, { color: palette.textMuted, textAlign: 'center' }]}>
              {loadingFinance ? 'Đang đồng bộ dữ liệu...' : `Tổng ${expenses.length} giao dịch, đã chi ${formatVND(String(Math.round(totalSpent)))}₫`}
            </Text>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={tripPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTripPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>Chọn chuyến đi</Text>
            <TextInput
              value={tripSearchQuery}
              onChangeText={setTripSearchQuery}
              placeholder="Tìm theo tên chuyến đi / điểm đến"
              placeholderTextColor={palette.textMuted}
              style={[styles.textInput, { color: palette.text, borderColor: palette.border }]}
            />
            <ScrollView style={styles.tripPickerList} showsVerticalScrollIndicator={false}>
              {filteredTrips.map((trip) => {
                const active = selectedTripId === trip.id;
                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => {
                      setSelectedTripId(trip.id);
                      setTripPickerVisible(false);
                    }}
                    style={[
                      styles.tripPickerItem,
                      {
                        borderColor: active ? palette.primary : palette.border,
                        backgroundColor: active ? `${palette.primary}22` : palette.background,
                      },
                    ]}>
                    <Text style={[Typography.bodySemi, { color: palette.text }]} numberOfLines={1}>
                      {trip.tripName}
                    </Text>
                    <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={1}>
                      {trip.destination} · {trip.startDate} - {trip.endDate}
                    </Text>
                  </Pressable>
                );
              })}
              {filteredTrips.length === 0 ? (
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Không có chuyến đi phù hợp.</Text>
              ) : null}
            </ScrollView>
            <Button title="Đóng" variant="ghost" onPress={() => setTripPickerVisible(false)} />
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && datePickerTarget !== null ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={
            datePickerTarget === 'to' && fromDate
              ? new Date(`${fromDate}T00:00:00`)
              : undefined
          }
          onChange={onDatePickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={datePickerTarget !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerTarget(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setDatePickerTarget(null)} />
          <View style={[styles.dateModalSheet, { backgroundColor: palette.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setDatePickerTarget(null)}>
                <Text style={[Typography.bodySemi, { color: palette.textMuted }]}>Hủy</Text>
              </Pressable>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>
                {datePickerTarget === 'from' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
              </Text>
              <Pressable onPress={confirmIosDate}>
                <Text style={[Typography.bodySemi, { color: palette.primary }]}>Xong</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={
                datePickerTarget === 'to' && fromDate
                  ? new Date(`${fromDate}T00:00:00`)
                  : undefined
              }
              onChange={onDatePickerChange}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  financeContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  heroContainer: {
    height: 260,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.card,
  },
  heroBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    ...Elevation.floating,
  },
  financeCard: {
    marginHorizontal: 0,
    marginTop: 0,
    ...Elevation.card,
  },
  cardInner: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    textAlign: 'center',
    lineHeight: 30,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  currencySymbol: {
    ...Typography.titleLG,
    fontSize: 28,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  cardContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  footerBtn: {
    width: '100%',
    borderRadius: Radius.pill,
  },
  tripSelectWrap: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterActions: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  chartRow: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTrack: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  donutWrap: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rowIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
    maxHeight: '75%',
  },
  tripPickerList: {
    maxHeight: 360,
  },
  tripPickerItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dateModalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iosPicker: {
    width: '100%',
  },
});
