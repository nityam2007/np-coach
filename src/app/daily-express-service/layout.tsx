import { DailyExpressHubExtras } from "@/components/sections/DailyExpressHubExtras";
import { getSettings } from "@/lib/directus";
import { computeGross } from "@/lib/stripe";

export default async function DailyExpressLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const singleFare = computeGross(settings.pricing.dailyExpressSingle, settings.pricing.dailyExpressVat).gross;
  const returnFare = computeGross(settings.pricing.dailyExpressReturn, settings.pricing.dailyExpressVat).gross;

  return (
    <>
      {children}
      <DailyExpressHubExtras singleFare={singleFare} returnFare={returnFare} phone={settings.phone} />
    </>
  );
}
