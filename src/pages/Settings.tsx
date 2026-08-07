import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-lg max-w-xl">
      <h1 className="text-headline-lg text-on-surface">Settings</h1>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">Appearance</h2>
        <div className="flex gap-sm">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex-1 h-9 rounded border text-body-sm capitalize",
                theme === t ? "border-primary text-primary" : "border-outline-variant text-on-surface"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">Language</h2>
        <select className="w-full h-9 rounded border border-outline-variant bg-surface-container-lowest px-sm text-body-md text-on-surface">
          <option>English</option>
          <option>Hindi</option>
          <option>Marathi</option>
        </select>
      </section>

      <section className="rounded border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="text-label-md uppercase text-on-surface-variant mb-sm">Notifications</h2>
        <div className="flex flex-col gap-sm text-body-md text-on-surface">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="accent-primary" />
            Critical alerts
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="accent-primary" />
            Warning alerts
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-primary" />
            Device offline notifications
          </label>
        </div>
      </section>
    </div>
  );
}
