import { useRef, useCallback } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import { ChatwootMessage } from '../utils/chatwootConfig';

interface WebViewRef {
  injectJavaScript: (script: string) => void;
  postMessage?: (message: string) => void;
}

interface UseChatwootWebViewOptions {
  onReady?: () => void;
  onError?: (error: string) => void;
  onMessageReceived?: (message: ChatwootMessage) => void;
}

export const useChatwootWebView = (options: UseChatwootWebViewOptions = {}) => {
  const webViewRef = useRef<WebViewRef>(null);
  const messageHandlersRef = useRef<Map<string, (payload: any) => void>>(new Map());

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: ChatwootMessage = JSON.parse(event.nativeEvent.data);

        if (!message.type) {
          console.warn('Invalid message format from WebView');
          return;
        }

        switch (message.type) {
          case 'CHATWOOT_READY':
            if (options.onReady) {
              options.onReady();
            }
            break;

          case 'CHATWOOT_ERROR':
            if (options.onError) {
              options.onError(message.payload?.error || 'Unknown Chatwoot error');
            }
            break;

          default:
            const handler = messageHandlersRef.current.get(message.type);
            if (handler) {
              handler(message.payload);
            }

            if (options.onMessageReceived) {
              options.onMessageReceived(message);
            }
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    },
    [options]
  );

  const postMessage = useCallback(
    (message: ChatwootMessage) => {
      if (webViewRef.current) {
        try {
          if (webViewRef.current.postMessage) {
            webViewRef.current.postMessage(JSON.stringify(message));
          } else {
            const script = `
              (function() {
                const event = new MessageEvent('message', {
                  data: ${JSON.stringify(message)}
                });
                window.dispatchEvent(event);
              })();
            `;
            webViewRef.current.injectJavaScript(script);
          }
        } catch (error) {
          console.error('Error sending message to WebView:', error);
        }
      }
    },
    []
  );

  const updateUser = useCallback(
    (userData: Record<string, any>) => {
      postMessage({
        type: 'UPDATE_USER',
        payload: userData,
      });
    },
    [postMessage]
  );

  const registerMessageHandler = useCallback(
    (messageType: string, handler: (payload: any) => void) => {
      messageHandlersRef.current.set(messageType, handler);
      return () => {
        messageHandlersRef.current.delete(messageType);
      };
    },
    []
  );

  const executeScript = useCallback((script: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  const minimizeChat = useCallback(() => {
    executeScript(`
      if (window.chatwootSDK && window.chatwootSDK.toggleBubble) {
        window.chatwootSDK.toggleBubble();
      }
    `);
  }, [executeScript]);

  const openChat = useCallback(() => {
    executeScript(`
      if (window.chatwootSDK && window.chatwootSDK.open) {
        window.chatwootSDK.open();
      }
    `);
  }, [executeScript]);

  const closeChat = useCallback(() => {
    executeScript(`
      if (window.chatwootSDK && window.chatwootSDK.close) {
        window.chatwootSDK.close();
      }
    `);
  }, [executeScript]);

  return {
    webViewRef,
    handleWebViewMessage,
    postMessage,
    updateUser,
    registerMessageHandler,
    executeScript,
    minimizeChat,
    openChat,
    closeChat,
  };
};

export type UseChatwootWebViewReturn = ReturnType<typeof useChatwootWebView>;
