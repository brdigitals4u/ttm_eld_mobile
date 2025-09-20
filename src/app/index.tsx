import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts'
import { useAppTheme } from '@/theme/context'

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth()
  const { theme } = useAppTheme()

  console.log('Index component - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading)

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background 
      }}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
      </View>
    )
  }

  if (isAuthenticated) {
    console.log('Redirecting to dashboard')
    return <Redirect href="/(tabs)/dashboard" />
  }

  console.log('Redirecting to login')
  return <Redirect href="/login" />
}