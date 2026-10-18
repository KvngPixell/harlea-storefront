import { useState, type FormEvent } from 'react'
import { toast } from '../components/ui'
import { resetDemo, store, type SiteSettings } from '../lib/store'
import { auth } from '../lib/supabase'
import { useAdminCtx } from './AdminApp'
import { ConfirmDialog, Field, PageHeader, Panel, reportError } from './components'

const URL_FIELDS: Array<[keyof SiteSettings, string, string]> = [
  ['instagram_url', 'Instagram link', 'https://instagram.com/yourname'],
  ['tiktok_url', 'TikTok link', 'https://tiktok.com/@yourname'],
  ['facebook_url', 'Facebook link', 'https://facebook.com/yourpage'],
]

export default function Settings() {
  const { catalog, reload, demo } = useAdminCtx()
  const [s, setS] = useState<SiteSettings>(catalog.settings)
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    for (const [k, label] of URL_FIELDS) {
      const v = (s[k] ?? '').trim()
      if (v && !/^https:\/\//.test(v)) return toast(`${label} should start with https://`)
    }
    if (s.contact_email && !/^\S+@\S+\.\S+$/.test(s.contact_email)) return toast('That contact email doesn’t look right')
    if (!s.brand_name.trim()) return toast('The shop needs a name')
    setBusy(true)
    try {
      const clean = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || (k.endsWith('_url') || k === 'contact_email' ? null : '')) : v])) as unknown as SiteSettings
      await store.saveSettings(clean)
      await reload()
      toast('Settings saved ✓')
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return toast('Use at least 8 characters')
    if (pw !== pw2) return toast('The two passwords don’t match')
    try {
      await auth.setPassword(pw)
      setPw(''); setPw2('')
      toast('Password set! You can now log in with it.')
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your shop’s name, the scrolling banner, and social links." />
      <form onSubmit={save} className="space-y-5">
        <Panel title="Shop details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop name"><input className="field" value={s.brand_name} onChange={(e) => setS({ ...s, brand_name: e.target.value })} maxLength={40} /></Field>
            <Field label="Contact email" hint="Shown in the footer and on the Contact page."><input className="field" type="email" value={s.contact_email ?? ''} onChange={(e) => setS({ ...s, contact_email: e.target.value })} /></Field>
            <Field label="Tagline" hint="The big headline on the home page. Use “&” to get a cute script ampersand.">
              <input className="field" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} maxLength={90} />
            </Field>
            <Field label="Scrolling banner" hint="The pink strip at the very top of every page. Leave empty to hide it.">
              <input className="field" value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })} maxLength={90} />
            </Field>
          </div>
        </Panel>
        <Panel title="Social links">
          <div className="grid gap-4 sm:grid-cols-3">
            {URL_FIELDS.map(([k, label, ph]) => (
              <Field key={k} label={label}><input className="field" type="url" value={(s[k] as string | null) ?? ''} placeholder={ph} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></Field>
            ))}
          </div>
        </Panel>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>

      {!demo ? (
        <Panel title="Your password" className="mt-8">
          <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="New password"><input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field label="Type it again"><input className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
            <button className="btn btn-soft">Set password</button>
          </form>
          <p className="mt-2 text-sm text-muted">Optional. Lets you log in without waiting for an email link.</p>
        </Panel>
      ) : (
        <Panel title="Practice data" className="mt-8">
          <p className="text-muted">Start over with the original sample products, outfits and orders.</p>
          <button className="btn btn-soft mt-3" onClick={() => setConfirmReset(true)}>Reset practice data</button>
        </Panel>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset practice data?"
        body="Your practice changes in this browser will be replaced with the original samples."
        confirmLabel="Yes, reset"
        onConfirm={async () => { setConfirmReset(false); resetDemo(); await reload(); setS(catalog.settings); toast('Practice data reset') }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  )
}
