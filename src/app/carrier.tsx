import React from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { ArrowLeft, Building, Calendar, Globe, Clock } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"

export default function CarrierScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { organizationSettings, driverProfile, user } = useAuth()

  // Helper function to render info rows with fallback text
  const renderInfoRow = (
    label: string,
    value: string | undefined | null,
    icon: React.ReactNode,
  ) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textDim }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: value ? colors.text : colors.textDim }]}>
          {value || "Contact organization to update"}
        </Text>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Carrier Info</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Organization Information */}
        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization Details</Text>

          {renderInfoRow(
            "Organization Name",
            organizationSettings?.organization_name || user?.organizationName,
            <Building size={20} color={colors.tint} />,
          )}

          {renderInfoRow(
            "Timezone",
            organizationSettings?.timezone,
            <Globe size={20} color={colors.tint} />,
          )}

          {renderInfoRow(
            "Locale",
            organizationSettings?.locale,
            <Globe size={20} color={colors.tint} />,
          )}
        </ElevatedCard>

        {/* HOS Settings */}
        {organizationSettings?.hos_settings && (
          <ElevatedCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Hours of Service Settings
            </Text>

            {renderInfoRow(
              "Cycle Type",
              organizationSettings.hos_settings.cycle_type,
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Restart Type",
              organizationSettings.hos_settings.restart_type,
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Max Driving Hours",
              organizationSettings.hos_settings.max_driving_hours?.toString(),
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Max On-Duty Hours",
              organizationSettings.hos_settings.max_on_duty_hours?.toString(),
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Required Break Minutes",
              organizationSettings.hos_settings.required_break_minutes?.toString(),
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Max Cycle Hours",
              organizationSettings.hos_settings.max_cycle_hours?.toString(),
              <Clock size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Cycle Days",
              organizationSettings.hos_settings.cycle_days?.toString(),
              <Calendar size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "ELD Day Start Hour",
              organizationSettings.hos_settings.eld_day_start_hour?.toString(),
              <Clock size={20} color={colors.tint} />,
            )}

            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Sleeper Berth Required
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.hos_settings.sleeper_berth_required
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.hos_settings.sleeper_berth_required ? "Yes" : "No"}
                </Text>
              </View>

              {organizationSettings.hos_settings.sleeper_berth_required && (
                <View style={styles.settingItem}>
                  <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                    Sleeper Berth Hours
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.text }]}>
                    {organizationSettings.hos_settings.sleeper_berth_hours}
                  </Text>
                </View>
              )}

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Personal Use Allowed
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.hos_settings.allow_personal_use
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.hos_settings.allow_personal_use ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Yard Moves Allowed
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.hos_settings.allow_yard_moves
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.hos_settings.allow_yard_moves ? "Yes" : "No"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Break Required After Hours
                </Text>
                <Text style={[styles.settingValue, { color: colors.text }]}>
                  {organizationSettings.hos_settings.require_break_after_hours}
                </Text>
              </View>
            </View>
          </ElevatedCard>
        )}

        {/* Compliance Settings */}
        {organizationSettings?.compliance_settings && (
          <ElevatedCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Compliance Settings</Text>

            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Auto Certify Logs
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings.auto_certify_logs
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.auto_certify_logs
                    ? "Enabled"
                    : "Disabled"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Driver Acknowledgment Required
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings.require_driver_acknowledgment
                        ? colors.warning
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.require_driver_acknowledgment
                    ? "Required"
                    : "Optional"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Violation Notifications
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings.violation_notification_enabled
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.violation_notification_enabled
                    ? "Enabled"
                    : "Disabled"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Manual Log Edits
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings.allow_manual_log_edits
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.allow_manual_log_edits
                    ? "Allowed"
                    : "Restricted"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Compliance Reporting
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings.compliance_reporting_enabled
                        ? colors.success
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.compliance_reporting_enabled
                    ? `${organizationSettings.compliance_settings.compliance_report_frequency}`
                    : "Disabled"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>Data Retention</Text>
                <Text style={[styles.settingValue, { color: colors.text }]}>
                  {organizationSettings.compliance_settings.data_retention_days} days
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Audit Trail Retention
                </Text>
                <Text style={[styles.settingValue, { color: colors.text }]}>
                  {organizationSettings.compliance_settings.audit_trail_retention_days} days
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  ELD Device Certification Required
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings
                        .require_eld_device_certification
                        ? colors.warning
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.require_eld_device_certification
                    ? "Required"
                    : "Optional"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Supervisor Approval for Edits
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    {
                      color: organizationSettings.compliance_settings
                        .require_supervisor_approval_for_edits
                        ? colors.warning
                        : colors.textDim,
                    },
                  ]}
                >
                  {organizationSettings.compliance_settings.require_supervisor_approval_for_edits
                    ? "Required"
                    : "Not Required"}
                </Text>
              </View>

              {organizationSettings.compliance_settings.violation_escalation_enabled && (
                <View style={styles.settingItem}>
                  <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                    Violation Escalation
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.warning }]}>
                    After {organizationSettings.compliance_settings.violation_escalation_hours}{" "}
                    hours
                  </Text>
                </View>
              )}

              {organizationSettings.compliance_settings.violation_penalty_enabled && (
                <View style={styles.settingItem}>
                  <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                    Violation Penalties
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.error }]}>
                    After {organizationSettings.compliance_settings.violation_penalty_threshold}{" "}
                    violations
                  </Text>
                </View>
              )}
            </View>
          </ElevatedCard>
        )}

        {/* Driver Organization Info */}
        {driverProfile && (
          <ElevatedCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Driver Organization Details
            </Text>

            {renderInfoRow(
              "Company Driver ID",
              driverProfile.company_driver_id,
              <Building size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Organization Name",
              driverProfile.organization_name,
              <Building size={20} color={colors.tint} />,
            )}

            {renderInfoRow(
              "Timezone",
              driverProfile.timezone,
              <Globe size={20} color={colors.tint} />,
            )}

            {renderInfoRow("Locale", driverProfile.locale, <Globe size={20} color={colors.tint} />)}

            <View style={styles.settingsContainer}>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>ELD Exempt</Text>
                <Text
                  style={[
                    styles.settingValue,
                    { color: driverProfile.eld_exempt ? colors.warning : colors.success },
                  ]}
                >
                  {driverProfile.eld_exempt ? "Yes" : "No"}
                </Text>
              </View>

              {driverProfile.eld_exempt && driverProfile.eld_exempt_reason && (
                <View style={styles.settingItem}>
                  <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                    ELD Exempt Reason
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.text }]}>
                    {driverProfile.eld_exempt_reason}
                  </Text>
                </View>
              )}

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>Account Status</Text>
                <Text
                  style={[
                    styles.settingValue,
                    { color: driverProfile.is_active ? colors.success : colors.error },
                  ]}
                >
                  {driverProfile.is_active ? "Active" : "Inactive"}
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { color: colors.textDim }]}>
                  Violations Count
                </Text>
                <Text
                  style={[
                    styles.settingValue,
                    { color: driverProfile.violations_count > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {driverProfile.violations_count}
                </Text>
              </View>
            </View>
          </ElevatedCard>
        )}

        {/* Empty state message */}
        {!organizationSettings && !driverProfile && (
          <ElevatedCard style={styles.section}>
            <View style={styles.emptyState}>
              <Building size={48} color={colors.textDim} />
              <Text style={[styles.emptyText, { color: colors.textDim }]}>
                No organization information available
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
                Contact your organization administrator to update carrier details
              </Text>
            </View>
          </ElevatedCard>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    marginTop: 45,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 16,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 16,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  settingItem: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.05)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 16,
    textAlign: "right",
  },
  settingsContainer: {
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
})
