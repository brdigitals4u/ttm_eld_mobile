import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import ChatWootWidget from '@chatwoot/react-native-widget';
import { CHATWOOT_CONFIG } from "@/utils/chatwootConfig"
import { useAppTheme } from '@/theme/context';
import { toast } from '@/components/Toast';

import { useChatSupport } from '../contexts/ChatSupportContext';

/** polyfill if necessary (optional) */
if (typeof BackHandler.removeEventListener !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BackHandler as any).removeEventListener = () => {};
}

const ChatSupportScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const colors = theme.colors;
  const [showWidget, setShowWidget] = useState(true);
  const [remountKey, setRemountKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const chatSupport = useChatSupport();

  // Destructure stable functions/values from context
  const { setIsLoading, user: csUser, customAttributes: csCustomAttrs, isLoading } = chatSupport;

  // Memoize user and customAttributes so references are stable
  const user = useMemo(() => {
    return {
      identifier: csUser?.identifier || 'guest',
      name: csUser?.name || 'Driver',
      email: csUser?.email || '',
      avatar_url: '',
      identifier_hash: '',
    };
  }, [csUser?.identifier, csUser?.name, csUser?.email]);

  const customAttributes = useMemo(() => {
    return csCustomAttrs || {};
  }, [JSON.stringify(csCustomAttrs || {})]); // lightweight deep-check; ok for small objects

  // stable close handler
  const handleCloseModal = useCallback(() => {
    setShowWidget(false);
    router.back();
  }, [router]);

  // Focus effect — runs when screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Debugging: set to true to see logs in console
      const DEBUG = false;
      if (DEBUG) console.log('[ChatSupport] onFocus');

      // set loading state, remount widget safely
      setIsLoading?.(true);

      // Small debounce to avoid double-focus loops
      const timer = setTimeout(() => {
        // Force a remount only when needed
        setRemountKey(k => k + 1);
        setShowWidget(true);
        setIsLoading?.(false);
        if (DEBUG) console.log('[ChatSupport] widget shown; key=', remountKey + 1);
      }, 300);

      return () => {
        clearTimeout(timer);
        if (DEBUG) console.log('[ChatSupport] focus cleanup');
      };
    }, [setIsLoading]) // only depend on the setter (stable if context preserves it)
  );

  // Initial mount loading display
  useEffect(() => {
    setIsLoading?.(true);
    const t = setTimeout(() => setIsLoading?.(false), 1500);
    return () => clearTimeout(t);
  }, [setIsLoading]);

  // Validate Chatwoot URL on mount
  useEffect(() => {
    const validateUrl = async () => {
      try {
        // Check if URL is valid format
        const url = new URL(CHATWOOT_CONFIG.BASE_URL);
        if (!url.hostname || url.hostname === 'undefined') {
          console.error('❌ Chatwoot: Invalid base URL:', CHATWOOT_CONFIG.BASE_URL);
          setHasError(true);
          toast.error('Chatwoot configuration error. Please contact support.');
          return;
        }
      } catch (error) {
        console.error('❌ Chatwoot: URL validation failed:', error);
        setHasError(true);
        toast.error('Chatwoot URL is invalid. Please contact support.');
      }
    };
    validateUrl();
  }, []);

  const handleWidgetError = useCallback((error: any) => {
    console.error('❌ Chatwoot Widget Error:', error);
    setHasError(true);
    toast.error('Failed to load chat support. Please check your connection.');
  }, []);

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load Chat Support</Text>
          <Text style={[styles.errorMessage, { color: colors.textDim }]}>
            The chat service is currently unavailable. Please try again later or contact support directly.
          </Text>
          <Text style={[styles.errorUrl, { color: colors.textDim }]}>
            URL: {CHATWOOT_CONFIG.BASE_URL}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4338CA" />
        </View>
      )}

      {showWidget && !hasError && (
        <ChatWootWidget
          key={remountKey}
          websiteToken={CHATWOOT_CONFIG.WEBSITE_TOKEN}
          baseUrl={CHATWOOT_CONFIG.BASE_URL}
          locale={CHATWOOT_CONFIG.WIDGET_CONFIG.locale}
          user={user}
          customAttributes={customAttributes}
          isModalVisible={showWidget}
          closeModal={handleCloseModal}
          onError={handleWidgetError}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loaderContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 1000,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorUrl: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

export default ChatSupportScreen;
