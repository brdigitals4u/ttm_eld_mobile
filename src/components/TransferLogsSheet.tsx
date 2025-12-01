import React, { useMemo } from "react"
import { ScrollView, View, Text, StyleSheet, Image } from "react-native"

import HOSChart from "@/components/VictoryHOS"
import { mapDriverStatusToAppStatus } from "@/utils/hos-status-mapper"

const LOCAL_LOGO = require("assets/images/trident_logo.png")

const LOCAL_LOGO_URI = Image.resolveAssetSource(LOCAL_LOGO).uri

export interface TransferLogEvent {
  sequenceId: string
  eventType: string
  eventCode: string
  dateTime: string
  location: string
  latitude?: string | null
  longitude?: string | null
  vehicleMiles?: string | number | null
  engineHours?: string | number | null
  origin: string
  recordStatus: string
  annotation?: string | null
}

export interface SupportingEvent {
  label: string
  description: string
  timestamp: string
}

export interface TransferLogsSheetData {
  metadata: {
    eldIdentifier: string
    eldProvider: string
    eldRegistrationId: string
    softwareVersion: string
    outputComment?: string
    outputType: string
    generatedAt: string
    reportRange: string
    logoUrl?: string
  }
  driver: {
    name: string
    driverId: string
    coDriver?: string | null
    licenseNumber?: string | null
    licenseState?: string | null
    carrierName: string
    carrierDotNumber?: string | null
    mainOfficeAddress?: string | null
    homeTerminalAddress?: string | null
    startTime?: string | null
    timeZone?: string | null
    cycleRule?: string | null
  }
  vehicle: {
    truckId?: string | null
    vin?: string | null
    trailerId?: string | null
    shippingDocument?: string | null
    engineHoursStart?: string | null
    engineHoursEnd?: string | null
    odometerStart?: string | null
    odometerEnd?: string | null
    totalMiles?: string | null
    malfunctionIndicator?: string | null
    dataDiagnosticIndicator?: string | null
    unidentifiedDriverRecords?: string | null
    exemptDriverStatus?: string | null
  }
  events: TransferLogEvent[]
  supportingEvents?: SupportingEvent[]
  certification: {
    certified: boolean
    certificationDate?: string | null
    certifiedBy?: string | null
    driverSignature?: string | null
    officerName?: string | null
  }
}

interface TransferLogsSheetProps {
  data: TransferLogsSheetData
  theme?: {
    textColor?: string
    mutedTextColor?: string
    borderColor?: string
    headingColor?: string
    backgroundColor?: string
  }
}

const labelValue = (label: string, value?: string | null, mutedColor?: string) => (
  <View style={styles.row} key={`${label}-${value ?? "value"}`}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, mutedColor ? { color: mutedColor } : null]}>{value || ""}</Text>
  </View>
)

export const TransferLogsSheet: React.FC<TransferLogsSheetProps> = ({ data, theme }) => {
  // Convert events to HOS chart format
  const chartLogs = useMemo(() => {
    if (!data.events || data.events.length === 0) {
      return []
    }

    // Get the date from the first event or use today
    const firstEventDate = data.events[0]?.dateTime
    const logDate = firstEventDate
      ? new Date(firstEventDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
    const dayStart = new Date(`${logDate}T00:00:00Z`)

    // Group events by status and calculate durations
    const chartData: Array<{ start: string; end: string; status: string; note?: string }> = []

    // Sort events by timestamp
    const sortedEvents = [...data.events].sort((a, b) => {
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    })

    // Convert events to chart segments
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i]
      const nextEvent = sortedEvents[i + 1]

      const startTime = new Date(currentEvent.dateTime)
      const endTime = nextEvent
        ? new Date(nextEvent.dateTime)
        : new Date(startTime.getTime() + 24 * 60 * 60 * 1000)

      // Map event code to status
      // Event codes: 1 = Off-Duty, 2 = Sleeper, 3 = Driving, 4 = On-Duty
      const eventCodeStr = String(currentEvent.eventCode)
      let status = "off_duty"
      if (eventCodeStr === "1") {
        status = "off_duty"
      } else if (eventCodeStr === "2") {
        status = "sleeper_berth"
      } else if (eventCodeStr === "3") {
        status = "driving"
      } else if (eventCodeStr === "4") {
        status = "on_duty"
      }

      // Convert to app status format
      const appStatus = mapDriverStatusToAppStatus(status)

      chartData.push({
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        status: appStatus,
        note: currentEvent.annotation || "",
      })
    }

    return chartData
  }, [data.events])

  // Get day start ISO string for chart
  const dayStartIso = useMemo(() => {
    if (data.events && data.events.length > 0) {
      const firstEventDate = data.events[0]?.dateTime
      if (firstEventDate) {
        const logDate = new Date(firstEventDate).toISOString().split("T")[0]
        return `${logDate}T00:00:00Z`
      }
    }
    return new Date().toISOString().split("T")[0] + "T00:00:00Z"
  }, [data.events])

  const logoSource = data.metadata.logoUrl ? { uri: data.metadata.logoUrl } : LOCAL_LOGO

  return (
    <ScrollView
      style={[
        styles.container,
        theme?.backgroundColor ? { backgroundColor: theme.backgroundColor } : null,
      ]}
    >
      <View style={styles.headerContainer}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text
            style={[styles.heading, theme?.headingColor ? { color: theme.headingColor } : null]}
          >
            TTM Konnect ELD Transfer Report
          </Text>
          <Text
            style={[
              styles.subheading,
              theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
            ]}
          >
            Driver Daily Log Summary
          </Text>
        </View>
      </View>

      <Section title="ELD Metadata">
        {labelValue("ELD Identifier", data.metadata.eldIdentifier, theme?.textColor)}
        {labelValue("ELD Provider", data.metadata.eldProvider, theme?.textColor)}
        {labelValue("ELD Registration ID", data.metadata.eldRegistrationId, theme?.textColor)}
        {labelValue("Software Version", data.metadata.softwareVersion, theme?.textColor)}
        {labelValue("Output Comment", data.metadata.outputComment || "None", theme?.mutedTextColor)}
        {labelValue("Output File Type", data.metadata.outputType, theme?.textColor)}
        {labelValue("Generation Timestamp (UTC)", data.metadata.generatedAt, theme?.textColor)}
        {labelValue("Reporting Range", data.metadata.reportRange, theme?.textColor)}
      </Section>

      <Section title="Driver & Carrier Information">
        {labelValue("Driver Name", data.driver.name, theme?.textColor)}
        {labelValue("Driver ID", data.driver.driverId, theme?.textColor)}
        {labelValue("Co-Driver", data.driver.coDriver || "None", theme?.mutedTextColor)}
        {labelValue("License Number", data.driver.licenseNumber, theme?.textColor)}
        {labelValue("License State", data.driver.licenseState, theme?.textColor)}
        {labelValue("Carrier Name", data.driver.carrierName, theme?.textColor)}
        {labelValue("Carrier DOT Number", data.driver.carrierDotNumber, theme?.textColor)}
        {labelValue("Main Office Address", data.driver.mainOfficeAddress, theme?.textColor)}
        {labelValue("Home Terminal Address", data.driver.homeTerminalAddress, theme?.textColor)}
        {labelValue("24-Hour Start Time", data.driver.startTime, theme?.textColor)}
        {labelValue("Time Zone", data.driver.timeZone, theme?.textColor)}
        {labelValue("Cycle Rule", data.driver.cycleRule, theme?.textColor)}
      </Section>

      <Section title="Vehicle & Equipment Information">
        {labelValue("Truck / Tractor ID", data.vehicle.truckId, theme?.textColor)}
        {labelValue("VIN", data.vehicle.vin, theme?.textColor)}
        {labelValue("Trailer ID", data.vehicle.trailerId, theme?.textColor)}
        {labelValue("Shipping Document Number", data.vehicle.shippingDocument, theme?.textColor)}
        {labelValue("Engine Hours Start", data.vehicle.engineHoursStart, theme?.textColor)}
        {labelValue("Engine Hours End", data.vehicle.engineHoursEnd, theme?.textColor)}
        {labelValue("Odometer Start", data.vehicle.odometerStart, theme?.textColor)}
        {labelValue("Odometer End", data.vehicle.odometerEnd, theme?.textColor)}
        {labelValue("Total Miles Driven Today", data.vehicle.totalMiles, theme?.textColor)}
        {labelValue("Malfunction Indicator", data.vehicle.malfunctionIndicator, theme?.textColor)}
        {labelValue(
          "Data Diagnostic Indicator",
          data.vehicle.dataDiagnosticIndicator,
          theme?.textColor,
        )}
        {labelValue(
          "Unidentified Driver Records",
          data.vehicle.unidentifiedDriverRecords,
          theme?.textColor,
        )}
        {labelValue("Exempt Driver Status", data.vehicle.exemptDriverStatus, theme?.textColor)}
      </Section>

      <Section title="Driver's Duty Status Chart">
        {chartLogs.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
            ]}
          >
            No duty status data available for chart display.
          </Text>
        ) : (
          <View style={styles.chartContainer}>
            <HOSChart data={chartLogs} dayStartIso={dayStartIso} />
          </View>
        )}
      </Section>

      <Section title="Driver Duty Status Events">
        {data.events.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
            ]}
          >
            No duty status events recorded for the selected range.
          </Text>
        ) : (
          data.events.map((event) => (
            <View
              style={[
                styles.eventCard,
                theme?.borderColor ? { borderColor: theme.borderColor } : null,
              ]}
              key={event.sequenceId}
            >
              <View style={styles.eventHeader}>
                <Text
                  style={[styles.eventTitle, theme?.textColor ? { color: theme.textColor } : null]}
                >
                  Event #{event.sequenceId} — {event.eventType}
                </Text>
                <Text
                  style={[
                    styles.eventCode,
                    theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
                  ]}
                >
                  Code {event.eventCode}
                </Text>
              </View>
              {labelValue("Timestamp (UTC)", event.dateTime, theme?.textColor)}
              {labelValue("Location", event.location, theme?.textColor)}
              {labelValue(
                "Latitude / Longitude",
                formatCoordinates(event.latitude, event.longitude),
                theme?.textColor,
              )}
              {labelValue("Vehicle Miles", stringifyValue(event.vehicleMiles), theme?.textColor)}
              {labelValue("Engine Hours", stringifyValue(event.engineHours), theme?.textColor)}
              {labelValue("Origin", event.origin, theme?.textColor)}
              {labelValue("Record Status", event.recordStatus, theme?.textColor)}
              {labelValue("Annotation", event.annotation || "None", theme?.mutedTextColor)}
            </View>
          ))
        )}
      </Section>

      <Section title="Supporting Events">
        {data.supportingEvents && data.supportingEvents.length > 0 ? (
          data.supportingEvents.map((support, index) => (
            <View
              style={[
                styles.eventCard,
                theme?.borderColor ? { borderColor: theme.borderColor } : null,
              ]}
              key={`${support.label}-${index}`}
            >
              <Text
                style={[styles.eventTitle, theme?.textColor ? { color: theme.textColor } : null]}
              >
                {support.label}
              </Text>
              {labelValue("Timestamp", support.timestamp, theme?.textColor)}
              <Text
                style={[
                  styles.supportDescription,
                  theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
                ]}
              >
                {support.description}
              </Text>
            </View>
          ))
        ) : (
          <Text
            style={[
              styles.emptyText,
              theme?.mutedTextColor ? { color: theme.mutedTextColor } : null,
            ]}
          >
            No supporting events recorded.
          </Text>
        )}
      </Section>

      <Section title="Certification">
        {labelValue("Certified", data.certification.certified ? "Yes" : "No", theme?.textColor)}
        {labelValue(
          "Certification Date/Time",
          data.certification.certificationDate,
          theme?.textColor,
        )}
        {labelValue("Certified By", data.certification.certifiedBy, theme?.textColor)}
        {labelValue("Driver Signature", data.certification.driverSignature, theme?.textColor)}
        {labelValue(
          "Officer / Inspector Name",
          data.certification.officerName || "__________________",
          theme?.mutedTextColor,
        )}
      </Section>
    </ScrollView>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
)

const formatCoordinates = (latitude?: string | null, longitude?: string | null) => {
  if (!latitude && !longitude) {
    return "N/A"
  }
  return [latitude, longitude].filter(Boolean).join(", ")
}

const stringifyValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return "N/A"
  }
  return typeof value === "number" ? value.toString() : value
}

export const renderTransferLogsHtml = (data: TransferLogsSheetData): string => {
  const rows = (items: Array<{ label: string; value?: string | null }>) =>
    items
      .map(
        (item) => `
        <tr>
          <th>${item.label}</th>
          <td>${item.value || "N/A"}</td>
        </tr>
      `,
      )
      .join("")

  const eventRows = data.events
    .map(
      (event) => `
      <tr>
        <td>${event.sequenceId}</td>
        <td>${event.eventType}</td>
        <td>${event.eventCode}</td>
        <td>${event.dateTime}</td>
        <td>${event.location}</td>
        <td>${formatCoordinates(event.latitude, event.longitude)}</td>
        <td>${stringifyValue(event.vehicleMiles)}</td>
        <td>${stringifyValue(event.engineHours)}</td>
        <td>${event.origin}</td>
        <td>${event.recordStatus}</td>
        <td>${event.annotation || "None"}</td>
      </tr>
    `,
    )
    .join("")

  const supportingRows =
    data.supportingEvents && data.supportingEvents.length > 0
      ? data.supportingEvents
          .map(
            (support) => `
        <tr>
          <td>${support.label}</td>
          <td>${support.timestamp}</td>
          <td>${support.description}</td>
        </tr>
      `,
          )
          .join("")
      : `<tr><td colspan="3">No supporting events recorded.</td></tr>`

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
          h1 { font-size: 24px; margin-bottom: 24px; }
          h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 12px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; width: 220px; }
          .events th, .events td { font-size: 11px; }
          .muted { color: #6b7280; }
        </style>
      </head>
      <body>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
          <img src="${data.metadata.logoUrl || LOCAL_LOGO_URI}" alt="TTM Konnect" style="height:56px;" />
          <div>
            <h1 style="margin:0;">TTM Konnect ELD Transfer Report</h1>
            <p style="margin:4px 0 0 0;color:#6b7280;">Driver Daily Log Summary</p>
          </div>
        </div>

        <h2>ELD Metadata</h2>
        <table>
          ${rows([
            { label: "ELD Identifier", value: data.metadata.eldIdentifier },
            { label: "ELD Provider", value: data.metadata.eldProvider },
            { label: "ELD Registration ID", value: data.metadata.eldRegistrationId },
            { label: "Software Version", value: data.metadata.softwareVersion },
            { label: "Output Comment", value: data.metadata.outputComment || "None" },
            { label: "Output File Type", value: data.metadata.outputType },
            { label: "Generation Timestamp (UTC)", value: data.metadata.generatedAt },
            { label: "Reporting Range", value: data.metadata.reportRange },
          ])}
        </table>

        <h2>Driver & Carrier Information</h2>
        <table>
          ${rows([
            { label: "Driver Name", value: data.driver.name },
            { label: "Driver ID", value: data.driver.driverId },
            { label: "Co-Driver", value: data.driver.coDriver || "None" },
            { label: "License Number", value: data.driver.licenseNumber },
            { label: "License State", value: data.driver.licenseState },
            { label: "Carrier Name", value: data.driver.carrierName },
            { label: "Carrier DOT Number", value: data.driver.carrierDotNumber },
            { label: "Main Office Address", value: data.driver.mainOfficeAddress },
            { label: "Home Terminal Address", value: data.driver.homeTerminalAddress },
            { label: "24-Hour Start Time", value: data.driver.startTime },
            { label: "Time Zone", value: data.driver.timeZone },
            { label: "Cycle Rule", value: data.driver.cycleRule },
          ])}
        </table>

        <h2>Vehicle & Equipment Information</h2>
        <table>
          ${rows([
            { label: "Truck / Tractor ID", value: data.vehicle.truckId },
            { label: "VIN", value: data.vehicle.vin },
            { label: "Trailer ID", value: data.vehicle.trailerId },
            { label: "Shipping Document Number", value: data.vehicle.shippingDocument },
            { label: "Engine Hours Start", value: data.vehicle.engineHoursStart },
            { label: "Engine Hours End", value: data.vehicle.engineHoursEnd },
            { label: "Odometer Start", value: data.vehicle.odometerStart },
            { label: "Odometer End", value: data.vehicle.odometerEnd },
            { label: "Total Miles Driven Today", value: data.vehicle.totalMiles },
            { label: "Malfunction Indicator", value: data.vehicle.malfunctionIndicator },
            { label: "Data Diagnostic Indicator", value: data.vehicle.dataDiagnosticIndicator },
            { label: "Unidentified Driver Records", value: data.vehicle.unidentifiedDriverRecords },
            { label: "Exempt Driver Status", value: data.vehicle.exemptDriverStatus },
          ])}
        </table>

        <h2>Driver's Duty Status Chart</h2>
        <p style="color: #6b7280; font-style: italic;">
          A visual 24-hour duty status chart is displayed in the application view. 
          The chart shows duty status changes (OFF-DUTY, SLEEPER BERTH, DRIVING, ON-DUTY) 
          throughout the day, following FMCSA compliance standards.
        </p>
        <p style="color: #6b7280; margin-top: 8px;">
          See detailed event data in the "Driver Duty Status Events" section below.
        </p>

        <h2>Driver Duty Status Events</h2>
        <table class="events">
          <thead>
            <tr>
              <th>#</th>
              <th>Event Type</th>
              <th>Code</th>
              <th>Date / Time (UTC)</th>
              <th>Location</th>
              <th>Lat / Long</th>
              <th>Vehicle Miles</th>
              <th>Engine Hours</th>
              <th>Origin</th>
              <th>Status</th>
              <th>Annotation</th>
            </tr>
          </thead>
          <tbody>
            ${eventRows || `<tr><td colspan="11">No duty status events recorded.</td></tr>`}
          </tbody>
        </table>

        <h2>Supporting Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Timestamp</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${supportingRows}
          </tbody>
        </table>

        <h2>Certification</h2>
        <table>
          ${rows([
            { label: "Certified", value: data.certification.certified ? "Yes" : "No" },
            { label: "Certification Date/Time", value: data.certification.certificationDate },
            { label: "Certified By", value: data.certification.certifiedBy },
            { label: "Driver Signature", value: data.certification.driverSignature },
            {
              label: "Officer / Inspector Name",
              value: data.certification.officerName || "__________________",
            },
          ])}
        </table>
      </body>
    </html>
  `
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginVertical: 12,
    overflow: "hidden",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
  },
  eventCard: {
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventCode: {
    color: "#6B7280",
    fontSize: 12,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
  },
  label: {
    color: "#111827",
    flex: 0.45,
    fontSize: 13,
    fontWeight: "600",
  },
  logo: {
    height: 64,
    width: 64,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  section: {
    marginBottom: 20,
  },
  sectionContent: {
    borderColor: "#E5E7EB",
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  subheading: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  supportDescription: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 4,
  },
  value: {
    color: "#1F2937",
    flex: 0.55,
    fontSize: 13,
    textAlign: "right",
  },
})

export default TransferLogsSheet
