import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { listServiceRequests, updateServiceRequest, type ServiceRequest } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

const statusOptions = ["all", "pending", "in_progress", "completed", "cancelled"] as const;
const serviceTypeOptions = ["all", "plumber", "electrician"] as const;

function statusLabel(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "pending") return "Pending";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function formatAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<(typeof serviceTypeOptions)[number]>("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    status: "pending" as "pending" | "in_progress" | "completed" | "cancelled",
    recommendedName: "",
    recommendedPhone: "",
    adminNote: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listServiceRequests();
      setRequests(next || []);
      if (!selectedId && next?.length) {
        setSelectedId(next[0].id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load service requests");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    if (!requests.length) {
      setSelectedId(null);
      return;
    }
    const current = requests.find((request) => request.id === selectedId) ?? requests[0];
    setSelectedId(current.id);
    setForm({
      status: current.status,
      recommendedName: current.recommendedName || "",
      recommendedPhone: current.recommendedPhone || "",
      adminNote: current.adminNote || "",
    });
  }, [requests, selectedId]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (serviceTypeFilter !== "all" && request.serviceType !== serviceTypeFilter) return false;
      if (!query) return true;
      const haystack = [request.customerName, request.customerPhone, request.serviceType, request.description, request.city, request.area]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, search, serviceTypeFilter, statusFilter]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? null,
    [filteredRequests, selectedId],
  );

  useEffect(() => {
    if (!selectedRequest) return;
    setForm({
      status: selectedRequest.status,
      recommendedName: selectedRequest.recommendedName || "",
      recommendedPhone: selectedRequest.recommendedPhone || "",
      adminNote: selectedRequest.adminNote || "",
    });
  }, [selectedRequest]);

  const saveSelected = useCallback(async () => {
    if (!selectedRequest) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateServiceRequest(selectedRequest.id, {
        status: form.status,
        recommendedName: form.recommendedName.trim(),
        recommendedPhone: form.recommendedPhone.trim(),
        adminNote: form.adminNote.trim(),
        actor: "admin",
        note: `Admin reviewed request (${statusLabel(form.status)})`,
      });
      setMessage("Service request updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update service request");
    } finally {
      setSaving(false);
    }
  }, [form, load, selectedRequest]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Service requests</Text>
      </View>

      <View style={styles.filtersRow}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search name, phone, area..." style={styles.searchInput} />
      </View>

      <View style={styles.chipRow}>
        {statusOptions.map((option) => (
          <TouchableOpacity key={option} style={[styles.chip, statusFilter === option && styles.chipActive]} onPress={() => setStatusFilter(option)}>
            <Text style={[styles.chipText, statusFilter === option && styles.chipTextActive]}>{option === "all" ? "All" : statusLabel(option)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chipRow}>
        {serviceTypeOptions.map((option) => (
          <TouchableOpacity key={option} style={[styles.chip, serviceTypeFilter === option && styles.chipActive]} onPress={() => setServiceTypeFilter(option)}>
            <Text style={[styles.chipText, serviceTypeFilter === option && styles.chipTextActive]}>{option === "all" ? "All" : option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <View style={styles.content}>
          <View style={styles.listPane}>
            {filteredRequests.length === 0 ? (
              <Text style={styles.empty}>No service requests match the filters.</Text>
            ) : (
              filteredRequests.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={[styles.requestCard, selectedRequest?.id === request.id && styles.requestCardSelected]}
                  onPress={() => setSelectedId(request.id)}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.customerName}>{request.customerName}</Text>
                    <Text style={[styles.badge, request.status === "pending" ? styles.pending : styles.other]}>{statusLabel(request.status)}</Text>
                  </View>
                  <Text style={styles.meta}>{request.serviceType} • {request.customerPhone}</Text>
                  <Text style={styles.meta}>{request.city || request.area || "No city/area"}</Text>
                  <Text style={styles.meta}>{formatAt(request.createdAt)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {selectedRequest ? (
            <ScrollView style={styles.detailPane}>
              <Text style={styles.sectionTitle}>Detail</Text>
              <Text style={styles.detailValue}><Text style={styles.label}>Service:</Text> {selectedRequest.serviceType}</Text>
              <Text style={styles.detailValue}><Text style={styles.label}>Customer:</Text> {selectedRequest.customerName}</Text>
              <Text style={styles.detailValue}><Text style={styles.label}>Phone:</Text> {selectedRequest.customerPhone}</Text>
              <Text style={styles.detailValue}><Text style={styles.label}>Address:</Text> {selectedRequest.address || "—"}</Text>
              <Text style={styles.detailValue}><Text style={styles.label}>Description:</Text> {selectedRequest.description}</Text>

              <View style={styles.formBlock}>
                <Text style={styles.sectionTitle}>Lifecycle</Text>
                <Text style={styles.label}>Status</Text>
                <View style={styles.inlineStack}>
                  {(["pending", "in_progress", "completed", "cancelled"] as const).map((option) => (
                    <TouchableOpacity key={option} style={[styles.statusOption, form.status === option && styles.statusOptionActive]} onPress={() => setForm((prev) => ({ ...prev, status: option }))}>
                      <Text style={[styles.statusOptionText, form.status === option && styles.statusOptionTextActive]}>{statusLabel(option)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Recommended person</Text>
                <TextInput value={form.recommendedName} onChangeText={(value) => setForm((prev) => ({ ...prev, recommendedName: value }))} placeholder="Name" style={styles.input} />
                <TextInput value={form.recommendedPhone} onChangeText={(value) => setForm((prev) => ({ ...prev, recommendedPhone: value }))} placeholder="Phone" style={styles.input} />
                <TextInput value={form.adminNote} onChangeText={(value) => setForm((prev) => ({ ...prev, adminNote: value }))} placeholder="Admin note" multiline numberOfLines={4} style={[styles.input, styles.textArea]} />

                <TouchableOpacity style={styles.primaryButton} onPress={saveSelected} disabled={saving}>
                  <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save update"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.sectionTitle}>History</Text>
                {selectedRequest.history?.length ? (
                  selectedRequest.history.map((entry, index) => (
                    <View key={`${entry.at}-${index}`} style={styles.historyRow}>
                      <Text style={styles.historyTitle}>{statusLabel(entry.status)} • {entry.actor}</Text>
                      <Text style={styles.historyMeta}>{formatAt(entry.at)}</Text>
                      {entry.note ? <Text style={styles.detailValue}>{entry.note}</Text> : null}
                      {entry.recommendedPerson ? (
                        <Text style={styles.detailValue}>Recommended: {entry.recommendedPerson.name || "—"} / {entry.recommendedPerson.phone || "—"}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.meta}>No history yet.</Text>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  headerRow: { marginBottom: spacing.sm },
  title: { ...font.h2, color: colors.textPrimary },
  filtersRow: { marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.primary },
  message: { color: colors.warning, marginBottom: spacing.sm },
  content: { flex: 1, flexDirection: "row", gap: 16 },
  listPane: { flex: 1, minWidth: 280, maxWidth: 360 },
  detailPane: { flex: 1.2, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  requestCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  requestCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customerName: { ...font.h4, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: "700" },
  pending: { backgroundColor: "#FFF3CD", color: "#7A4E00" },
  other: { backgroundColor: "#E8F1FF", color: colors.primary },
  empty: { color: colors.textSecondary, padding: spacing.md },
  sectionTitle: { ...font.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontWeight: "700", marginTop: spacing.sm, marginBottom: 4 },
  detailValue: { color: colors.textPrimary, fontSize: 14, marginBottom: 6 },
  formBlock: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  inlineStack: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  statusOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  statusOptionText: { fontSize: 12, color: colors.textSecondary },
  statusOptionTextActive: { color: colors.primary, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, color: colors.textPrimary, backgroundColor: colors.bg },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  primaryButtonText: { color: colors.white, fontWeight: "700" },
  historyRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm },
  historyTitle: { color: colors.textPrimary, fontWeight: "700" },
  historyMeta: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
