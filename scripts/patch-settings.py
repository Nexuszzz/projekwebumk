from pathlib import Path

p = Path(r"D:\umkm-an-modal-components\components\dashboard\settings-view.tsx")
text = p.read_text(encoding="utf-8")
start = text.find("function SecuritySection()")
end = text.find("const TIMEZONES =")
assert start > 0 and end > start, (start, end)

new_security = r'''function SecuritySection() {
  const [hasPassword, setHasPassword] = useState(true)
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null)
  const [currentDevice, setCurrentDevice] = useState('Browser')
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadSecurity() {
    try {
      const res = await fetch('/api/auth/security', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat keamanan.')
      setHasPassword(Boolean(data.hasPassword))
      setPasswordChangedAt(data.passwordChangedAt || null)
      const current = (data.sessions || []).find((s: { current?: boolean }) => s.current)
      if (current?.device) setCurrentDevice(current.device)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat keamanan.')
    }
  }

  useEffect(() => {
    void loadSecurity()
  }, [])

  async function revokeOthers() {
    try {
      const res = await fetch('/api/auth/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeOthers: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengeluarkan sesi lain.')
      setHint(data.message || 'Perangkat lain dikeluarkan. Sesi ini tetap aktif.')
      window.setTimeout(() => setHint(null), 2800)
      await loadSecurity()
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal mengeluarkan sesi.')
    }
  }

  async function submitPassword() {
    setPwBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, nextPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal ganti kata sandi.')
      setPwOpen(false)
      setCurrentPassword('')
      setNextPassword('')
      setPasswordChangedAt(new Date().toISOString())
      setHint(data.message || 'Kata sandi diganti. Sesi perangkat lain dikeluarkan.')
      window.setTimeout(() => setHint(null), 2800)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal ganti kata sandi.')
    } finally {
      setPwBusy(false)
    }
  }

  const passwordDesc = !hasPassword
    ? 'Akun Google — sandi lokal opsional'
    : passwordChangedAt
      ? `Terakhir diganti ${new Date(passwordChangedAt).toLocaleDateString('id-ID')}`
      : 'Belum pernah diganti di UMKMan'

  return (
    <SectionCard id="keamanan" title="Keamanan" desc="Kata sandi dan kontrol sesi login.">
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={KeyRound} title="Kata sandi" desc={passwordDesc}>
          <button
            type="button"
            disabled={!hasPassword}
            onClick={() => setPwOpen((o) => !o)}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
          >
            {pwOpen ? 'Tutup' : 'Ganti'}
          </button>
        </SettingRow>
        <SettingRow
          icon={LogOut}
          title="Logout perangkat lain"
          desc="Membatalkan semua sesi kecuali browser ini"
        >
          <button
            type="button"
            onClick={() => void revokeOthers()}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            Keluarkan
          </button>
        </SettingRow>
      </div>

      <AnimatePresence>
        {pwOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-xl border border-border p-3.5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Sandi saat ini</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Sandi baru (min. 8)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={pwBusy || currentPassword.length < 1 || nextPassword.length < 8}
              onClick={() => void submitPassword()}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {pwBusy ? 'Menyimpan...' : 'Simpan kata sandi'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 rounded-xl border border-border p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sesi ini</p>
        <p className="mt-1.5 text-sm font-medium">{currentDevice}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Aktif di browser ini</p>
      </div>
      {hint && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent" aria-live="polite">
          <Check className="size-3.5" aria-hidden="true" />
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </SectionCard>
  )
}

'''

text = text[:start] + new_security + text[end:]
s2 = text.find("function SubscriptionSection()")
s3 = text.find("function DangerSection()")
assert s2 > 0 and s3 > s2, (s2, s3)
text = text[:s2] + text[s3:]
text = text.replace("        <SubscriptionSection />\n", "")
p.write_text(text, encoding="utf-8")
print("ok", p.stat().st_size)
