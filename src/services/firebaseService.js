import { db } from '../firebase';
import { 
  ref, 
  push, 
  set, 
  get, 
  update, 
  remove, 
  onValue 
} from 'firebase/database';

// ==========================================
// 1. WORKSPACES
// Path: /workspaces/{workspaceId}
// Index: /user_workspaces/{uid}/{workspaceId}
// ==========================================

export async function createWorkspace({ name, uid, email, displayName }) {
  if (!name || !uid) throw new Error('Workspace name and user ID are required');
  
  const wsRef = push(ref(db, 'workspaces'));
  const key = wsRef.key;
  
  const workspaceData = {
    id: key,
    _id: key,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    createdBy: uid,
    members: {
      [uid]: {
        uid,
        email: email || '',
        name: displayName || (email ? email.split('@')[0] : 'User'),
        role: 'Founder'
      }
    }
  };

  const savePromise = set(wsRef, workspaceData);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Database connection timed out (6s). Please check if Realtime Database is enabled in Firebase Console and rules allow write.")), 6000)
  );

  await Promise.race([savePromise, timeoutPromise]);

  // Index under user_workspaces for rapid lookup
  try {
    await set(ref(db, `user_workspaces/${uid}/${key}`), {
      workspaceId: key,
      name: name.trim(),
      joinedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not write user_workspaces index:', err);
  }

  return workspaceData;
}

export async function getUserWorkspaces(uid) {
  if (!uid) return [];
  const snapshot = await get(ref(db, 'workspaces'));
  if (!snapshot.exists()) return [];

  const all = snapshot.val();
  return Object.keys(all)
    .filter(key => all[key]?.members && all[key].members[uid])
    .map(key => ({
      _id: key,
      id: key,
      ...all[key],
      membersList: all[key].members ? Object.values(all[key].members) : []
    }));
}

export function subscribeToUserWorkspaces(uid, callback) {
  if (!uid) return () => {};
  const wsRef = ref(db, 'workspaces');
  return onValue(wsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const all = snapshot.val();
    const userWorkspaces = Object.keys(all)
      .filter(key => all[key]?.members && all[key].members[uid])
      .map(key => ({
        _id: key,
        id: key,
        ...all[key],
        membersList: all[key].members ? Object.values(all[key].members) : []
      }));
    callback(userWorkspaces);
  });
}

export async function getWorkspace(id) {
  if (!id) return null;
  const snapshot = await get(ref(db, `workspaces/${id}`));
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  return {
    _id: id,
    id,
    ...data,
    members: data.members ? Object.values(data.members) : []
  };
}

export async function deleteWorkspace(id) {
  if (!id) return;
  // Get members to clean index
  try {
    const wsSnap = await get(ref(db, `workspaces/${id}/members`));
    if (wsSnap.exists()) {
      const members = wsSnap.val();
      Object.keys(members).forEach(async (memberUid) => {
        await remove(ref(db, `user_workspaces/${memberUid}/${id}`)).catch(() => {});
      });
    }
  } catch (e) {}

  await remove(ref(db, `workspaces/${id}`));
}

export async function addWorkspaceMember(workspaceId, { uid, name, email, role }) {
  if (!workspaceId || !uid) return;
  const memberData = {
    uid,
    name: name || (email ? email.split('@')[0] : 'User'),
    email: email || '',
    role: role || 'Member'
  };
  await set(ref(db, `workspaces/${workspaceId}/members/${uid}`), memberData);
  await set(ref(db, `user_workspaces/${uid}/${workspaceId}`), {
    workspaceId,
    joinedAt: new Date().toISOString()
  }).catch(() => {});
}

export async function updateWorkspaceMemberRole(workspaceId, uid, role) {
  if (!workspaceId || !uid) return;
  await update(ref(db, `workspaces/${workspaceId}/members/${uid}`), { role });
}

export async function removeWorkspaceMember(workspaceId, uid) {
  if (!workspaceId || !uid) return;
  await remove(ref(db, `workspaces/${workspaceId}/members/${uid}`));
  await remove(ref(db, `user_workspaces/${uid}/${workspaceId}`)).catch(() => {});
}

// ==========================================
// 2. PROJECTS (Hierarchical per Workspace ONLY)
// Path: /workspaces/{workspaceId}/projects/{projectId}
// ==========================================

export async function createProject({ title, status, workspaceId, uid, email, displayName, category, dueDays, dueDate }) {
  if (!title || !workspaceId) throw new Error('Project title and workspace ID are required');

  const projRef = push(ref(db, `workspaces/${workspaceId}/projects`));
  const key = projRef.key;

  const projectData = {
    id: key,
    _id: key,
    title: title.trim(),
    status: status || 'Active',
    category: category || 'General',
    workspaceId,
    createdAt: new Date().toISOString(),
    dueDate: dueDate || new Date(Date.now() + parseInt(dueDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
    members: {
      [uid]: {
        uid,
        email: email || '',
        name: displayName || (email ? email.split('@')[0] : 'User'),
        role: 'Founder'
      }
    }
  };

  // Write strictly to workspace branch
  await set(projRef, projectData);
  return projectData;
}

export async function getProjects(workspaceId, uid) {
  if (!workspaceId) return [];
  const snapshot = await get(ref(db, `workspaces/${workspaceId}/projects`));
  if (snapshot.exists()) {
    const all = snapshot.val();
    return Object.keys(all)
      .filter(key => !uid || (all[key].members && all[key].members[uid]))
      .map(key => ({
        _id: key,
        id: key,
        ...all[key],
        membersList: all[key].members ? Object.values(all[key].members) : [],
        invitesList: all[key].invites ? Object.values(all[key].invites) : []
      }));
  }
  return [];
}

export function subscribeToProjects(workspaceId, uid, callback) {
  if (!workspaceId) return () => {};
  
  const projRef = ref(db, `workspaces/${workspaceId}/projects`);
  return onValue(projRef, (snapshot) => {
    if (snapshot.exists()) {
      const all = snapshot.val();
      const list = Object.keys(all)
        .filter(key => !uid || (all[key].members && all[key].members[uid]))
        .map(key => ({
          _id: key,
          id: key,
          ...all[key],
          membersList: all[key].members ? Object.values(all[key].members) : [],
          invitesList: all[key].invites ? Object.values(all[key].invites) : []
        }));
      callback(list);
    } else {
      callback([]);
    }
  });
}

export async function getProject(workspaceId, projectId) {
  const pId = projectId || workspaceId;
  const wId = projectId ? workspaceId : null;

  if (wId && pId) {
    const snap = await get(ref(db, `workspaces/${wId}/projects/${pId}`));
    if (snap.exists()) {
      const data = snap.val();
      return { 
        _id: pId, 
        id: pId, 
        workspaceId: wId,
        ...data, 
        members: data.members ? Object.values(data.members) : [],
        invites: data.invites ? Object.values(data.invites) : []
      };
    }
  }

  // Fallback: search all workspaces if workspaceId not provided
  const wsSnap = await get(ref(db, 'workspaces'));
  if (wsSnap.exists()) {
    const allWs = wsSnap.val();
    for (const wsKey of Object.keys(allWs)) {
      if (allWs[wsKey]?.projects && allWs[wsKey].projects[pId]) {
        const data = allWs[wsKey].projects[pId];
        return { 
          _id: pId, 
          id: pId, 
          workspaceId: wsKey,
          ...data, 
          members: data.members ? Object.values(data.members) : [],
          invites: data.invites ? Object.values(data.invites) : []
        };
      }
    }
  }
  return null;
}

export async function updateProject(workspaceId, projectId, updates) {
  if (!workspaceId || !projectId) return;
  await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}`), updates);
}

export async function deleteProject(workspaceId, projectId) {
  if (!workspaceId || !projectId) return;
  await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}`));
}

export async function addProjectMember(workspaceId, projectId, memberData) {
  let wId = workspaceId;
  let pId = projectId;
  let mData = memberData;
  if (!mData && typeof projectId === 'object') {
    mData = projectId;
    pId = workspaceId;
    wId = null;
  }
  if (!wId && pId) {
    const proj = await getProject(pId);
    if (proj) wId = proj.workspaceId;
  }
  if (!wId || !pId || !mData?.uid) return;

  const data = {
    uid: mData.uid,
    name: mData.name || (mData.email ? mData.email.split('@')[0] : 'User'),
    email: mData.email || '',
    role: mData.role || 'Member',
    joinedAt: mData.joinedAt || new Date().toISOString()
  };
  await set(ref(db, `workspaces/${wId}/projects/${pId}/members/${mData.uid}`), data);
}

export async function inviteProjectMember(workspaceId, projectId, { email, name, role, invitedBy }) {
  if (!workspaceId || !projectId || !email) throw new Error("workspaceId, projectId, and email are required to invite");

  const invitesRef = push(ref(db, `workspaces/${workspaceId}/projects/${projectId}/invites`));
  const inviteKey = invitesRef.key;

  const inviteData = {
    id: inviteKey,
    _id: inviteKey,
    email: email.trim().toLowerCase(),
    name: name?.trim() || email.split('@')[0],
    role: role || 'Member',
    invitedBy: invitedBy || 'Admin',
    invitedAt: new Date().toISOString(),
    status: 'Invited',
    projectId,
    workspaceId
  };

  await set(invitesRef, inviteData);

  // Also log activity in workspace
  await logActivity({
    user: invitedBy || 'Admin',
    action: 'invited',
    target: `${inviteData.name} (${inviteData.email}) to project`,
    workspaceId,
    projectId,
    type: 'invite'
  });

  return inviteData;
}

export async function acceptProjectInvite(workspaceId, projectId, user) {
  if (!workspaceId || !projectId || !user?.uid) return;

  const memberPayload = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: 'Member',
    joinedAt: new Date().toISOString()
  };

  // 1. Add to workspace
  await addWorkspaceMember(workspaceId, memberPayload);

  // 2. Add to project
  await addProjectMember(workspaceId, projectId, memberPayload);

  // 3. Mark invite as accepted if exists
  try {
    const invitesSnap = await get(ref(db, `workspaces/${workspaceId}/projects/${projectId}/invites`));
    if (invitesSnap.exists()) {
      const invites = invitesSnap.val();
      const userEmail = (user.email || '').toLowerCase();
      for (const [key, inv] of Object.entries(invites)) {
        if (inv.email === userEmail) {
          await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/invites/${key}`), {
            status: 'Accepted',
            acceptedAt: new Date().toISOString(),
            acceptedUid: user.uid
          });
        }
      }
    }
  } catch (e) {
    console.warn("Could not update invite status:", e);
  }

  // 4. Log activity
  await logActivity({
    user: memberPayload.name,
    action: 'joined project via invite link',
    target: 'Project',
    workspaceId,
    projectId,
    type: 'join'
  });

  return memberPayload;
}

export async function updateProjectMemberRole(workspaceId, projectId, uid, role) {
  if (!workspaceId || !projectId || !uid) return;
  await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`), { role });
}

export async function removeProjectMember(workspaceId, projectId, uid) {
  if (!workspaceId || !projectId || !uid) return;
  await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`));
}

// ==========================================
// 3. TASKS (Hierarchical per Project in Workspace ONLY)
// Path: /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}
// ==========================================

export async function createTask(workspaceId, projectId, taskData) {
  if (!workspaceId || !projectId) throw new Error('workspaceId and projectId are required to create a task');

  const baseRef = ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks`);
  const newTaskRef = push(baseRef);
  const key = newTaskRef.key;

  const fullTask = {
    ...taskData,
    id: key,
    _id: key,
    projectId,
    workspaceId,
    createdAt: taskData.createdAt || new Date().toISOString()
  };

  await set(newTaskRef, fullTask);
  return fullTask;
}

export async function updateTask(workspaceId, projectId, taskId, updates) {
  if (!workspaceId || !projectId || !taskId) return;
  await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`), updates);
}

export async function deleteTask(workspaceId, projectId, taskId) {
  if (!workspaceId || !projectId || !taskId) return;
  await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`));
}

export function subscribeToTasks(workspaceId, projectId, callback) {
  if (!workspaceId || !projectId) return () => {};

  const tasksRef = ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks`);
  return onValue(tasksRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(list);
    } else {
      callback([]);
    }
  });
}

// ==========================================
// 4. CHECKLIST (Hierarchical per Project in Workspace ONLY)
// Path: /workspaces/{workspaceId}/projects/{projectId}/checklist/{itemId}
// ==========================================

export async function createChecklistItem(workspaceId, projectId, itemData) {
  if (!workspaceId || !projectId) throw new Error('workspaceId and projectId are required');

  const path = `workspaces/${workspaceId}/projects/${projectId}/checklist`;
  const itemRef = push(ref(db, path));
  const key = itemRef.key;
  const fullItem = {
    ...itemData,
    id: key,
    _id: key,
    projectId,
    workspaceId,
    createdAt: new Date().toISOString()
  };

  await set(itemRef, fullItem);
  return fullItem;
}

export async function updateChecklistItem(workspaceId, projectId, itemId, updates) {
  if (!workspaceId || !projectId || !itemId) return;
  await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/checklist/${itemId}`), updates);
}

export async function deleteChecklistItem(workspaceId, projectId, itemId) {
  if (!workspaceId || !projectId || !itemId) return;
  await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/checklist/${itemId}`));
}

export function subscribeToChecklist(workspaceId, projectId, callback) {
  if (!workspaceId || !projectId) return () => {};

  const path = `workspaces/${workspaceId}/projects/${projectId}/checklist`;
  const listRef = ref(db, path);
  return onValue(listRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(list);
    } else {
      callback([]);
    }
  });
}

// ==========================================
// 5. ACTIVITY (Hierarchical per Workspace ONLY)
// Path: /workspaces/{workspaceId}/activity/{activityId}
// ==========================================

export async function logActivity(activityData) {
  const wsId = activityData.workspaceId;
  if (!wsId) return;

  const path = `workspaces/${wsId}/activity`;
  const actRef = push(ref(db, path));
  const key = actRef.key;
  const data = {
    ...activityData,
    id: key,
    _id: key,
    timestamp: activityData.timestamp || new Date().toISOString()
  };

  await set(actRef, data);
  return data;
}

export function subscribeToActivities(workspaceId, callback, limit = 50) {
  if (!workspaceId) return () => {};

  const wsActRef = ref(db, `workspaces/${workspaceId}/activity`);
  return onValue(wsActRef, (snapshot) => {
    if (snapshot.exists()) {
      const all = snapshot.val();
      const list = Object.keys(all).map(key => ({ _id: key, id: key, ...all[key] }));
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      callback(list.slice(0, limit));
    } else {
      callback([]);
    }
  });
}
