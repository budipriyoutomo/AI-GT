"use client";

import type { IconType } from "react-icons";
import { SiInstagram, SiTiktok, SiWhatsapp, SiFacebook, SiYoutube } from "react-icons/si";
import { LuGlobe, LuMapPin, LuCalendar, LuHash, LuPhone } from "react-icons/lu";

// Brand pakai Simple Icons (logo resmi), generic pakai set Lucide. Semua asset frontend.
const ICONS: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  whatsapp: SiWhatsapp,
  facebook: SiFacebook,
  youtube: SiYoutube,
  website: LuGlobe,
  location: LuMapPin,
  booking: LuCalendar,
  hashtag: LuHash,
  phone: LuPhone,
};

/** Icon untuk slot footer. Ukuran 1em → skala ikut font-size (cqw) footer; warna ikut currentColor. */
export function SocialIcon({ slot }: { slot: string }) {
  const Ico = ICONS[slot];
  if (!Ico) return null;
  return <Ico size="1em" />;
}
