"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useI18n } from "@/components/i18n-provider";
import { usePostHogReady } from "@/components/posthog-provider";

const CONSENT_KEY = "kulera-analytics-consent";

export function CookieConsent() {
  const posthog = usePostHog();
  const ready = usePostHogReady();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready || !posthog) return;

    // PostHog treats the pre-choice state as "opted out" (opt_out_capturing_by_default),
    // so its has_opted_* helpers can't tell "no decision yet" from "declined". We track
    // the explicit choice ourselves and show the banner only when none has been made.
    const decided = localStorage.getItem(CONSENT_KEY) !== null;
    if (!decided) setVisible(true);
  }, [ready, posthog]);

  if (!visible || !posthog) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "granted");
    posthog.opt_in_capturing();
    // Record the landing pageview that was skipped before consent was given.
    posthog.capture("$pageview");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "denied");
    posthog.opt_out_capturing();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("ქუქი-ფაილების თანხმობა")}
      className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:pb-6"
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-[20px] border border-oat bg-surface px-5 py-4 shadow-panel"
        style={{ animation: "kulera-fade-up 0.3s ease-out" }}
      >
        <p className="text-sm font-semibold leading-relaxed text-ink/80">
          {t(
            "ვიყენებთ ქუქი-ფაილებს ანალიტიკისთვის, რომ გავიგოთ როგორ გამოიყენება საიტი და გავაუმჯობესოთ.",
          )}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={decline}
            className="rounded-full px-4 py-2 text-sm font-bold text-muted transition hover:bg-oat/60"
          >
            {t("უარი")}
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-clay px-5 py-2 text-sm font-bold text-white transition hover:bg-clay-dark"
          >
            {t("თანხმობა")}
          </button>
        </div>
      </div>
    </div>
  );
}
