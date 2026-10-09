import { useState, type FormEvent } from 'react';
import { supabase } from '../../services/supabase';
import { explain, type SyncState } from '../../hooks/useSync';

interface AccountPanelProps {
  sync: SyncState;
  onSyncNow: () => void;
}

export function AccountPanel({ sync, onSyncNow }: AccountPanelProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase || sync.status === 'off') return null;

  async function run(kind: 'in' | 'up') {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error, data } = kind === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) return setMessage(explain(error.message));
      if (kind === 'up' && !data.session) return setMessage('Check your email and confirm your address, then sign in here.');
      setOpen(false);
      setPassword('');
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void run('in');
  }

  const ready = !busy && email.includes('@') && password.length >= 6;

  if (sync.status === 'signed-out') {
    return (
      <div className="account section">
        {!open && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Trips are saved on this device only.</span>
            <button type="button" className="btn small" onClick={() => setOpen(true)}>Sign in to sync</button>
          </div>
        )}
        {open && (
          <form className="form" onSubmit={submit} noValidate>
            <label className="field" htmlFor="acct-email">
              <span className="label">Email</span>
              <input id="acct-email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field" htmlFor="acct-password">
              <span className="label">Password</span>
              <input id="acct-password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="hint">At least 6 characters.</span>
            </label>
            {message && <p className="hint" role="status">{message}</p>}
            <div className="row">
              <button type="submit" className="btn primary" disabled={!ready}>Sign in</button>
              <button type="button" className="btn" disabled={!ready} onClick={() => void run('up')}>Create account</button>
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const status =
    sync.status === 'syncing' ? 'Syncing…'
      : sync.status === 'synced' ? `Synced at ${sync.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : sync.message;
  return (
    <div className="account section">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span className="muted">{sync.email} · <span role="status">{status}</span></span>
        <div className="row">
          <button type="button" className="btn small" onClick={onSyncNow} disabled={sync.status === 'syncing'}>Sync now</button>
          <button type="button" className="btn small ghost" onClick={() => void supabase?.auth.signOut()}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
