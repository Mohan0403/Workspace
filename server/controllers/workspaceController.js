import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import slugify from 'slugify';
import { sendInviteEmail } from '../utils/sendInviteEmail.js';

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer'];

// @desc    Create a new workspace
// @route   POST /api/workspaces
export const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }
    
    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();
    
    const workspace = await Workspace.create({
      name,
      slug,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
      modules: [
        { moduleType: 'kanban', position: 0 },
        { moduleType: 'notes', position: 1 },
        { moduleType: 'files', position: 2 },
        { moduleType: 'chat', position: 3 },
        { moduleType: 'timeline', position: 4 }
      ]
    });

    // Add workspace to user's workspaces
    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: { workspace: workspace._id, role: 'owner' } }
    });

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      user: req.user._id,
      action: 'created workspace',
      target: workspace.name,
      module: 'workspace'
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all workspaces for current user
// @route   GET /api/workspaces
export const getUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id
    }).populate('members.user', 'name email avatar');
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single workspace by ID
// @route   GET /api/workspaces/:workspaceId
export const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate('members.user', 'name email avatar status lastSeen')
      .populate('owner', 'name email avatar');
    
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    // Check if user is member
    const isMember = workspace.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member of this workspace' });

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:workspaceId
export const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Check role (owner or admin)
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, settings } = req.body;
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (settings) workspace.settings = { ...workspace.settings, ...settings };

    await workspace.save();
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:workspaceId
export const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Only owner can delete
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can delete workspace' });
    }

    // Remove workspace from all members' workspaces array
    await User.updateMany(
      { 'workspaces.workspace': workspace._id },
      { $pull: { workspaces: { workspace: workspace._id } } }
    );

    await workspace.deleteOne();
    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invite member to workspace
// @route   POST /api/workspaces/:workspaceId/invite
export const inviteMember = async (req, res) => {
  try {
    const { email, emails, role = 'member' } = req.body;

    const emailList = [
      ...(Array.isArray(emails) ? emails : []),
      ...(email ? [email] : []),
    ]
      .map((value) => `${value || ''}`.trim().toLowerCase())
      .filter(Boolean);

    const uniqueEmails = [...new Set(emailList)];

    if (!uniqueEmails.length) {
      return res.status(400).json({ message: 'At least one email is required' });
    }

    if (!VALID_ROLES.includes(role) || role === 'owner') {
      return res.status(400).json({ message: 'Invalid role for invite' });
    }

    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Check if current user has permission to invite (owner or admin)
    const currentMember = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ message: 'Not authorized to invite' });
    }

    const results = [];

    for (const targetEmail of uniqueEmails) {
      const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const userToInvite = await User.findOne({ email: { $regex: `^${escapedEmail}$`, $options: 'i' } });

      if (!userToInvite) {
        const emailResult = await sendInviteEmail({
          to: targetEmail,
          inviteeName: null,
          inviterName: req.user.name,
          workspaceName: workspace.name,
          workspaceId: workspace._id,
          role,
        });

        await Activity.create({
          workspace: workspace._id,
          user: req.user._id,
          action: 'sent invite email',
          target: targetEmail,
          module: 'workspace',
          metadata: { invitedRole: role, pendingRegistration: true, emailSent: emailResult.emailSent },
        });

        results.push({
          email: targetEmail,
          status: emailResult.emailSent ? 'pending-registration' : 'email-failed',
          emailSent: emailResult.emailSent,
          emailReason: emailResult.reason || null,
        });
        continue;
      }

      const alreadyMember = workspace.members.some((member) => member.user.toString() === userToInvite._id.toString());
      if (alreadyMember) {
        results.push({
          email: targetEmail,
          status: 'already-member',
          emailSent: false,
          emailReason: null,
        });
        continue;
      }

      workspace.members.push({ user: userToInvite._id, role });
      await workspace.save();

      const hasWorkspaceEntry = userToInvite.workspaces.some((item) => item.workspace.toString() === workspace._id.toString());
      if (!hasWorkspaceEntry) {
        userToInvite.workspaces.push({ workspace: workspace._id, role });
        await userToInvite.save();
      }

      await Activity.create({
        workspace: workspace._id,
        user: req.user._id,
        action: `invited ${userToInvite.name}`,
        target: userToInvite.email,
        module: 'workspace',
        metadata: { invitedRole: role },
      });

      await Activity.create({
        workspace: workspace._id,
        user: userToInvite._id,
        action: 'joined workspace',
        target: workspace.name,
        module: 'workspace',
      });

      const emailResult = await sendInviteEmail({
        to: userToInvite.email,
        inviteeName: userToInvite.name,
        inviterName: req.user.name,
        workspaceName: workspace.name,
        workspaceId: workspace._id,
        role,
      });

      results.push({
        email: targetEmail,
        status: 'invited',
        emailSent: emailResult.emailSent,
        emailReason: emailResult.reason || null,
      });
    }

    const summary = {
      total: results.length,
      invitedCount: results.filter((item) => item.status === 'invited').length,
      pendingRegistrationCount: results.filter((item) => item.status === 'pending-registration').length,
      alreadyMemberCount: results.filter((item) => item.status === 'already-member').length,
      emailFailedCount: results.filter((item) => item.status !== 'already-member' && !item.emailSent).length,
      emailSentCount: results.filter((item) => item.emailSent).length,
    };

    const message = summary.total === 1
      ? results[0].status === 'already-member'
        ? 'User is already a member'
        : results[0].status === 'invited'
          ? (results[0].emailSent ? 'User invited successfully and email sent' : 'User invited successfully, but invite email was not sent')
          : (results[0].emailSent ? 'Invite email sent. User can register and then be added to the workspace.' : 'Invite could not be emailed right now. Configure SMTP settings and try again.')
      : `Processed ${summary.total} invites: ${summary.invitedCount} invited, ${summary.pendingRegistrationCount} pending registration, ${summary.alreadyMemberCount} already members, ${summary.emailFailedCount} email failures.`;

    const isSingle = summary.total === 1;
    const first = results[0];

    res.json({
      message,
      results,
      summary,
      emailSent: isSingle ? first.emailSent : summary.emailSentCount > 0,
      emailReason: isSingle ? first.emailReason : null,
      pendingRegistration: isSingle ? first.status === 'pending-registration' : summary.pendingRegistrationCount > 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update member role
// @route   PUT /api/workspaces/:workspaceId/members/:userId
export const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Only owner or admin can change roles (owner cannot be changed except by owner)
    const currentMember = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ message: 'Member not found' });

    // Prevent changing owner's role if current user is not the owner
    if (workspace.members[memberIndex].role === 'owner' && currentMember.role !== 'owner') {
      return res.status(403).json({ message: 'Only owner can change owner role' });
    }

    // Only owner can assign owner role
    if (role === 'owner' && currentMember.role !== 'owner') {
      return res.status(403).json({ message: 'Only owner can assign owner role' });
    }

    const previousRole = workspace.members[memberIndex].role;

    workspace.members[memberIndex].role = role;
    await workspace.save();

    // Update user's workspaces entry
    await User.updateOne(
      { _id: req.params.userId, 'workspaces.workspace': workspace._id },
      { $set: { 'workspaces.$.role': role } }
    );

    await Activity.create({
      workspace: workspace._id,
      user: req.user._id,
      action: 'changed member role',
      target: req.params.userId,
      module: 'workspace',
      metadata: { previousRole, nextRole: role }
    });

    res.json(workspace.members[memberIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from workspace
// @route   DELETE /api/workspaces/:workspaceId/members/:userId
export const removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Only owner or admin can remove (except owner cannot be removed)
    const currentMember = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const memberToRemove = workspace.members.find(m => m.user.toString() === req.params.userId);
    if (!memberToRemove) return res.status(404).json({ message: 'Member not found' });

    // Prevent removing owner
    if (memberToRemove.role === 'owner') {
      return res.status(403).json({ message: 'Cannot remove owner' });
    }

    // Remove from workspace members
    workspace.members = workspace.members.filter(m => m.user.toString() !== req.params.userId);
    await workspace.save();

    // Remove workspace from user's workspaces
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { workspaces: { workspace: workspace._id } }
    });

    await Activity.create({
      workspace: workspace._id,
      user: req.user._id,
      action: 'removed member',
      target: req.params.userId,
      module: 'workspace'
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};