# Generate New Trident App Icons

## Overview
The app logo has been updated to show only a trident design in indigo colors (without "TTMKonnect" text).

## New Logo Design
- **Shape**: Trident (three-pronged spear)
- **Color**: Indigo gradient (#6366F1 to #4338CA)
- **Background**: Indigo circular background
- **Text**: Removed (only shows trident)

## Required Icon Sizes

### iOS Icons
- `ios-20.png` - 20x20px
- `ios-29.png` - 29x29px  
- `ios-40.png` - 40x40px
- `ios-60.png` - 60x60px
- `ios-76.png` - 76x76px
- `ios-83.5.png` - 83.5x83.5px
- `ios-1024.png` - 1024x1024px

### Android Icons
- `mipmap-mdpi.png` - 48x48px
- `mipmap-hdpi.png` - 72x72px
- `mipmap-xhdpi.png` - 96x96px
- `mipmap-xxhdpi.png` - 144x144px
- `mipmap-xxxhdpi.png` - 192x192px

### App Store Icons
- `app-icon-ios.png` - 1024x1024px
- `app-icon-android-legacy.png` - 512x512px
- `app-icon-android-adaptive-foreground.png` - 1024x1024px
- `app-icon-android-adaptive-background.png` - 1024x1024px (solid indigo color)
- `app-icon-web-favicon.png` - 48x48px
- `playstore.png` - 512x512px

## How to Generate Icons

### Option 1: Using Online Tools
1. Go to [App Icon Generator](https://appicon.co/) or [MakeAppIcon](https://makeappicon.com/)
2. Upload the `trident-icon.svg` file
3. Download the generated icon pack
4. Replace the existing files in `assets/images/`

### Option 2: Using Design Software
1. Open `trident-icon.svg` in Figma, Sketch, or Adobe Illustrator
2. Export at the required sizes
3. Save as PNG files with the correct names

### Option 3: Using Command Line (if you have ImageMagick)
```bash
# Install ImageMagick if not already installed
brew install imagemagick

# Convert SVG to various PNG sizes
convert trident-icon.svg -resize 20x20 assets/images/ios/ios-20.png
convert trident-icon.svg -resize 29x29 assets/images/ios/ios-29.png
convert trident-icon.svg -resize 40x40 assets/images/ios/ios-40.png
convert trident-icon.svg -resize 60x60 assets/images/ios/ios-60.png
convert trident-icon.svg -resize 76x76 assets/images/ios/ios-76.png
convert trident-icon.svg -resize 83.5x83.5 assets/images/ios/ios-83.5.png
convert trident-icon.svg -resize 1024x1024 assets/images/ios/ios-1024.png

# Android icons
convert trident-icon.svg -resize 48x48 assets/images/android/mipmap-mdpi.png
convert trident-icon.svg -resize 72x72 assets/images/android/mipmap-hdpi.png
convert trident-icon.svg -resize 96x96 assets/images/android/mipmap-xhdpi.png
convert trident-icon.svg -resize 144x144 assets/images/android/mipmap-xxhdpi.png
convert trident-icon.svg -resize 192x192 assets/images/android/mipmap-xxxhdpi.png

# App store icons
convert trident-icon.svg -resize 1024x1024 assets/images/app-icon-ios.png
convert trident-icon.svg -resize 512x512 assets/images/app-icon-android-legacy.png
convert trident-icon.svg -resize 1024x1024 assets/images/app-icon-android-adaptive-foreground.png
convert trident-icon.svg -resize 48x48 assets/images/app-icon-web-favicon.png
convert trident-icon.svg -resize 512x512 assets/images/playstore/playstore.png

# Create solid indigo background for Android adaptive icon
convert -size 1024x1024 xc:"#4338CA" assets/images/app-icon-android-adaptive-background.png
```

## After Generating Icons
1. Replace all the icon files in `assets/images/`
2. Run `npx expo prebuild --clean` to regenerate native code
3. Test the app to ensure icons appear correctly

## Current Status
✅ Logo component updated to show trident only
✅ Login screen updated to use logo without text  
✅ SVG template created (`trident-icon.svg`)
⏳ App icons need to be generated and replaced
