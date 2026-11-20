require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const defaultDbUrl = 'https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app';
const dbUrl = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || defaultDbUrl;
let hasServiceAccount = false;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (serviceAccount.project_id && dbUrl && !dbUrl.includes(serviceAccount.project_id)) {
      console.warn(`⚠️ serviceAccountKey.json is for project "${serviceAccount.project_id}", but FIREBASE_DATABASE_URL is "${dbUrl}". Skipping mismatched serviceAccountKey.json.`);
      initializeApp({
        databaseURL: dbUrl
      });
      console.log('✅ Connected to Firebase via databaseURL');
    } else {
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: dbUrl
      });
      hasServiceAccount = true;
      console.log('✅ Connected to Firebase via serviceAccountKey.json');
    }
  } else {
    // If no service account, initialize with databaseURL
    initializeApp({
      databaseURL: dbUrl
    });
    console.log('ℹ️ Firebase Admin initialized with databaseURL (client handles RTDB updates)');
  }
} catch (err) {
  console.error('❌ Firebase Admin initialization error:', err);
  process.exit(1);
}

const db = getDatabase();

const app = express();
app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.get('/', (req, res) => res.json({ status: 'Nayaruvi Pulse Backend Running' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// =======================
// EMAIL CONFIG
// =======================
const createMailTransporter = () => {
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  if (!user || !rawPass) return null;

  const pass = rawPass.replace(/\s+/g, ''); // Strip any spaces from 16-character app password

  // Default to Gmail or custom host
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

// =======================
// ROUTES
// =======================

// --- Invitations ---
app.post('/api/invite', async (req, res) => {
  try {
    const { 
      email, 
      name, 
      role = 'Member', 
      workspaceId, 
      projectId, 
      origin, 
      inviterName = 'A team administrator',
      workspaceName,
      projectTitle: reqProjectTitle,
      inviteId
    } = req.body;

    if (!email || !workspaceId || !projectId) {
      return res.status(400).json({ error: 'Missing required fields (email, workspaceId, projectId)' });
    }

    let project = null;
    if (hasServiceAccount) {
      try {
        const projSnap = await db.ref(`workspaces/${workspaceId}/projects/${projectId}`).once('value');
        if (projSnap.exists()) {
          project = projSnap.val();
        } else {
          const legSnap = await db.ref(`projects/${projectId}`).once('value');
          if (legSnap.exists()) project = legSnap.val();
        }
      } catch (dbReadErr) {
        console.warn("Server RTDB read skipped:", dbReadErr.message);
      }
    }

    const title = project?.title || reqProjectTitle || 'Project';
    const clientOrigin = origin || req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${clientOrigin}/invite/${projectId}?workspaceId=${workspaceId}${inviteId ? `&inviteId=${inviteId}` : ''}`;

    const mailOptions = {
      from: `"Nayaruvi Pulse" <${process.env.SMTP_USER || 'noreply@nayaruvi.com'}>`,
      to: email.trim(),
      subject: `Invitation: Join "${title}" on Nayaruvi Pulse (${role})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #274245; background-color: #FAF7EC; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #DFD6AE;">
          <div style="border-bottom: 2px solid #274245; padding-bottom: 14px; margin-bottom: 20px;">
            <h1 style="color: #274245; margin: 0; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase;">Nayaruvi Pulse</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #5C6E6F;">Project Management & Team Workspace Platform</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.5; margin-bottom: 12px;">Hello <strong>${name || email.split('@')[0]}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 18px;">
            <strong>${inviterName}</strong> has invited you to join the project <strong>"${title}"</strong>${workspaceName ? ` in <strong>${workspaceName}</strong>` : ''} as a <strong>${role}</strong>.
          </p>

          <div style="background-color: #ffffff; border: 1px solid #DDD5CC; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Project:</strong> ${title}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Assigned Role:</strong> <span style="background-color: #274245; color: #DFD6AE; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${role}</span></p>
            <p style="margin: 0; font-size: 13px;"><strong>Invited By:</strong> ${inviterName}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 24px;">Click the button below to accept your invitation, sign in, and access your project board:</p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteLink}" style="background-color: #274245; color: #DFD6AE; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Accept Invitation & Join Project</a>
          </div>

          <hr style="border: none; border-top: 1px solid #DDD5CC; margin: 24px 0;" />
          <p style="font-size: 11px; color: #5C6E6F; line-height: 1.5;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${inviteLink}" style="color: #274245; word-break: break-all;">${inviteLink}</a></p>
        </div>
      `
    };

    // Store / update invited member's details in project branch if service account is available
    if (hasServiceAccount) {
      try {
        const targetInviteRef = inviteId 
          ? db.ref(`workspaces/${workspaceId}/projects/${projectId}/invites/${inviteId}`)
          : db.ref(`workspaces/${workspaceId}/projects/${projectId}/invites`).push();
        
        await targetInviteRef.update({
          id: targetInviteRef.key,
          email: email.trim().toLowerCase(),
          name: name?.trim() || email.split('@')[0],
          role: role || 'Member',
          invitedAt: new Date().toISOString(),
          status: 'Invited',
          projectId,
          workspaceId,
          invitedBy: inviterName
        });
      } catch (dbErr) {
        console.warn("Could not write invite to RTDB on server:", dbErr.message);
      }
    }

    // Attempt to dispatch email via Nodemailer
    let emailSent = false;
    let emailError = null;

    const transporter = createMailTransporter();
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`✅ Invite email sent to ${email}`);
      } catch (sendErr) {
        console.error(`❌ SMTP sendMail failed for ${email}:`, sendErr.message);
        emailError = sendErr.message;
      }
    } else {
      emailError = 'SMTP credentials not configured in backend/.env (set SMTP_USER & SMTP_PASS)';
      console.warn(`⚠️ SMTP not configured! Mock invite to ${email}. Link: ${inviteLink}`);
    }

    res.status(200).json({ 
      success: true, 
      emailSent,
      emailError,
      inviteLink,
      message: emailSent ? 'Invitation email sent successfully' : 'Invite stored in Firebase'
    });
  } catch (err) {
    console.error('❌ Invite error:', err);
    res.status(500).json({ error: 'Failed to process invitation: ' + err.message });
  }
});

// Test SMTP connection endpoint
app.get('/api/test-email', async (req, res) => {
  const transporter = createMailTransporter();
  if (!transporter) {
    return res.json({ 
      configured: false, 
      message: 'SMTP_USER or SMTP_PASS not set in backend/.env' 
    });
  }
  try {
    await transporter.verify();
    res.json({ configured: true, status: 'SMTP server is ready to send messages' });
  } catch (err) {
    res.json({ configured: false, error: err.message });
  }
});

// Helper for column name mapping
const getColumnLabel = (col) => {
  if (col === 'col-todo') return 'To Do';
  if (col === 'col-progress' || col === 'col-inprogress') return 'In Progress';
  if (col === 'col-review') return 'Review';
  if (col === 'col-completed') return 'Completed';
  return col || 'Updated';
};

// =======================
// NOTIFICATION ROUTES
// =======================

// 1. Task Assigned Notification
app.post('/api/notify/task-assigned', async (req, res) => {
  try {
    const { 
      taskContent, 
      assigneeEmail, 
      assigneeName, 
      assigneeId,
      assignedByName = 'A team member', 
      projectTitle = 'Project', 
      priority = 'Normal', 
      dueDate, 
      workspaceId, 
      projectId, 
      origin 
    } = req.body;

    if (!assigneeEmail || !taskContent) {
      return res.status(400).json({ error: 'assigneeEmail and taskContent are required' });
    }

    // Save In-App Mobile Notification to Firebase RTDB
    if (assigneeId) {
      try {
        await db.ref(`notifications/${assigneeId}`).push({
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `${assignedByName} assigned you: "${taskContent}" in ${projectTitle}`,
          taskContent,
          assignedByName,
          projectTitle,
          priority,
          dueDate: dueDate || '',
          workspaceId: workspaceId || '',
          projectId: projectId || '',
          read: false,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ In-app mobile message saved for user ${assigneeId}`);
      } catch (dbErr) {
        console.warn('⚠️ Could not write in-app notification:', dbErr.message);
      }

      // Send Outer-App Device System Notification via FCM
      try {
        const tokenSnap = await db.ref(`users/${assigneeId}/fcmToken`).get();
        if (tokenSnap.exists() && tokenSnap.val()) {
          const fcmToken = tokenSnap.val();
          await getMessaging().send({
            token: fcmToken,
            notification: {
              title: `📌 New Task Assigned: "${taskContent}"`,
              body: `${assignedByName} assigned you a task in "${projectTitle}"`
            },
            data: {
              taskContent,
              assignedByName,
              projectTitle,
              priority: priority || 'Normal',
              workspaceId: workspaceId || '',
              projectId: projectId || '',
              type: 'task_assigned'
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'pulse_tasks_channel',
                sound: 'default',
                priority: 'high',
                defaultVibrateTimings: true
              }
            }
          });
          console.log(`📱 Outer-app system push notification sent to user ${assigneeId}`);
        }
      } catch (fcmErr) {
        console.warn('⚠️ FCM push notification note:', fcmErr.message);
      }
    }

    const clientOrigin = origin || req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const taskLink = `${clientOrigin}/?ws=${workspaceId || ''}&proj=${projectId || ''}&tab=Tasks`;

    const transporter = createMailTransporter();
    if (!transporter) {
      return res.json({ success: true, emailSent: false, warning: 'SMTP not configured' });
    }

    const mailOptions = {
      from: `"Nayaruvi Pulse" <${process.env.SMTP_USER || 'nayaruvi.official@gmail.com'}>`,
      to: assigneeEmail.trim(),
      subject: `New Task Assigned: "${taskContent}" (${projectTitle})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #274245; background-color: #FAF7EC; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #DFD6AE;">
          <div style="border-bottom: 2px solid #274245; padding-bottom: 12px; margin-bottom: 20px;">
            <h1 style="color: #274245; margin: 0; font-size: 20px; text-transform: uppercase;">Nayaruvi Pulse</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #5C6E6F;">Task Assignment Notification</p>
          </div>

          <p style="font-size: 15px; margin-bottom: 12px;">Hello <strong>${assigneeName || assigneeEmail.split('@')[0]}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 18px;">
            <strong>${assignedByName}</strong> has assigned a new task to you in <strong>"${projectTitle}"</strong>:
          </p>

          <div style="background-color: #ffffff; border: 1px solid #DDD5CC; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #274245; margin: 0 0 10px 0; font-size: 16px;">📌 ${taskContent}</h3>
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Project:</strong> ${projectTitle}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Priority:</strong> <span style="background-color: #274245; color: #DFD6AE; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">${priority}</span></p>
            ${dueDate ? `<p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
            <p style="margin: 0; font-size: 13px;"><strong>Assigned By:</strong> ${assignedByName}</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${taskLink}" style="background-color: #274245; color: #DFD6AE; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">View Task on Board</a>
          </div>

          <hr style="border: none; border-top: 1px solid #DDD5CC; margin: 24px 0;" />
          <p style="font-size: 11px; color: #5C6E6F; line-height: 1.5;">Nayaruvi Pulse • Project Management & Team Collaboration</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Task assignment email sent to ${assigneeEmail}`);
    res.json({ success: true, emailSent: true, message: `Notification sent to ${assigneeEmail}` });
  } catch (err) {
    console.error('❌ Task assignment notification error:', err.message);
    res.json({ success: true, emailSent: false, error: err.message });
  }
});

// 2. Task Status Changed Notification
app.post('/api/notify/task-status', async (req, res) => {
  try {
    const { 
      taskContent, 
      previousStatus, 
      newStatus, 
      updatedByName = 'A team member', 
      creatorEmail, 
      creatorName, 
      projectTitle = 'Project', 
      workspaceId, 
      projectId, 
      origin 
    } = req.body;

    if (!creatorEmail || !taskContent) {
      return res.status(400).json({ error: 'creatorEmail and taskContent are required' });
    }

    const clientOrigin = origin || req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const taskLink = `${clientOrigin}/?ws=${workspaceId || ''}&proj=${projectId || ''}&tab=Tasks`;

    const oldLabel = getColumnLabel(previousStatus);
    const newLabel = getColumnLabel(newStatus);

    const transporter = createMailTransporter();
    if (!transporter) {
      return res.json({ success: true, emailSent: false, warning: 'SMTP not configured' });
    }

    const mailOptions = {
      from: `"Nayaruvi Pulse" <${process.env.SMTP_USER || 'nayaruvi.official@gmail.com'}>`,
      to: creatorEmail.trim(),
      subject: `Status Update: "${taskContent}" is now ${newLabel}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #274245; background-color: #FAF7EC; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #DFD6AE;">
          <div style="border-bottom: 2px solid #274245; padding-bottom: 12px; margin-bottom: 20px;">
            <h1 style="color: #274245; margin: 0; font-size: 20px; text-transform: uppercase;">Nayaruvi Pulse</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #5C6E6F;">Task Status Update</p>
          </div>

          <p style="font-size: 15px; margin-bottom: 12px;">Hello <strong>${creatorName || creatorEmail.split('@')[0]}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 18px;">
            A task you created/assigned in <strong>"${projectTitle}"</strong> has had its status updated:
          </p>

          <div style="background-color: #ffffff; border: 1px solid #DDD5CC; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #274245; margin: 0 0 12px 0; font-size: 16px;">📌 ${taskContent}</h3>
            <p style="margin: 0 0 8px 0; font-size: 13px;">
              <strong>Status:</strong> 
              <span style="text-decoration: line-through; color: #7D7268;">${oldLabel}</span> 
              &nbsp;&rarr;&nbsp; 
              <span style="background-color: #274245; color: #DFD6AE; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">${newLabel}</span>
            </p>
            <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Updated By:</strong> ${updatedByName}</p>
            <p style="margin: 0; font-size: 13px;"><strong>Project:</strong> ${projectTitle}</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${taskLink}" style="background-color: #274245; color: #DFD6AE; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Open Project Board</a>
          </div>

          <hr style="border: none; border-top: 1px solid #DDD5CC; margin: 24px 0;" />
          <p style="font-size: 11px; color: #5C6E6F; line-height: 1.5;">Nayaruvi Pulse • Real-Time Workspace Platform</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Task status email sent to ${creatorEmail}`);
    res.json({ success: true, emailSent: true, message: `Status update sent to ${creatorEmail}` });
  } catch (err) {
    console.error('❌ Task status notification error:', err.message);
    res.json({ success: true, emailSent: false, error: err.message });
  }
});

// 3. Team Announcement Notification
app.post('/api/notify/announcement', async (req, res) => {
  try {
    const { 
      announcement, 
      authorName = 'A team leader', 
      projectTitle, 
      workspaceName = 'Workspace', 
      recipients = [], 
      workspaceId, 
      projectId, 
      origin 
    } = req.body;

    if (!announcement || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'announcement and recipients are required' });
    }

    const clientOrigin = origin || req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${clientOrigin}/?ws=${workspaceId || ''}&proj=${projectId || ''}&tab=Activity`;
    const titleContext = projectTitle ? `${projectTitle} (${workspaceName})` : workspaceName;

    const transporter = createMailTransporter();
    if (!transporter) {
      return res.json({ success: true, emailSent: false, warning: 'SMTP not configured' });
    }

    // Filter valid emails
    const validEmails = recipients
      .map(e => (typeof e === 'string' ? e.trim() : e?.email?.trim()))
      .filter(e => e && e.includes('@'));

    if (validEmails.length === 0) {
      return res.json({ success: true, emailSent: false, message: 'No valid recipient email addresses found' });
    }

    const mailOptions = {
      from: `"Nayaruvi Pulse" <${process.env.SMTP_USER || 'nayaruvi.official@gmail.com'}>`,
      bcc: validEmails,
      subject: `📢 New Announcement: ${titleContext}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #274245; background-color: #FAF7EC; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #DFD6AE;">
          <div style="border-bottom: 2px solid #274245; padding-bottom: 12px; margin-bottom: 20px;">
            <h1 style="color: #274245; margin: 0; font-size: 20px; text-transform: uppercase;">Nayaruvi Pulse</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #5C6E6F;">Team Announcement</p>
          </div>

          <p style="font-size: 14px; margin-bottom: 12px;">
            <strong>${authorName}</strong> posted a new announcement for <strong>${titleContext}</strong>:
          </p>

          <div style="background-color: #ffffff; border-left: 4px solid #274245; border-radius: 6px; padding: 18px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #274245;">
            ${announcement.replace(/\n/g, '<br/>')}
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="background-color: #274245; color: #DFD6AE; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Open Announcement on Pulse</a>
          </div>

          <hr style="border: none; border-top: 1px solid #DDD5CC; margin: 24px 0;" />
          <p style="font-size: 11px; color: #5C6E6F; line-height: 1.5;">Delivered to members of ${titleContext} on Nayaruvi Pulse</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Announcement email sent to ${validEmails.length} recipients`);
    res.json({ success: true, emailSent: true, count: validEmails.length });
  } catch (err) {
    console.error('❌ Announcement notification error:', err.message);
    res.json({ success: true, emailSent: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/workspaces/ping', (req, res) => res.json({ status: 'awake' }));

// --- Workspaces ---

// Create Workspace
app.post('/api/workspaces', async (req, res) => {
  try {
    const { name, uid, email, displayName } = req.body;
    if (!name || !uid) {
      return res.status(400).json({ error: 'name and uid are required' });
    }
    
    const wsRef = db.ref('workspaces').push();
    const workspaceData = {
      name,
      createdAt: new Date().toISOString(),
      createdBy: uid,
      ownerId: uid,
      members: {
        [uid]: { uid, email: email || '', name: displayName || (email ? email.split('@')[0] : 'Unknown'), role: 'Owner' }
      }
    };
    await wsRef.set(workspaceData);
    await db.ref(`user_workspaces/${uid}/${wsRef.key}`).set({
      workspaceId: wsRef.key,
      name,
      joinedAt: new Date().toISOString()
    }).catch(() => {});

    console.log('✅ Workspace created:', wsRef.key);
    res.status(201).json({ _id: wsRef.key, id: wsRef.key, ...workspaceData });
  } catch (err) {
    console.error('❌ Create workspace error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get User's Workspaces
app.get('/api/workspaces/:uid', async (req, res) => {
  try {
    const wsSnap = await db.ref('workspaces').once('value');
    if (!wsSnap.exists()) return res.json([]);
    const allWs = wsSnap.val();
    const userWs = Object.keys(allWs)
      .filter(key => allWs[key].members && allWs[key].members[req.params.uid])
      .map(key => ({ _id: key, id: key, ...allWs[key] }));
    res.json(userWs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Workspace by ID
app.get('/api/workspace/:id', async (req, res) => {
  try {
    const wsSnap = await db.ref(`workspaces/${req.params.id}`).once('value');
    if (!wsSnap.exists()) return res.status(404).json({ error: 'Not found' });
    
    const data = wsSnap.val();
    data.members = data.members ? Object.values(data.members) : [];
    res.json({ _id: wsSnap.key, id: wsSnap.key, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Workspace
app.delete('/api/workspaces/:id', async (req, res) => {
  try {
    await db.ref(`workspaces/${req.params.id}`).remove();
    // Also delete associated top-level projects if any
    const projSnap = await db.ref('projects').once('value');
    if (projSnap.exists()) {
      const allProj = projSnap.val();
      Object.keys(allProj).forEach(async (key) => {
        if (allProj[key].workspaceId === req.params.id) {
          await db.ref(`projects/${key}`).remove();
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to workspace
app.post('/api/workspaces/:id/members', async (req, res) => {
  try {
    const { uid, name, email, role } = req.body;
    await db.ref(`workspaces/${req.params.id}/members/${uid}`).set({
      uid, name, email, role: role || 'Member'
    });
    await db.ref(`user_workspaces/${uid}/${req.params.id}`).set({
      workspaceId: req.params.id,
      joinedAt: new Date().toISOString()
    }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update workspace member role
app.put('/api/workspaces/:id/members/:uid', async (req, res) => {
  try {
    await db.ref(`workspaces/${req.params.id}/members/${req.params.uid}`).update({
      role: req.body.role
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Projects ---

// Create Project
app.post('/api/projects', async (req, res) => {
  try {
    const { title, status, workspaceId, uid, email, displayName, category, dueDays, dueDate } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    // Check if user is the Workspace Owner
    const wsSnap = await db.ref(`workspaces/${workspaceId}`).once('value');
    if (!wsSnap.exists()) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const ws = wsSnap.val();
    const isOwner = ws.ownerId === uid || ws.createdBy === uid || ws.members?.[uid]?.role === 'Owner' || ws.members?.[uid]?.role === 'Founder';
    if (!isOwner) {
      return res.status(403).json({ error: 'Permission denied: Only the workspace owner can create projects in this workspace.' });
    }
    
    const baseRef = db.ref(`workspaces/${workspaceId}/projects`).push();
    const key = baseRef.key;
    const projectData = {
      id: key,
      _id: key,
      title,
      status: status || 'Active',
      category: category || 'General',
      workspaceId,
      createdBy: uid,
      ownerId: uid,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + parseInt(dueDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
      members: {
        [uid]: { uid, email: email || '', name: displayName || (email ? email.split('@')[0] : 'Unknown'), role: 'Founder' }
      }
    };
    
    await baseRef.set(projectData);
    res.status(201).json(projectData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Projects for Workspace restricted to User
app.get('/api/projects/workspace/:workspaceId/user/:uid', async (req, res) => {
  try {
    const wsProjSnap = await db.ref(`workspaces/${req.params.workspaceId}/projects`).once('value');
    if (wsProjSnap.exists()) {
      const allProj = wsProjSnap.val();
      const userProj = Object.keys(allProj)
        .filter(key => allProj[key].members && allProj[key].members[req.params.uid])
        .map(key => ({ _id: key, id: key, ...allProj[key] }));
      return res.json(userProj);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const wsSnap = await db.ref('workspaces').once('value');
    if (wsSnap.exists()) {
      const allWs = wsSnap.val();
      for (const wId of Object.keys(allWs)) {
        if (allWs[wId].projects && allWs[wId].projects[req.params.id]) {
          const pData = allWs[wId].projects[req.params.id];
          pData.members = pData.members ? Object.values(pData.members) : [];
          return res.json({ _id: req.params.id, id: req.params.id, ...pData });
        }
      }
    }
    res.status(404).json({ error: 'Project not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const wsSnap = await db.ref('workspaces').once('value');
    if (wsSnap.exists()) {
      const allWs = wsSnap.val();
      for (const wId of Object.keys(allWs)) {
        if (allWs[wId].projects && allWs[wId].projects[req.params.id]) {
          await db.ref(`workspaces/${wId}/projects/${req.params.id}`).remove();
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project member role
app.put('/api/projects/:id/members/:uid', async (req, res) => {
  try {
    const { role, workspaceId } = req.body;
    if (workspaceId) {
      await db.ref(`workspaces/${workspaceId}/projects/${req.params.id}/members/${req.params.uid}`).update({ role });
      return res.json({ success: true });
    }
    const wsSnap = await db.ref('workspaces').once('value');
    if (wsSnap.exists()) {
      const allWs = wsSnap.val();
      for (const wId of Object.keys(allWs)) {
        if (allWs[wId].projects && allWs[wId].projects[req.params.id]) {
          await db.ref(`workspaces/${wId}/projects/${req.params.id}/members/${req.params.uid}`).update({ role });
          return res.json({ success: true });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to project
app.post('/api/projects/:id/members', async (req, res) => {
  try {
    const { uid, name, email, role, workspaceId } = req.body;
    const memberData = { uid, name, email, role: role || 'Member' };
    if (workspaceId) {
      await db.ref(`workspaces/${workspaceId}/projects/${req.params.id}/members/${uid}`).set(memberData);
      return res.json({ success: true });
    }
    const wsSnap = await db.ref('workspaces').once('value');
    if (wsSnap.exists()) {
      const allWs = wsSnap.val();
      for (const wId of Object.keys(allWs)) {
        if (allWs[wId].projects && allWs[wId].projects[req.params.id]) {
          await db.ref(`workspaces/${wId}/projects/${req.params.id}/members/${uid}`).set(memberData);
          return res.json({ success: true });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Activity ---
app.post('/api/activity', async (req, res) => {
  try {
    const wsId = req.body.workspaceId;
    if (!wsId) return res.status(400).json({ error: 'workspaceId is required' });
    const pathRef = db.ref(`workspaces/${wsId}/activity`).push();
    const data = { ...req.body, timestamp: req.body.timestamp || new Date().toISOString() };
    await pathRef.set(data);
    res.status(201).json({ _id: pathRef.key, id: pathRef.key, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activity/:workspaceId', async (req, res) => {
  try {
    const wsSnap = await db.ref(`workspaces/${req.params.workspaceId}/activity`).once('value');
    if (wsSnap.exists()) {
      const allAct = wsSnap.val();
      const list = Object.keys(allAct).map(key => ({ _id: key, id: key, ...allAct[key] }));
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return res.json(list.slice(0, 50));
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Backend server running on port ${PORT} with Firebase RTDB`));
}

module.exports = app;
