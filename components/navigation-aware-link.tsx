"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import * as React from "react";
import { useNavigationProgress } from "@/components/navigation-progress";

type AnchorProps = Omit<React.ComponentPropsWithoutRef<"a">, keyof LinkProps>;

type NavigationAwareLinkProps = LinkProps & AnchorProps;

export const NavigationAwareLink = React.forwardRef<
  HTMLAnchorElement,
  NavigationAwareLinkProps
>(function NavigationAwareLink({ onClick, ...props }, ref) {
  const { startNavigation } = useNavigationProgress();

  return (
    <Link
      ref={ref}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button !== 0
        ) {
          return;
        }

        startNavigation();
      }}
    />
  );
});
