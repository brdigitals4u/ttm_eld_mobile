# Google Play Submission Screenshot Requirements

## Overview

Google Play Store requires a screenshot showing the in-app prominent disclosure for location permissions. This screenshot must demonstrate that the app shows a clear, comprehensive disclosure BEFORE requesting OS-level location permissions.

## Screenshot Requirements

### Must Show

1. **In-App Disclosure Screen** (NOT the OS permission dialog)
   - The screenshot must show the app's custom disclosure screen
   - The OS permission dialog should NOT be visible in the screenshot
   - The disclosure must appear BEFORE the OS permission request

2. **Required Content Elements**

   **Title:**
   - Must clearly state: "Location Access Required for FMCSA Compliance"
   - Should be prominently displayed at the top of the screen

   **Main Disclosure Text:**
   - Clear explanation of what location data is collected:
     - Precise GPS coordinates (latitude and longitude)
     - Continuous tracking, including when app is closed
   - Why location is needed:
     - FMCSA regulatory compliance (49 CFR §395)
     - ELD (Electronic Logging Device) functionality
     - HOS (Hours of Service) compliance
   - How location data is used:
     - Record driver duty status changes
     - Generate FMCSA-required electronic logs
     - Detect vehicle movement and driving time
     - Synchronize with ELD hardware devices
   - Data sharing policy:
     - Not shared with third parties except FMCSA auditors
     - Not used for advertising or marketing
   - Data retention:
     - Minimum 6 months per FMCSA regulations

3. **User Actions**
   - **"Allow & Continue" button**: Must be visible and clearly labeled
   - **"Not Now" option**: Must be visible as a secondary action
   - Both buttons should be clearly visible and accessible

4. **Layout Requirements**
   - **Clean, readable layout**: Text should be clearly readable, not pixelated
   - **Scrollable content**: If disclosure is long, should show scrollable content area
   - **Professional appearance**: Should look like a legitimate, well-designed disclosure screen
   - **Mobile-responsive**: Should look appropriate for mobile device screens

### Technical Requirements

1. **Language**
   - Text must be in English (or primary app language)
   - All text must be clearly readable

2. **Image Quality**
   - High resolution (at least 1080p recommended)
   - Not pixelated or blurry
   - Clear, sharp text
   - Proper contrast for readability

3. **Content Completeness**
   - Should show the full disclosure content (may require scrolling)
   - All required elements should be visible or clearly indicated as scrollable
   - Should demonstrate that the disclosure is comprehensive

4. **Context**
   - Should show the disclosure screen in context (with app header/navigation if applicable)
   - Should look like a real app screen, not a mockup

## What NOT to Include

1. **OS Permission Dialog**
   - Do NOT show the Android/iOS system permission dialog
   - The screenshot should show ONLY the in-app disclosure

2. **Incomplete Disclosure**
   - Do NOT show a partial or incomplete disclosure
   - All required information should be visible or clearly scrollable

3. **Mockups or Placeholders**
   - Do NOT use design mockups or placeholder text
   - Should show actual app screen

## Example Screenshot Description

A good screenshot would show:

```
┌─────────────────────────────────┐
│  ← Back    Location Access      │
│            Required for FMCSA   │
│            Compliance           │
├─────────────────────────────────┤
│                                 │
│  This app collects your        │
│  precise location, including    │
│  in the background, to comply   │
│  with FMCSA ELD regulations    │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Why We Need Your Location │ │
│  │                           │ │
│  │ FMCSA regulations require │ │
│  │ ELD devices to...         │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ What Location Data We    │ │
│  │ Collect                   │ │
│  │                           │ │
│  │ • Precise GPS coordinates │ │
│  │ • Timestamp for each...   │ │
│  └───────────────────────────┘ │
│                                 │
│  [Scrollable content area]     │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │    Allow & Continue       │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │        Not Now             │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

## Submission Notes

When submitting to Google Play:

1. **Screenshot Location**: Upload the screenshot in the "Data Safety" section or as part of your app listing
2. **Description**: Include a brief description explaining that this is the in-app prominent disclosure shown before OS permission request
3. **Multiple Screenshots**: If disclosure is long and requires scrolling, consider including multiple screenshots showing different sections
4. **Language**: Ensure screenshot matches the primary language of your app listing

## Compliance Checklist

- [ ] Screenshot shows in-app disclosure (not OS dialog)
- [ ] Title clearly states purpose (FMCSA compliance)
- [ ] Explains what data is collected (precise GPS, continuous tracking)
- [ ] Explains why needed (FMCSA regulations, ELD compliance)
- [ ] Explains how used (HOS logs, duty status, vehicle sync)
- [ ] States data sharing policy (not shared except FMCSA)
- [ ] States retention period (6 months minimum)
- [ ] Shows "Allow & Continue" button
- [ ] Shows "Not Now" option
- [ ] Text is readable and professional
- [ ] Layout is clean and mobile-appropriate
- [ ] All required content is visible or clearly scrollable

