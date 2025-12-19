import React, { useState, useEffect } from "react"
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native"
import { router } from "expo-router"
import { Plus, Users, UserMinus } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { useAppTheme } from "@/theme/context"
import { TeamStatusUpdateDialog } from "@/components/TeamStatusUpdateDialog"

export default function CoDriverScreen() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { teams, activeTeam, isLoading, fetchTeams } = useDriverTeamStore()
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<any>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleRequestTeam = () => {
    router.push("/team-request")
  }

  const handleUpdateStatus = async (status: "active" | "inactive", reason?: string) => {
    if (!selectedTeam) return

    try {
      await useDriverTeamStore.getState().updateTeamStatus(selectedTeam.id, status, reason)
      toast.success(
        translate("driverTeam.updateSuccess" as any) || "Team status updated successfully",
      )
      setShowStatusDialog(false)
      setSelectedTeam(null)
    } catch (error: any) {
      console.error("Failed to update team status:", error)
      // Check for concurrency error
      if (error?.response?.data?.error?.includes("logged in") || error?.message?.includes("logged in")) {
        toast.error(
          translate("driverTeam.concurrencyError" as any) ||
            "Cannot switch. Co-driver is currently logged in.",
        )
      } else {
        toast.error(error?.message || "Failed to update team status")
      }
    }
  }

  const handleStatusClick = (team: any) => {
    setSelectedTeam(team)
    setShowStatusDialog(true)
  }

  const renderTeamItem = ({ item }: { item: any }) => {
    const isActive = activeTeam?.id === item.id

    return (
      <ElevatedCard style={styles.teamCard}>
        <View style={styles.teamHeader}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: colors.sectionBackground,
                borderColor: isActive ? colors.success : colors.border,
              },
            ]}
          >
            <Users size={24} color={isActive ? colors.success : colors.tint} />
          </View>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, { color: colors.text }]}>
              {item.codriver_name || "Unknown Co-Driver"}
            </Text>
            {item.vehicle_name && (
              <Text style={[styles.teamVehicle, { color: colors.textDim }]}>
                {translate("driverTeam.vehicle" as any) || "Vehicle"}: {item.vehicle_name}
              </Text>
            )}
            <Text style={[styles.teamDate, { color: colors.textDim }]}>
              {translate("driverTeam.startDate" as any) || "Start"}:{" "}
              {new Date(item.start_date).toLocaleDateString()}
            </Text>
          </View>
          {isActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.activeBadgeText}>
                {translate("driverTeam.statusActive" as any) || "ACTIVE"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.teamActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              {
                borderColor: isActive ? colors.error : colors.tint,
                backgroundColor: isActive ? colors.error + "10" : colors.tint + "10",
              },
            ]}
            onPress={() => handleStatusClick(item)}
            disabled={isLoading}
          >
            <UserMinus size={16} color={isActive ? colors.error : colors.tint} />
            <Text
              style={[
                styles.statusButtonText,
                { color: isActive ? colors.error : colors.tint },
              ]}
            >
              {isActive
                ? translate("driverTeam.deactivate" as any) || "Deactivate"
                : translate("driverTeam.activate" as any) || "Activate"}
            </Text>
          </TouchableOpacity>
        </View>
      </ElevatedCard>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={translate("driverTeam.title" as any) || "Driver Team"}
        titleStyle={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
          paddingLeft: 20,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
        RightActionComponent={
          <TouchableOpacity onPress={handleRequestTeam} style={styles.addButton}>
            <Plus size={24} color={colors.tint} />
          </TouchableOpacity>
        }
      />

      {activeTeam && (
        <ElevatedCard style={[styles.activeCard, { backgroundColor: colors.success + "20" }]}>
          <View style={styles.activeContent}>
            <Users size={24} color={colors.success} />
            <View style={styles.activeText}>
              <Text style={[styles.activeTitle, { color: colors.text }]}>
                {translate("driverTeam.activeTeam" as any) || "Active Team"}
              </Text>
              <Text style={[styles.activeName, { color: colors.text }]}>
                {activeTeam.codriver_name || "Unknown"}
              </Text>
            </View>
          </View>
        </ElevatedCard>
      )}

      {teams.length === 0 ? (
        <ElevatedCard style={styles.emptyContainer}>
          <Users size={48} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {translate("driverTeam.noTeam" as any) || "No team assigned"}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
            {translate("driverTeam.requestTeamHint" as any) ||
              "Tap the + button to request a team"}
          </Text>
        </ElevatedCard>
      ) : (
        <FlatList
          data={teams}
          renderItem={renderTeamItem}
          keyExtractor={(item) => item.id}
          style={styles.teamsList}
          contentContainerStyle={styles.teamsListContent}
        />
      )}

      {selectedTeam && (
        <TeamStatusUpdateDialog
          visible={showStatusDialog}
          onClose={() => {
            setShowStatusDialog(false)
            setSelectedTeam(null)
          }}
          team={selectedTeam}
          onUpdate={handleUpdateStatus}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  activeCard: {
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  activeContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  activeName: {
    fontSize: 16,
    fontWeight: "700",
  },
  activeText: {
    flex: 1,
    marginLeft: 12,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  addButton: {
    padding: 8,
  },
  avatarContainer: {
    alignItems: "center",
    borderRadius: 25,
    borderWidth: 2,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 40,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  statusButton: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    padding: 12,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  teamActions: {
    marginTop: 12,
  },
  teamCard: {
    marginBottom: 16,
  },
  teamDate: {
    fontSize: 12,
    marginTop: 4,
  },
  teamHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  teamVehicle: {
    fontSize: 14,
  },
  teamsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  teamsListContent: {
    paddingBottom: 120,
  },
})
