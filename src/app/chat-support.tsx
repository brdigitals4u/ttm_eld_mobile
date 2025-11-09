import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import ChatWootWidget from '@chatwoot/react-native-widget';
import { CHATWOOT_CONFIG } from "@/utils/chatwootConfig"

import { useChatSupport } from '../contexts/ChatSupportContext';

/** polyfill if necessary (optional) */
if (typeof BackHandler.removeEventListener !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BackHandler as any).removeEventListener = () => {};
}

const ChatSupportScreen: React.FC = () => {
  const router = useRouter();
  const [showWidget, setShowWidget] = useState(true);
  const [remountKey, setRemountKey] = useState(0);
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

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4338CA" />
        </View>
      )}

      {showWidget && (
        <ChatWootWidget
          key={remountKey}
          websiteToken={CHATWOOT_CONFIG.WEBSITE_TOKEN}
          baseUrl={CHATWOOT_CONFIG.BASE_URL}
          locale={CHATWOOT_CONFIG.WIDGET_CONFIG.locale}
          user={user}
          customAttributes={customAttributes}
          isModalVisible={showWidget}
          closeModal={handleCloseModal}
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
});

export default ChatSupportScreen;
