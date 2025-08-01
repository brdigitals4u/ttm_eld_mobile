#!/bin/bash

# Setup Supabase Database Schema for ELD Device Logging
echo "🚀 Setting up Supabase database schema for ELD Device Logging..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please make sure your environment variables are set."
    exit 1
fi

echo "📊 Creating ELD device logging table structure..."

# Execute the SQL schema
supabase db reset --db-url "postgresql://postgres:[password]@db.ddvndgjotlsihkeluxpf.supabase.co:6543/postgres" --file ./supabase/schema.sql

echo "✅ Database schema setup complete!"
echo ""
echo "🔗 Your Supabase project is ready at: https://ddvndgjotlsihkeluxpf.supabase.co"
echo "📱 Your React Native app is now configured to log ELD device events to Supabase."
echo ""
echo "Next steps:"
echo "1. Make sure to install dependencies: npm install @supabase/supabase-js @react-native-async-storage/async-storage"
echo "2. Test the connection by running your app and connecting to an ELD device"
echo "3. Check your Supabase dashboard to see the logged events"
