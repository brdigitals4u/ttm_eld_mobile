#!/bin/bash

# KD032 J1939 ELD Simulator Setup Script
# This script sets up the J1939-based KD032 ELD simulator

echo "🔧 Setting up KD032 J1939 ELD Simulator..."
echo "=========================================="

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

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
python3 -m venv j1939_env

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source j1939_env/bin/activate

# Install required packages
echo ""
echo "📦 Installing required packages..."

echo "Installing python-can (CAN bus library)..."
pip install python-can

echo "Installing python-j1939 (J1939 protocol library)..."
pip install python-j1939

echo "Installing additional dependencies..."
pip install threading datetime typing

echo ""
echo "🔧 Setting up virtual CAN interface..."

# Check if running as root for CAN setup
if [ "$EUID" -eq 0 ]; then
    echo "Setting up virtual CAN interface (running as root)..."
    
    # Load vcan module
    modprobe vcan 2>/dev/null || echo "⚠️  vcan module already loaded"
    
    # Create vcan0 interface
    ip link add dev vcan0 type vcan 2>/dev/null || echo "⚠️  vcan0 interface already exists"
    
    # Bring interface up
    ip link set up vcan0 2>/dev/null || echo "⚠️  vcan0 interface already up"
    
    echo "✅ Virtual CAN interface setup complete"
else
    echo "⚠️  Not running as root - CAN interface setup skipped"
    echo "💡 To setup CAN interface manually, run:"
    echo "   sudo modprobe vcan"
    echo "   sudo ip link add dev vcan0 type vcan"
    echo "   sudo ip link set up vcan0"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the KD032 J1939 simulator:"
echo "   source j1939_env/bin/activate"
echo "   python kd032_j1939_simulator.py"
echo ""
echo "📱 The simulator will:"
echo "   • Create virtual CAN bus (vcan0)"
echo "   • Transmit J1939 PGN messages"
echo "   • Generate realistic engine data"
echo "   • Simulate vehicle operation"
echo "   • Transmit ELD-compliant data"
echo ""
echo "🔍 Monitor CAN traffic with:"
echo "   candump vcan0"
echo ""
echo "Press Ctrl+C in the simulator to stop it." 