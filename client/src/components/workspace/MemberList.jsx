import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Users, UserPlus, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useWorkspace } from '../../hooks/useWorkspace';

const MemberList = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const { members, currentWorkspace } = useSelector((state) => state.workspace);
  const { user } = useSelector((state) => state.auth);
  const { inviteUser } = useWorkspace();

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmails || !currentWorkspace?._id) return;

    const enteredEmails = `${inviteEmails || ''}`
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!enteredEmails.length) {
      setInviteError('Enter at least one valid email address.');
      return;
    }

    const memberEmailSet = new Set((members || []).map((item) => `${item?.user?.email || ''}`.trim().toLowerCase()));
    const alreadyInWorkspace = enteredEmails.filter((email) => memberEmailSet.has(email));

    if (alreadyInWorkspace.length === enteredEmails.length) {
      setInviteError('That email is already in this workspace. No new invite email was sent.');
      setInviteResults(alreadyInWorkspace.map((email) => ({ email, status: 'already-member' })));
      return;
    }

    try {
      setInviteLoading(true);
      setInviteError('');
      setInviteSuccess('');
      const invitePromise = inviteUser(currentWorkspace._id, inviteEmails.trim(), inviteRole);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject({ code: 'INVITE_TIMEOUT' }), 20000);
      });

      const result = await Promise.race([invitePromise, timeoutPromise]);
      setInviteResults(result?.results || []);

      const summary = result?.summary;
      const firstResult = result?.results?.[0];
      if (summary && summary.total > 1) {
        setInviteSuccess(result?.message || 'Bulk invite processed');
        if ((summary.emailFailedCount || 0) > 0) {
          setInviteError('Some emails could not be delivered. Check SMTP settings.');
        }
      } else if (firstResult?.status === 'already-member') {
        setInviteError(result?.message || 'User is already a member. No invite email was sent.');
      } else if (firstResult?.status === 'invited' || firstResult?.status === 'pending-registration') {
        setInviteSuccess(result?.message || 'Invitation processed successfully');
        if (!result?.emailSent) {
          setInviteError('Invite processed, but email could not be delivered. Check SMTP settings.');
        }
      } else if (result?.emailSent) {
        setInviteSuccess(result?.message || 'Invitation sent successfully');
      } else {
        const reasonHint = result?.emailReason === 'SMTP_NOT_CONFIGURED'
          ? ' Set SMTP_* values in server .env and restart backend.'
          : result?.emailReason === 'SMTP_AUTH_FAILED'
            ? ' Check SMTP_USER and SMTP_PASS (use Gmail App Password if using Gmail).'
            : '';
        setInviteError((result?.message || 'Invite email could not be sent.') + reasonHint);
      }

      setInviteEmails('');
    } catch (error) {
      if (error?.code === 'INVITE_TIMEOUT' || error?.code === 'ECONNABORTED') {
        setInviteError('Invite request timed out. Check if backend server and database are running, then try again.');
      } else if (!error?.response) {
        setInviteError('Cannot reach server. Make sure backend is running on port 5001.');
      } else {
        setInviteError(error.response?.data?.message || 'Failed to send invite');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-300';
      case 'admin': return 'bg-blue-500/20 text-blue-300';
      case 'member': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <>
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Users size={18} className="mr-2" /> Members ({members.length})
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setInviteError('');
              setInviteSuccess('');
              setInviteResults([]);
              setShowInviteModal(true);
            }}
          >
            <UserPlus size={16} className="mr-1" /> Invite
          </Button>
        </div>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.user._id} className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={member.user.avatar || `https://ui-avatars.com/api/?name=${member.user.name}`}
                  alt={member.user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="ml-3">
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-xs text-gray-400">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(member.role)}`}>
                  {member.role}
                </span>
                {(member.role !== 'owner' || user?._id === currentWorkspace?.owner) && (
                  <button className="ml-2 p-1 hover:bg-white/10 rounded">
                    <MoreVertical size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Member">
        <form onSubmit={handleInvite}>
          {inviteError && <p className="mb-3 text-sm text-red-400">{inviteError}</p>}
          {inviteSuccess && <p className="mb-3 text-sm text-green-400">{inviteSuccess}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email address(es)</label>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              required
              rows={4}
              placeholder="user1@gmail.com, user2@gmail.com\nuser3@gmail.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-gray-400">Use comma, semicolon, or new line to invite multiple users at once.</p>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {inviteResults.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
              <p className="mb-2 font-semibold text-gray-300">Invite Results</p>
              <div className="space-y-1">
                {inviteResults.map((item, index) => (
                  <div key={`${item.email}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate text-gray-300">{item.email}</span>
                    <span className={`shrink-0 rounded px-2 py-0.5 ${
                      item.status === 'invited' ? 'bg-green-500/20 text-green-300' :
                      item.status === 'pending-registration' ? 'bg-yellow-500/20 text-yellow-300' :
                      item.status === 'already-member' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteLoading || !inviteEmails.trim()}>
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default MemberList;