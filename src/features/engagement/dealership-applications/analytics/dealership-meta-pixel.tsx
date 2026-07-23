// oz-next-app/src/features/engagement/dealership-applications/analytics/dealership-meta-pixel.tsx
"use client";

import Script from "next/script";
import type { ReactElement } from "react";

import { isDealershipMetaPixelTokenAllowed } from "@/features/engagement/dealership-applications/analytics/dealership-meta-pixel.policy";
import { isClientProduction } from "@/lib/env/client-public-env";

const META_PIXEL_ID = "1757275381496365";
const META_PIXEL_SCRIPT_ID_PREFIX = "ozotec-dealership-meta-pixel";
const META_PIXEL_SCRIPT_SOURCE =
  "https://connect.facebook.net/en_US/fbevents.js";
const META_PIXEL_NOSCRIPT_SOURCE = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`;
const META_PIXEL_ENABLED = isClientProduction;

const META_PIXEL_BOOTSTRAP = `
!function(f,b,e,v,n,t,s){
  if(!f.fbq){
    n=f.fbq=function(){
      n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)
    };
    if(!f._fbq)f._fbq=n;
    n.push=n;
    n.loaded=!0;
    n.version='2.0';
    n.queue=[];
    t=b.createElement(e);
    t.async=!0;
    t.src=v;
    s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }
  if(!f.__ozotecDealershipMetaPixelInitialized){
    f.fbq('init','${META_PIXEL_ID}');
    f.__ozotecDealershipMetaPixelInitialized=!0;
  }
  f.fbq('track','PageView');
}(window,document,'script','${META_PIXEL_SCRIPT_SOURCE}');
`;

type MetaPixelLeadParameters = Readonly<{
  content_name: "Ozotec EV dealership application";
  content_category: "Dealership application";
}>;

type MetaPixelSubmitApplicationParameters = Readonly<Record<string, never>>;

type MetaPixelEventOptions = Readonly<{
  eventID: string;
}>;

type MetaPixelFunction = {
  (command: "track", eventName: "PageView"): void;
  (
    command: "track",
    eventName: "Lead",
    parameters: MetaPixelLeadParameters,
    options: MetaPixelEventOptions,
  ): void;
  (
    command: "track",
    eventName: "SubmitApplication",
    parameters: MetaPixelSubmitApplicationParameters,
    options: MetaPixelEventOptions,
  ): void;
};

type MetaPixelWindow = Window & Readonly<{ fbq?: MetaPixelFunction }>;

function trackMetaPixelBestEffort(trackEvent: () => void): void {
  try {
    trackEvent();
  } catch {
    return;
  }
}

export type DealershipMetaPixelProps = Readonly<{
  token: string;
}>;

export function trackDealershipApplicationLead(
  eventId: string,
  token: string,
): void {
  if (
    !META_PIXEL_ENABLED ||
    typeof window === "undefined" ||
    !isDealershipMetaPixelTokenAllowed(token)
  ) {
    return;
  }

  const metaPixelWindow = window as MetaPixelWindow;
  const normalizedEventId = eventId.trim();

  if (
    normalizedEventId.length === 0 ||
    normalizedEventId.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/u.test(normalizedEventId) ||
    typeof metaPixelWindow.fbq !== "function"
  ) {
    return;
  }

  const fbq = metaPixelWindow.fbq;
  const eventOptions = { eventID: normalizedEventId };

  trackMetaPixelBestEffort(() => {
    fbq(
      "track",
      "Lead",
      {
        content_name: "Ozotec EV dealership application",
        content_category: "Dealership application",
      },
      eventOptions,
    );
  });
  trackMetaPixelBestEffort(() => {
    fbq("track", "SubmitApplication", {}, eventOptions);
  });
}

export function DealershipMetaPixel({
  token,
}: DealershipMetaPixelProps): ReactElement | null {
  if (!META_PIXEL_ENABLED || !isDealershipMetaPixelTokenAllowed(token)) {
    return null;
  }

  const normalizedToken = token.trim().toLocaleLowerCase("en-US");

  return (
    <>
      <Script
        id={`${META_PIXEL_SCRIPT_ID_PREFIX}-${normalizedToken}`}
        strategy="afterInteractive"
      >
        {META_PIXEL_BOOTSTRAP}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's noscript beacon must remain a raw 1×1 tracking request. */}
        <img
          alt=""
          aria-hidden="true"
          height={1}
          width={1}
          src={META_PIXEL_NOSCRIPT_SOURCE}
          style={{ display: "none" }}
        />
      </noscript>
    </>
  );
}
