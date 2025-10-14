"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationProgressContextValue = {
  isNavigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | undefined>(
  undefined
);

function NavigationProgressProviderInner({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const startNavigation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsNavigating(true);
    timeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      timeoutRef.current = null;
    }, 1500);
  }, []);

  const endNavigation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      endNavigation();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, searchKey, isNavigating, endNavigation]);

  const value = useMemo(
    () => ({
      isNavigating,
      startNavigation,
      endNavigation,
    }),
    [endNavigation, isNavigating, startNavigation]
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<NavigationProgressFallback>{children}</NavigationProgressFallback>}>
      <NavigationProgressProviderInner>
        {children}
      </NavigationProgressProviderInner>
    </Suspense>
  );
}

function NavigationProgressFallback({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      isNavigating: false,
      startNavigation: () => {},
      endNavigation: () => {},
    }),
    []
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    throw new Error("useNavigationProgress must be used within a NavigationProgressProvider");
  }
  return context;
}

export function NavigationOverlay() {
  const { isNavigating } = useNavigationProgress();
  const [visible, setVisible] = useState(false);
  const showDelayRef = useRef<NodeJS.Timeout | null>(null);
  const hideDelayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current);
      showDelayRef.current = null;
    }
    if (hideDelayRef.current) {
      clearTimeout(hideDelayRef.current);
      hideDelayRef.current = null;
    }

    if (isNavigating) {
      showDelayRef.current = setTimeout(() => {
        setVisible(true);
        showDelayRef.current = null;
      }, 120);
      return;
    }
    if (!visible) {
      return;
    }
    hideDelayRef.current = setTimeout(() => {
      setVisible(false);
      hideDelayRef.current = null;
    }, 150);
    return () => {
      if (hideDelayRef.current) {
        clearTimeout(hideDelayRef.current);
        hideDelayRef.current = null;
      }
    };
  }, [isNavigating, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-1">
      <div
        className="absolute inset-0 overflow-hidden rounded-b-sm bg-primary/10"
      >
        <div
          className="absolute inset-y-0 left-0 w-full bg-primary/80"
          style={{
            transformOrigin: "0% 50%",
            animation: "navigation-progress 1.2s ease-in-out infinite",
          }}
        />
      </div>
      <style jsx>{`
        @keyframes navigation-progress {
          0% {
            transform: translateX(-80%) scaleX(0.2);
            opacity: 0.4;
          }
          50% {
            transform: translateX(-10%) scaleX(0.7);
            opacity: 1;
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
