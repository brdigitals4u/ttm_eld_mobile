/**
 * Inactivity Monitor Service
 *
 * Monitors vehicle inactivity when driver is in "On-Duty Driving" status.
 * Triggers prompt after 5 minutes of inactivity (speed < 5 mph).
 * Auto-switches to "On-Duty Not Driving" after 1 additional minute if no response.
 *
 * Timing is not configurable per ELD requirements.
 */

const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes - not configurable
const AUTO_SWITCH_DELAY_MS = 60 * 1000 // 1 minute - not configurable
const SPEED_THRESHOLD_MPH = 5 // mph - matches SPEED_THRESHOLD_DRIVING

type DutyStatus =
  | "driving"
  | "onDuty"
  | "offDuty"
  | "sleeperBerth"
  | "personalConveyance"
  | "yardMove"

interface InactivityState {
  isMonitoring: boolean
  isStopped: boolean
  stoppedAt: number | null
  promptTriggered: boolean
  autoSwitchTriggered: boolean
}

type PromptTriggerCallback = () => void
type AutoSwitchCallback = () => void

class InactivityMonitorService {
  private state: InactivityState = {
    isMonitoring: false,
    isStopped: false,
    stoppedAt: null,
    promptTriggered: false,
    autoSwitchTriggered: false,
  }

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null
  private autoSwitchTimer: ReturnType<typeof setTimeout> | null = null
  private promptTriggerCallback: PromptTriggerCallback | null = null
  private autoSwitchCallback: AutoSwitchCallback | null = null
  private currentStatus: DutyStatus | null = null
  private currentSpeed: number = 0

  /**
   * Set callback for when prompt should be shown (after 5 minutes)
   */
  setPromptTriggerCallback(callback: PromptTriggerCallback | null): void {
    this.promptTriggerCallback = callback
  }

  /**
   * Set callback for when auto-switch should occur (after 1 minute of no response)
   */
  setAutoSwitchCallback(callback: AutoSwitchCallback | null): void {
    this.autoSwitchCallback = callback
  }

  /**
   * Update vehicle speed and duty status
   * Called whenever speed or status changes
   */
  update(speedMph: number, dutyStatus: DutyStatus): void {
    const previousStatus = this.currentStatus
    const previousSpeed = this.currentSpeed

    this.currentSpeed = speedMph
    this.currentStatus = dutyStatus

    // Only monitor when in "driving" status
    const shouldMonitor = dutyStatus === "driving"

    if (!shouldMonitor) {
      // Not in driving status - stop monitoring
      this.stopMonitoring()
      return
    }

    // Start monitoring if not already monitoring
    if (!this.state.isMonitoring) {
      this.startMonitoring()
    }

    // Check if vehicle is stopped (speed < threshold)
    const isStopped = speedMph < SPEED_THRESHOLD_MPH

    if (isStopped && !this.state.isStopped) {
      // Vehicle just stopped - start inactivity timer
      this.handleVehicleStopped()
    } else if (!isStopped && this.state.isStopped) {
      // Vehicle started moving - reset timer
      this.handleVehicleMoving()
    }
  }

  /**
   * Start monitoring inactivity
   */
  private startMonitoring(): void {
    if (this.state.isMonitoring) {
      return
    }

    this.state.isMonitoring = true
    this.state.isStopped = false
    this.state.stoppedAt = null
    this.state.promptTriggered = false
    this.state.autoSwitchTriggered = false

    console.log("🛑 InactivityMonitor: Started monitoring for driving status")
  }

  /**
   * Stop monitoring inactivity
   */
  private stopMonitoring(): void {
    if (!this.state.isMonitoring) {
      return
    }

    this.clearTimers()
    this.state.isMonitoring = false
    this.state.isStopped = false
    this.state.stoppedAt = null
    this.state.promptTriggered = false
    this.state.autoSwitchTriggered = false

    console.log("🛑 InactivityMonitor: Stopped monitoring")
  }

  /**
   * Handle vehicle stopped event
   */
  private handleVehicleStopped(): void {
    if (this.state.isStopped) {
      return // Already tracking stop
    }

    this.state.isStopped = true
    this.state.stoppedAt = Date.now()
    this.state.promptTriggered = false
    this.state.autoSwitchTriggered = false

    // Clear any existing timers
    this.clearTimers()

    // Start 5-minute inactivity timer
    this.inactivityTimer = setTimeout(() => {
      this.triggerPrompt()
    }, INACTIVITY_THRESHOLD_MS)

    console.log("🛑 InactivityMonitor: Vehicle stopped, 5-minute timer started", {
      stoppedAt: new Date(this.state.stoppedAt).toISOString(),
      willTriggerAt: new Date(this.state.stoppedAt + INACTIVITY_THRESHOLD_MS).toISOString(),
    })
  }

  /**
   * Handle vehicle moving event
   */
  private handleVehicleMoving(): void {
    if (!this.state.isStopped) {
      return // Already tracking movement
    }

    const wasStoppedFor = this.state.stoppedAt ? Date.now() - this.state.stoppedAt : 0

    this.state.isStopped = false
    this.state.stoppedAt = null
    this.state.promptTriggered = false
    this.state.autoSwitchTriggered = false

    // Clear timers
    this.clearTimers()

    console.log("🚗 InactivityMonitor: Vehicle moving, timer reset", {
      wasStoppedForMs: wasStoppedFor,
      wasStoppedForMinutes: Math.round((wasStoppedFor / 60000) * 10) / 10,
    })
  }

  /**
   * Trigger prompt after 5 minutes of inactivity
   */
  private triggerPrompt(): void {
    if (this.state.promptTriggered) {
      return // Already triggered
    }

    this.state.promptTriggered = true

    console.log("⏰ InactivityMonitor: 5-minute threshold reached, triggering prompt")

    // Trigger prompt callback
    if (this.promptTriggerCallback) {
      this.promptTriggerCallback()
    }

    // Start 1-minute auto-switch timer
    this.autoSwitchTimer = setTimeout(() => {
      this.triggerAutoSwitch()
    }, AUTO_SWITCH_DELAY_MS)

    console.log("⏰ InactivityMonitor: 1-minute auto-switch timer started", {
      willAutoSwitchAt: new Date(Date.now() + AUTO_SWITCH_DELAY_MS).toISOString(),
    })
  }

  /**
   * Trigger auto-switch after 1 minute of no response
   */
  private triggerAutoSwitch(): void {
    if (this.state.autoSwitchTriggered) {
      return // Already triggered
    }

    this.state.autoSwitchTriggered = true

    console.log("🔄 InactivityMonitor: 1-minute threshold reached, triggering auto-switch")

    // Trigger auto-switch callback
    if (this.autoSwitchCallback) {
      this.autoSwitchCallback()
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer)
      this.autoSwitchTimer = null
    }
  }

  /**
   * User responded to prompt - cancel auto-switch timer
   */
  handleUserResponse(): void {
    if (this.autoSwitchTimer) {
      clearTimeout(this.autoSwitchTimer)
      this.autoSwitchTimer = null
      this.state.autoSwitchTriggered = false

      console.log("✅ InactivityMonitor: User responded, auto-switch cancelled")
    }

    // Reset state but keep monitoring
    this.state.promptTriggered = false
    this.state.isStopped = false
    this.state.stoppedAt = null
  }

  /**
   * Get current state (for debugging)
   */
  getState(): Readonly<InactivityState> {
    return { ...this.state }
  }

  /**
   * Reset monitor (for testing or cleanup)
   */
  reset(): void {
    this.stopMonitoring()
    this.currentStatus = null
    this.currentSpeed = 0
  }
}

// Export singleton instance
export const inactivityMonitor = new InactivityMonitorService()
