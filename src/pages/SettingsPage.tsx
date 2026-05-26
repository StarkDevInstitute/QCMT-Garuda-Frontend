import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { useState } from 'react'

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 px-2 text-xs rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

export function SettingsPage() {
  const { settings, updateServer } = useSettingsStore()
  const [saved, setSaved] = useState(false)

  const [local, setLocal] = useState(settings.server)
  const handleSave = () => {
    updateServer(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="overflow-auto h-full p-4 space-y-6 max-w-2xl">
      {/* Server connection */}
      <section>
        <h2 className="text-sm font-semibold mb-3 border-b border-border pb-1">
          Server Connection
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Host" value={local.host} onChange={(v) => setLocal((s) => ({ ...s, host: v }))} placeholder="localhost" />
          <Field label="Port" type="number" value={local.port} onChange={(v) => setLocal((s) => ({ ...s, port: parseInt(v) || 3306 }))} />
          <Field label="Database" value={local.database} onChange={(v) => setLocal((s) => ({ ...s, database: v }))} placeholder="seiscomp" />
          <Field label="User" value={local.user} onChange={(v) => setLocal((s) => ({ ...s, user: v }))} placeholder="scuser" />
        </div>
      </section>

      {/* FDSN endpoints */}
      <section>
        <h2 className="text-sm font-semibold mb-3 border-b border-border pb-1">
          FDSN Web Services
        </h2>
        <div className="space-y-2">
          <Field
            label="Event Catalog URL"
            value={local.fdsnEventUrl}
            onChange={(v) => setLocal((s) => ({ ...s, fdsnEventUrl: v }))}
          />
          <Field
            label="Waveform (Dataselect) URL"
            value={local.fdsnDataselectUrl}
            onChange={(v) => setLocal((s) => ({ ...s, fdsnDataselectUrl: v }))}
          />
          <Field
            label="Station Metadata URL"
            value={local.fdsnStationUrl}
            onChange={(v) => setLocal((s) => ({ ...s, fdsnStationUrl: v }))}
          />
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-sm font-semibold mb-3 border-b border-border pb-1">About</h2>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>SCMTV BMKG — Seismic Moment Tensor Viewer</div>
          <div>Phase 1 — Web Mode (Vite + React)</div>
          <div>Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)</div>
        </div>
      </section>

      <Button onClick={handleSave} size="sm">
        <Save size={13} /> {saved ? 'Saved!' : 'Save Settings'}
      </Button>
    </div>
  )
}
