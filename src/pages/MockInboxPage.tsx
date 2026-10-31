import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Mail,
  MailOpen,
  Trash2,
  X,
} from 'lucide-react';
import { EmailMessage } from '../types';
import { mockEmailsRepo, subscribeToDatabase } from '../lib/db';
import { formatDateTime } from '../lib/formatters';
import { useToast } from '../context/ToastContext';

interface MockInboxPageProps {
  onNavigateToReset?: (token: string) => void;
}

export const MockInboxPage: React.FC<MockInboxPageProps> = ({ onNavigateToReset }) => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState(() => mockEmailsRepo.getAll());
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

  React.useEffect(() => {
    return subscribeToDatabase(() => {
      setEmails(mockEmailsRepo.getAll());
    });
  }, []);

  const handleOpenEmail = (msg: EmailMessage) => {
    mockEmailsRepo.markAsRead(msg.id);
    setSelectedEmail(msg);
  };

  const handleClearInbox = () => {
    mockEmailsRepo.clearAll();
    setSelectedEmail(null);
    showToast('info', 'Inbox Cleared', 'All mock email messages removed.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Simulated Mock Inbox</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulates outgoing SMTP emails: password resets (with 30-minute tokens), invoice dispatch, and payment receipts.
          </p>
        </div>

        {emails.length > 0 && (
          <button
            onClick={handleClearInbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Inbox</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email Messages List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Messages ({emails.length})
            </span>
            <span className="text-[11px] text-slate-400">Auto-captured</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span>Inbox is empty. Trigger a password reset, invoice send, or payment receipt to populate.</span>
              </div>
            ) : (
              emails.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenEmail(msg)}
                  className={`p-4 cursor-pointer transition-colors text-xs ${
                    selectedEmail?.id === msg.id
                      ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                      : !msg.read
                      ? 'bg-white hover:bg-slate-50 font-semibold text-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate max-w-[200px]">
                      {msg.toName} &lt;{msg.toEmail}&gt;
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formatDateTime(msg.sentAt)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 truncate mb-1">
                    {msg.subject}
                  </p>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>

                  {msg.type === 'password_reset' && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      <span>Password Reset Token</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Reading Pane */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-[450px]">
          {selectedEmail ? (
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600">
                      {selectedEmail.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(selectedEmail.sentAt)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedEmail.subject}</h2>

                  <div className="mt-3 text-xs text-slate-600">
                    <p>
                      <strong>To:</strong> {selectedEmail.toName} &lt;{selectedEmail.toEmail}&gt;
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      <strong>From:</strong> Brightloop Notifications &lt;no-reply@brightloop.com&gt;
                    </p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-6 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedEmail.content}
                </div>

                {/* Password Reset Action Button if token present */}
                {selectedEmail.resetToken && onNavigateToReset && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mt-4">
                    <h4 className="font-bold text-indigo-900 text-xs mb-1">
                      One-Click Security Action
                    </h4>
                    <p className="text-[11px] text-indigo-700 mb-3">
                      Token expires in 30 minutes from issuance.
                    </p>
                    <button
                      onClick={() => onNavigateToReset(selectedEmail.resetToken!)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Proceed to Reset Password Page</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                Message ID: <span className="font-mono">{selectedEmail.id}</span> · Simulated Delivery
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
              <MailOpen className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
              <span>Select an email from the left pane to preview details and token actions.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
