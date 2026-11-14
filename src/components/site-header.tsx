import Link from "next/link";
import { formatLong, todayIn } from "@/lib/dates";
import { NavLinks } from "./nav-links";
import { Nixie } from "./nixie";
import { Worldline } from "./worldline";

/** Header: wordmark with the nixie date readout, navigation, and the year's world line. */
export function SiteHeader() {
  const today = todayIn();
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="wordmark text-[1.1rem]">Chronolab</Link>
          <Nixie value={today.replaceAll("-", ".")} size="0.95rem" label={`Today is ${formatLong(today)}`} />
        </div>
        <NavLinks />
      </div>
      <Worldline />
    </header>
  );
}
