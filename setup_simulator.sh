#!/bin/bash

# KD032 ELD Simulator Setup Script
# This script installs the required dependencies for the KD032 ELD simulator

echo "🔧 Setting up KD032 ELD Simulator..."
echo "======================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.7 or higher and try again."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed!"
    echo "Please install pip3 and try again."
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"

# Install required packages
echo ""
echo "📦 Installing required packages..."

# Install bleak for BLE functionality
echo "Installing bleak (BLE library)..."
pip3 install bleak

# Install asyncio (usually comes with Python 3)
echo "Installing asyncio..."
pip3 install asyncio

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the KD032 ELD simulator:"
echo "   python3 ble_eld_simulator.py"
echo ""
echo "📱 Then open your Android app and scan for devices."
echo "   Look for 'KD032-43149A' in the scan results."
echo ""
echo "🔍 The simulator will create a virtual KD032 device that:"
echo "   - Appears as 'KD032-43149A' with address 'C4:A8:28:43:14:9A'"
echo "   - Connects without passcode (like real KD032)"
echo "   - Transmits realistic ELD data"
echo ""
echo "Press Ctrl+C in the simulator to stop it." 