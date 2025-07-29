import { useEffect, useRef } from 'react';
import { useSegments, usePathname } from 'expo-router';
import { useAnalytics } from './useAnalytics';

export const useNavigationAnalytics = () => {
  const segments = useSegments();
  const pathname = usePathname();
  const { trackPageChange, trackScreenView } = useAnalytics();
  const previousPath = useRef<string>('');
  const previousSegments = useRef<string[]>([]);

  useEffect(() => {
    const currentPath = pathname || `/${segments.join('/')}`;
    
    // Skip tracking on initial load
    if (previousPath.current === '') {
      previousPath.current = currentPath;
      previousSegments.current = [...segments];
      
      // Track initial screen view
      trackScreenView(currentPath, getScreenClass(segments));
      return;
    }

    // Track page change if path actually changed
    if (currentPath !== previousPath.current) {
      const navigationMethod = determineNavigationMethod(
        previousSegments.current,
        segments
      );

      trackPageChange(
        previousPath.current,
        currentPath,
        navigationMethod,
        {
          previous_segments: previousSegments.current.join('/'),
          current_segments: segments.join('/'),
        }
      );

      // Track screen view
      trackScreenView(currentPath, getScreenClass(segments), {
        from_screen: previousPath.current,
        navigation_method: navigationMethod,
      });

      previousPath.current = currentPath;
      previousSegments.current = [...segments];
    }
  }, [segments, pathname, trackPageChange, trackScreenView]);

  return {
    currentPath: pathname || `/${segments.join('/')}`,
    segments,
  };
};

function getScreenClass(segments: string[]): string {
  if (segments.length === 0) return 'root';
  
  // Check if it's a tab
  if (segments.includes('(tabs)')) {
    const tabIndex = segments.indexOf('(tabs)');
    const tabName = segments[tabIndex + 1];
    return `tab_${tabName || 'unknown'}`;
  }
  
  // Check if it's in app section
  if (segments.includes('(app)')) {
    return `app_${segments[segments.length - 1] || 'unknown'}`;
  }
  
  // Check if it's auth section
  if (segments.includes('(auth)')) {
    return `auth_${segments[segments.length - 1] || 'unknown'}`;
  }
  
  return segments[segments.length - 1] || 'unknown';
}

function determineNavigationMethod(
  previousSegments: string[],
  currentSegments: string[]
): 'tab' | 'navigation' | 'back' | 'deep_link' {
  // Check if it's tab navigation
  const prevTabIndex = previousSegments.indexOf('(tabs)');
  const currTabIndex = currentSegments.indexOf('(tabs)');
  
  if (prevTabIndex !== -1 && currTabIndex !== -1) {
    const prevTab = previousSegments[prevTabIndex + 1];
    const currTab = currentSegments[currTabIndex + 1];
    if (prevTab !== currTab) {
      return 'tab';
    }
  }
  
  // Check if going back (fewer segments)
  if (currentSegments.length < previousSegments.length) {
    return 'back';
  }
  
  // Default to navigation
  return 'navigation';
}
