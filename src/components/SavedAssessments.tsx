import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Panel, SectionTitle } from '@/components/ui'
import { useMyDrafts, useMySites } from '@/hooks/queries'
import type { AssessmentDraft, CustomerDraftItem, CustomerSite } from '@/lib/api/types'
import { formatArea, formatMoment } from '@/lib/format'
import { useAppTheme } from '@/theme/theme'

// Bản nháp và địa điểm lưu trên tài khoản của khách, đọc được ở mọi máy

const SURFACE_VALUES: Record<string, number> = { ROOFTOP: 1, GROUND: 2, CARPORT: 3, FACADE: 4, OTHER: 5 }

/** Địa điểm trong danh sách thành dạng lưu trên máy của màn đánh giá */
export function draftSiteOf(item: CustomerSite | undefined): AssessmentDraft['site'] {
  return {
    name: item?.name ?? '',
    ward: item?.ward ?? item?.communeName ?? '',
    communeCode: item?.communeCode ?? undefined,
    streetLine: item?.streetLine ?? '',
    installationSurfaceType: SURFACE_VALUES[item?.installationSurfaceType?.toUpperCase() ?? ''] ?? 1,
    surfaceMaterial: item?.surfaceMaterial ?? '',
  }
}

function Row({
  title,
  detail,
  action,
  onPress,
}: {
  title: string
  detail: string
  action: string
  onPress: () => void
}) {
  const theme = useAppTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action}: ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border, backgroundColor: pressed ? theme.surfacePressed : theme.surface },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.detail, { color: theme.textMuted }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={[styles.action, { color: theme.brandText }]}>{action}</Text>
    </Pressable>
  )
}

/** Mở bản nháp hoặc chọn lại địa điểm cũ. Không có gì đã lưu thì ẩn */
export function SavedAssessments({
  currentDraftId,
  onOpenDraft,
  onUseSite,
}: {
  currentDraftId: string | undefined
  onOpenDraft: (draft: CustomerDraftItem, site: CustomerSite | undefined) => void
  onUseSite: (site: CustomerSite) => void
}) {
  const theme = useAppTheme()
  const drafts = useMyDrafts(true)
  const sites = useMySites(true)
  const [showSites, setShowSites] = useState(false)
  const draftItems = (drafts.data?.items ?? []).filter((d) => d.preSurveyId !== currentDraftId)
  // Địa điểm thiếu mã phường, xã không xếp được lịch nên không đưa vào để chọn lại
  const siteItems = (sites.data?.items ?? []).filter((s) => s.communeCode)
  if (draftItems.length === 0 && siteItems.length === 0) return null

  return (
    <Panel>
      {draftItems.length > 0 ? (
        <>
          <SectionTitle>Bản nháp đã lưu</SectionTitle>
          {draftItems.map((d) => (
            <Row
              key={d.preSurveyId}
              title={d.siteName || 'Công trình chưa đặt tên'}
              detail={[`Sửa ${formatMoment(d.updatedAt)}`, d.usableAreaM2 != null ? formatArea(d.usableAreaM2) : null]
                .filter(Boolean)
                .join(', ')}
              action="Mở"
              onPress={() =>
                onOpenDraft(
                  d,
                  sites.data?.items.find((s) => s.siteId === d.propertySiteId),
                )
              }
            />
          ))}
        </>
      ) : null}
      {siteItems.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showSites }}
            onPress={() => setShowSites((value) => !value)}
            style={styles.toggle}
          >
            <Text style={[styles.toggleText, { color: theme.brandText }]}>
              {showSites ? 'Ẩn địa điểm đã lưu' : `Đánh giá lại địa điểm đã lưu (${siteItems.length})`}
            </Text>
          </Pressable>
          {showSites
            ? siteItems.map((s) => (
                <Row
                  key={s.siteId}
                  title={s.name}
                  detail={s.communeName ?? s.ward ?? ''}
                  action="Chọn"
                  onPress={() => onUseSite(s)}
                />
              ))
            : null}
        </>
      ) : null}
    </Panel>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
  action: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  toggle: { minHeight: 44, justifyContent: 'center' },
  toggleText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
})
