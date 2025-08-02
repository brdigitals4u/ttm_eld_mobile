# TTMKonnect Assets Generation

This document explains how to generate the professional logo and splash screen assets for the TTMKonnect app.

## Created Assets

### 1. Logo Design (`assets/images/logo.svg`)
- **Modern truck logo** with connectivity elements
- **Blue gradient background** (#3B82F6 to #1D4ED8)
- **Green connectivity lines** (#10B981 to #059669)
- **Professional styling** with shadows and gradients
- **Scalable vector format** for crisp rendering at any size

### 2. Splash Screen Design (`assets/images/splash.svg`)
- **Dark gradient background** (#1E293B to #475569)
- **Centered logo** with professional styling
- **App name and tagline** with proper typography
- **Animated loading indicator** (in SVG)
- **Optimized for mobile screens** (1242x2688)

## Required PNG Assets

You need to generate the following PNG files from the SVG assets:

### App Icon (`assets/images/icon.png`)
- **Size**: 1024x1024 pixels
- **Source**: `logo.svg`
- **Usage**: Main app icon for iOS and Android

### Adaptive Icon (`assets/images/adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Source**: `logo.svg`
- **Usage**: Android adaptive icon foreground

### Splash Screen (`assets/images/splash.png`)
- **Size**: 1242x2688 pixels
- **Source**: `splash.svg`
- **Usage**: App launch splash screen

### Favicon (`assets/images/favicon.png`)
- **Size**: 32x32 pixels
- **Source**: `logo.svg`
- **Usage**: Web favicon

## Generation Methods

### Option 1: Online Converters
1. **Convertio**: https://convertio.co/svg-png/
2. **CloudConvert**: https://cloudconvert.com/svg-to-png
3. **SVG to PNG**: https://svgtopng.com/

### Option 2: Design Tools
1. **Figma**: Import SVG and export as PNG
2. **Sketch**: Import SVG and export as PNG
3. **Adobe Illustrator**: Open SVG and export as PNG

### Option 3: Command Line (Advanced)
```bash
# Install dependencies
npm install sharp svg2png

# Convert logo to icon
npx svg2png assets/images/logo.svg assets/images/icon.png --width=1024 --height=1024

# Convert logo to adaptive icon
npx svg2png assets/images/logo.svg assets/images/adaptive-icon.png --width=1024 --height=1024

# Convert splash to PNG
npx svg2png assets/images/splash.svg assets/images/splash.png --width=1242 --height=2688

# Convert logo to favicon
npx svg2png assets/images/logo.svg assets/images/favicon.png --width=32 --height=32
```

## Design Features

### Logo Design
- **Truck silhouette** representing transportation
- **Connectivity lines** representing ELD technology
- **Connection dots** showing network connectivity
- **Central hub** representing the app as a connection point
- **Professional gradients** for modern appearance

### Splash Screen Design
- **Dark theme** for professional appearance
- **Gradient background** for visual appeal
- **Centered logo** with proper spacing
- **Typography hierarchy** with app name and tagline
- **Loading animation** (SVG-based)

## Color Scheme

### Primary Colors
- **Blue**: #3B82F6 to #1D4ED8 (Primary brand color)
- **Green**: #10B981 to #059669 (Connectivity accent)
- **Gray**: #374151 (Text and details)

### Background Colors
- **Splash Background**: #1E293B to #475569 (Dark gradient)
- **Logo Background**: Transparent with blue gradient

## Implementation

The logo is also available as a React Native component:
```tsx
import TTMKonnectLogo from '@/components/TTMKonnectLogo';

// Usage
<TTMKonnectLogo size={80} showText={true} />
```

## App Configuration

The app configuration has been updated to use the new assets:
- **Splash background**: Changed from white to dark (#1E293B)
- **Android adaptive icon background**: Changed to dark (#1E293B)
- **Logo component**: Available for use throughout the app

## Next Steps

1. **Generate PNG assets** using one of the methods above
2. **Replace existing assets** in `assets/images/`
3. **Test the app** to ensure assets display correctly
4. **Update any remaining logo references** in the app

The new design provides a professional, modern appearance similar to industry leaders like Samsara, with clear branding and excellent visual hierarchy. 