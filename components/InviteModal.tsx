import React, { useEffect, useState } from 'react';
import { Team, RetroSession } from '../types';
import { dataService } from '../services/dataService';

interface Props {
  team: Team;
  activeSession?: RetroSession;
  onClose: () => void;
  onLogout?: () => void;
}

const InviteModal: React.FC<Props> = ({ team, activeSession, onClose, onLogout }) => {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | null>(null);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpRequireTLS, setSmtpRequireTLS] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'fail'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Encode essential team data for invitation (id, name, password)
  // Also include active session data if available
  const inviteData: {
    id: string;
    name: string;
    password: string;
    sessionId?: string;
  } = {
    id: team.id,
    name: team.name,
    password: team.passwordHash,
    sessionId: activeSession?.id,
  };

  const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(inviteData))));
  const link = `${window.location.origin}?join=${encodedData}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;

  useEffect(() => {
    // Check if the server has SMTP configured so we can guide the facilitator
    fetch('/api/email-config')
      .then((res) => res.json())
      .then((cfg) => {
        setEmailEnabled(!!cfg?.enabled);
        setSmtpHost(cfg?.host || '');
        setSmtpPort(cfg?.port ?? null);
        setSmtpSecure(!!cfg?.secure);
        setSmtpRequireTLS(!!cfg?.requireTLS);
      })
      .catch(() => setEmailEnabled(false));
  }, []);

  const buildTimeoutHint = (code?: string) => {
    if (code && code.includes('ETIMEDOUT')) {
      const hostPort = [smtpHost || 'SMTP host', smtpPort || '587'].join(':');
      return ` — ${hostPort} inaccessible depuis Railway. Essayez le port 587 avec STARTTLS (SMTP_SECURE=false, SMTP_REQUIRE_TLS=true si nécessaire) ou un provider accessible depuis Railway (ex: Mailtrap, Brevo) ou le gateway SMTP Resend sur Railway.`;
    }
    return '';
  };

  const handlePersonalInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeEmail.trim()) return;

    try {
      setStatus('sending');
      setStatusMessage('Sending email invite…');
      const { inviteLink } = dataService.createMemberInvite(team.id, inviteeName.trim(), inviteeEmail.trim(), activeSession?.id);
      setGeneratedLink(inviteLink);

      try {
        const res = await fetch('/api/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteeEmail.trim(),
            name: inviteeName.trim() || inviteeEmail.trim(),
            link: inviteLink,
            teamName: team.name,
            sessionName: activeSession?.name,
          })
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = body?.message || body?.error || 'Email service not configured';
          const code = body?.code ? ` (${body.code})` : '';
          const hint = buildTimeoutHint(body?.code || body?.message);
          throw new Error(`${detail}${code}${hint}`);
        }

        setStatus('sent');
        setStatusMessage('Invitation sent by email.');
      } catch (err: any) {
        setStatus('error');
        setStatusMessage(err?.message || 'Unable to send email. Copy the link instead.');
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to generate invite');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
            <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Join {team.name}</h3>
        <p className="text-slate-500 text-sm text-center mb-6">Scan to join this team instantly.</p>

        <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-inner">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
            </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between mb-4">
            <code className="text-xs text-slate-600 truncate mr-2">{link}</code>
            <button
                onClick={() => navigator.clipboard.writeText(link)}
                className="text-retro-primary font-bold text-xs hover:underline"
            >
                COPY
            </button>
        </div>

        <form onSubmit={handlePersonalInvite} className="mb-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Invite by email</p>
              <p className="text-xs text-slate-500">Send a unique link tied to an email.</p>
              {emailEnabled === false && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1">
                  Email service not configured. Add SMTP env vars in Railway to enable sending.
                </p>
              )}
            </div>
            {status !== 'idle' && (
              <span className={`text-xs font-bold ${status === 'sent' ? 'text-emerald-600' : status === 'sending' ? 'text-slate-500' : 'text-amber-600'}`}>
                {statusMessage}
              </span>
            )}
          </div>
          {emailEnabled && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={async () => {
                  setTestStatus('running');
                  setTestMessage('Testing SMTP connectivity…');
                  try {
                    const res = await fetch('/api/email-test', { method: 'POST' });
                  const body = await res.json();
                  if (!res.ok || !body?.ok) {
                    const detail = body?.message || 'Connection failed';
                    const code = body?.code ? ` (${body.code})` : '';
                    const hint = buildTimeoutHint(body?.code || body?.message);
                    throw new Error(`${detail}${code}${hint}`);
                  }
                  setTestStatus('success');
                  setTestMessage('SMTP reachable. You can send invites.');
                } catch (err: any) {
                  setTestStatus('fail');
                  setTestMessage(err?.message || 'SMTP verification failed');
                }
              }}
                className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold hover:bg-slate-200"
                disabled={testStatus === 'running'}
              >
                {testStatus === 'running' ? 'Testing…' : 'Test SMTP now'}
              </button>
              {testStatus !== 'idle' && (
                <span className={`font-semibold ${testStatus === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {testMessage}
                </span>
              )}
              <span className="text-[10px] text-slate-400">
                Host: {smtpHost || 'n/a'}:{smtpPort || 587} · Mode: {smtpSecure ? 'TLS' : smtpRequireTLS ? 'STARTTLS' : 'Plain/STARTTLS optional'}
              </span>
            </div>
          )}
          <input
            type="text"
            placeholder="Name (optional)"
            value={inviteeName}
            onChange={(e) => setInviteeName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900"
          />
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@example.com"
              required
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
              disabled={!inviteeEmail.trim() || status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>

        {emailEnabled === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-[11px] text-amber-800 leading-relaxed">
            <div className="font-bold text-xs mb-1">How to enable email on Railway</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>In Railway, open the project service for this app and go to <strong>Variables</strong>.</li>
              <li>Add <code>SMTP_HOST</code> (e.g. your provider hostname{smtpHost ? `, current value: ${smtpHost}` : ''}).</li>
              <li>Add <code>SMTP_PORT</code> (usually 587), <code>SMTP_USER</code>, <code>SMTP_PASS</code>, and optional <code>SMTP_SECURE=true</code> for TLS.</li>
              <li>Avoid ports 25/465 that are souvent bloqués en sortie sur Railway ; privilégiez le port 587 avec STARTTLS ou 2525 chez certains providers (Mailtrap).</li>
              <li>Si votre provider est bloqué en egress, déployez le template <a className="underline" href="https://railway.com/deploy/resend-railway-smtp-gateway" target="_blank" rel="noreferrer">Resend Railway SMTP Gateway</a> et copiez les credentials générés vers ces variables.</li>
              <li>Set <code>FROM_EMAIL</code> if it differs from the SMTP user.</li>
              <li>Redeploy; the banner will disappear when SMTP is detected.</li>
            </ol>
          </div>
        )}

        {generatedLink && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-700">
            <div className="font-bold mb-1">Personal invite link</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs truncate flex-1">{generatedLink}</code>
              <button
                onClick={() => navigator.clipboard.writeText(generatedLink)}
                className="text-emerald-700 font-bold text-xs hover:underline"
              >
                COPY
              </button>
            </div>
          </div>
        )}

        {onLogout && (
            <div className="mb-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 mb-2">Want to test as another user?</p>
                <button
                    onClick={onLogout}
                    className="text-indigo-600 text-sm font-bold hover:underline"
                >
                    Logout & Create New User
                </button>
            </div>
        )}

        <button onClick={onClose} className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold">Done</button>
      </div>
    </div>
  );
};

export default InviteModal;