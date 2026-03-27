/**
 * Dashboard screen (index.tsx)
 * Shows: balance summary cards, spending pie chart, 7-day line chart, recent transactions.
 */

  import { MaterialCommunityIcons } from '@expo/vector-icons';
  import React, { useCallback, useState } from 'react';
  import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
  } from 'react-native';
  import { LineChart, PieChart } from 'react-native-gifted-charts';
  import { SafeAreaView } from 'react-native-safe-area-context';

  import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/categories';
  import { checkAndSaveSms } from '@/services/smsService';
  import { syncTransactions } from '@/services/syncService';
  import { useTransactions } from '@/hooks/useTransactions';
  import { useAuth } from '@/contexts/AuthContext';
  import type { Category } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c      = isDark ? DARK : LIGHT;

  const { signOut } = useAuth();
  const { transactions, summary, categoryTotals, dailyTotals, loading, reload } = useTransactions();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Pull-to-refresh: check new SMS then reload
  const onRefresh = useCallback(async () => {
    await checkAndSaveSms();
    await reload();
  }, [reload]);

  // Sync button in header
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg('');
    const result = await syncTransactions();
    setSyncing(false);
    if (result.authExpired) {
      setSyncMsg('Session expired. Please sign in again.');
      signOut();
      return;
    }
    setSyncMsg(
      result.error
        ? `Sync failed: ${result.error}`
        : `✓ Synced ${result.synced} transaction${result.synced !== 1 ? 's' : ''}`
    );
    setTimeout(() => setSyncMsg(''), 4000);
  }, [signOut]);

  // ── Pie chart data — spending by category ─────────────────────────────────
  const pieData = categoryTotals.slice(0, 6).map((ct) => ({
    value:         Math.round(ct.total),
    color:         CATEGORY_COLORS[ct.category],
    text:          CATEGORY_ICONS[ct.category],
    focused:       false,
  }));

  // ── Line chart data — last 7 days expenses ────────────────────────────────
  const lineData = dailyTotals.map((d) => ({
    value:          Math.round(d.expense),
    label:          d.date.slice(8), // DD
    dataPointColor: '#3B82F6',
  }));

  const recentTxns = transactions.slice(0, 5);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >

        {/* ── Sync button row ──────────────────────────────────────────────── */}
        <View style={styles.syncRow}>
          {syncMsg ? (
            <Text style={[styles.syncMsg, { color: syncMsg.startsWith('✓') ? '#10B981' : '#EF4444' }]}>
              {syncMsg}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
            {syncing
              ? <ActivityIndicator size="small" color="#fff" />
              : <MaterialCommunityIcons name="cloud-sync" size={18} color="#fff" />}
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance card ─────────────────────────────────────────────────── */}
        <View style={[styles.balanceCard, { backgroundColor: '#3B82F6' }]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatINR(summary.balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <MaterialCommunityIcons name="arrow-down-circle" size={16} color="#A7F3D0" />
              <Text style={styles.balanceItemLabel}>Income</Text>
              <Text style={styles.balanceItemValue}>{formatINR(summary.income)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.balanceItem}>
              <MaterialCommunityIcons name="arrow-up-circle" size={16} color="#FCA5A5" />
              <Text style={styles.balanceItemLabel}>Expense</Text>
              <Text style={styles.balanceItemValue}>{formatINR(summary.expense)}</Text>
            </View>
          </View>
        </View>

        {/* ── Spending by Category (Pie) ────────────────────────────────────── */}
        {pieData.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Spending by Category</Text>
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                radius={80}
                innerRadius={50}
                centerLabelComponent={() => (
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>
                    {formatINR(summary.expense)}
                  </Text>
                )}
              />
              <View style={styles.legend}>
                {categoryTotals.slice(0, 6).map((ct) => (
                  <View key={ct.category} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[ct.category as Category] }]} />
                    <Text style={[styles.legendText, { color: c.subText }]}>
                      {CATEGORY_LABELS[ct.category as Category]}
                    </Text>
                    <Text style={[styles.legendAmount, { color: c.text }]}>
                      {formatINR(ct.total)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── 7-Day Spending Trend (Line) ────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>7-Day Spending</Text>
          <LineChart
            data={lineData}
            color="#3B82F6"
            thickness={3}
            curved
            areaChart
            startFillColor="#3B82F6"
            endFillColor={isDark ? '#0F172A' : '#FFFFFF'}
            startOpacity={0.3}
            endOpacity={0.01}
            noOfSections={4}
            yAxisTextStyle={{ color: c.subText, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: c.subText, fontSize: 10 }}
            hideRules={false}
            rulesColor={isDark ? '#1E293B' : '#E2E8F0'}
            backgroundColor={c.card}
            width={260}
            height={140}
            hideDataPoints={false}
            dataPointsColor="#3B82F6"
            dataPointsRadius={4}
          />
        </View>

        {/* ── Recent Transactions ──────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Recent Transactions</Text>
          {recentTxns.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.subText }]}>
              No transactions yet. Pull down to scan your SMS inbox.
            </Text>
          ) : (
            recentTxns.map((t) => (
              <View key={t.id} style={[styles.txRow, { borderBottomColor: c.border }]}>
                <View style={[styles.txIcon, { backgroundColor: CATEGORY_COLORS[t.category] + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[t.category]}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txMerchant, { color: c.text }]} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text style={[styles.txDate, { color: c.subText }]}>
                    {shortDate(t.date)} · {CATEGORY_LABELS[t.category]}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: t.type === 'credit' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const LIGHT = { bg: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', subText: '#64748B', border: '#E2E8F0' };
const DARK  = { bg: '#0F172A', card: '#1E293B', text: '#F1F5F9', subText: '#94A3B8', border: '#334155' };

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  // Sync row
  syncRow:     { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  syncBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  syncBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  syncMsg:     { fontSize: 12, fontWeight: '500', flex: 1 },

  // Balance card
  balanceCard:       { borderRadius: 20, padding: 20, gap: 8 },
  balanceLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  balanceAmount:     { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  balanceRow:        { flexDirection: 'row', marginTop: 8 },
  balanceItem:       { flex: 1, alignItems: 'center', gap: 2 },
  balanceItemLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  balanceItemValue:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  divider:           { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  // Card
  card:      { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },

  // Pie chart row
  pieRow:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend:  { flex: 1, gap: 6 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { flex: 1, fontSize: 12 },
  legendAmount: { fontSize: 12, fontWeight: '600' },

  // Transaction row
  txRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  txIcon:    { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txInfo:    { flex: 1, gap: 2 },
  txMerchant:{ fontSize: 14, fontWeight: '600' },
  txDate:    { fontSize: 12 },
  txAmount:  { fontSize: 15, fontWeight: '700' },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
