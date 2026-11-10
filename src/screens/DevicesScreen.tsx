import { StyleSheet, Text, View } from 'react-native'
import { useHandovers, useMyProjects } from '@/hooks/queries'
import type { ProjectAsset } from '@/lib/api/types'
import { formatShortDate } from '@/lib/format'
import { assetTypeLabel, projectTitle } from '@/lib/installation'
import { ListRow, PageHeader, QueryState, Screen, SectionTitle, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Thiết bị đã lắp ở các công trình của khách. Hạn bảo hành lấy từ biên bản bàn giao (khớp theo số seri)

function warrantyText(asset: ProjectAsset, handed: ProjectAsset | undefined) {
  if (handed?.warrantyEndsOn) return `Bảo hành đến ${formatShortDate(handed.warrantyEndsOn)}`
  if (asset.warrantyMonths) return `Bảo hành ${asset.warrantyMonths} tháng từ ngày bàn giao`
  return null
}

function AssetRow({ asset, handed, last }: { asset: ProjectAsset; handed: ProjectAsset | undefined; last: boolean }) {
  const theme = useAppTheme()
  const name = `${assetTypeLabel(asset.assetType)} ${asset.manufacturer} ${asset.model}`
  const warranty = warrantyText(asset, handed)
  return (
    <ListRow last={last} accessibilityLabel={name}>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <Text style={[styles.line, { color: theme.textMuted }]}>
          Số seri {asset.serialNumber}
          {asset.positionCode ? `, ${asset.positionCode}` : ''}
        </Text>
        {warranty ? <Text style={[styles.line, { color: theme.text }]}>{warranty}</Text> : null}
      </View>
    </ListRow>
  )
}

export function DevicesScreen() {
  const projects = useMyProjects()
  const { handovers, pending, error } = useHandovers(projects.data)
  const withAssets = (projects.data ?? []).filter((p) => p.status !== 'CANCELLED' && p.assets.length > 0)
  return (
    <Screen refreshing={projects.isRefetching} onRefresh={() => void projects.refetch()}>
      <PageHeader title="Thiết bị" />
      <QueryState
        loading={projects.isPending || pending}
        error={projects.error ?? error}
        onRetry={() => void projects.refetch()}
      />
      {projects.data && !pending && withAssets.length === 0 ? (
        <StateView title="Chưa có thiết bị nào được lắp" />
      ) : null}
      {!pending
        ? withAssets.map((p) => {
            const handed = handovers.get(p.projectId)
            return (
              <View key={p.projectId}>
                <SectionTitle detail={`${p.assets.length} thiết bị`}>{projectTitle(p.projectId)}</SectionTitle>
                {p.assets.map((asset, index) => (
                  <AssetRow
                    key={`${asset.serialNumber}-${index}`}
                    asset={asset}
                    handed={handed?.assets.find((h) => h.serialNumber === asset.serialNumber)}
                    last={index === p.assets.length - 1}
                  />
                ))}
              </View>
            )
          })
        : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  line: { fontSize: 13, lineHeight: 18 },
})
