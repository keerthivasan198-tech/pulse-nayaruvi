require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    const dbUrl = process.env.FIREBASE_DATABASE_URL || '';
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
      console.log('✅ Connected to Firebase via serviceAccountKey.json');
    }
  } else {
    // If no service account, try default credentials or direct URL
    initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Connected to Firebase via default credentials / URL');
  }
} catch (err) {
  console.error('❌ Firebase Admin initialization error:', err);
  process.exit(1);
}

const db = getDatabase();

const app = express();
app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// =======================
// EMAIL CONFIG
// =======================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// =======================
// ROUTES
// =======================

// --- Invitations ---
app.post('/api/invite', async (req, res) => {
  try {
    const { email, name, role, workspaceId, projectId } = req.body;

    if (!email || !workspaceId || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let project = null;
    const projSnap = await db.ref(`workspaces/${workspaceId}/projects/${projectId}`).once('value');
    if (projSnap.exists()) {
      project = projSnap.val();
    } else {
      const legSnap = await db.ref(`projects/${projectId}`).once('value');
      if (legSnap.exists()) project = legSnap.val();
    }

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const inviteLink = `${process.env.FRONTEND_URL || 'https://pulse-nayaruvi.vercel.app'}/invite/${projectId}?workspaceId=${workspaceId}`;

    const mailOptions = {
      from: `"Nayaruvi Pulse" <${process.env.SMTP_USER || 'noreply@nayaruvi.com'}>`,
      to: email,
      subject: `You have been invited to join ${project.title} on Nayaruvi Pulse`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #274245; background-color: #FAF7EC; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <h2 style="color: #274245; margin-bottom: 20px;">Nayaruvi Pulse Invitation</h2>
          <p>Hello ${name},</p>
          <p>You have been formally invited to join the project <strong>"${project.title}"</strong> as a <strong>${role}</strong>.</p>
          <p>Click the button below to accept your invitation, sign in, and start collaborating with your team.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #274245; color: #DFD6AE; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
          </div>
          <p style="font-size: 12px; color: #5C6E6F;">If the button above does not work, copy and paste this link into your browser: <br/>${inviteLink}</p>
        </div>
      `
    };

    // Store invited member's details in project branch
    try {
      const inviteRef = db.ref(`workspaces/${workspaceId}/projects/${projectId}/invites`).push();
      await inviteRef.set({
        id: inviteRef.key,
        email: email.trim().toLowerCase(),
        name: name?.trim() || email.split('@')[0],
        role: role || 'Member',
        invitedAt: new Date().toISOString(),
        status: 'Invited',
        projectId,
        workspaceId
      });
    } catch (dbErr) {
      console.warn("Could not write invite to RTDB:", dbErr.message);
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Invite email sent to ${email}`);
    } else {
      console.warn(`⚠️ SMTP not configured! Mocking invite to ${email}. Link: ${inviteLink}`);
    }

    res.status(200).json({ success: true, message: 'Invitation sent' });
  } catch (err) {
    console.error('❌ Invite error:', err);
    res.status(500).json({ error: 'Failed to send invite email' });
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
      members: {
        [uid]: { uid, email: email || '', name: displayName || (email ? email.split('@')[0] : 'Unknown'), role: 'Founder' }
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
    
    const baseRef = db.ref(`workspaces/${workspaceId}/projects`).push();
    const key = baseRef.key;
    const projectData = {
      id: key,
      _id: key,
      title,
      status: status || 'Active',
      category: category || 'General',
      workspaceId,
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
app.listen(PORT, () => console.log(`🚀 Backend server running on port ${PORT} with Firebase RTDB`));
