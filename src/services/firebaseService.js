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
  const safeName = name.trim();
  const safeEmail = email || '';
  const safeDisplayName = displayName || (safeEmail ? safeEmail.split('@')[0] : 'User');
  
  const workspaceData = {
    id: key,
    _id: key,
    name: safeName,
    createdAt: new Date().toISOString(),
    createdBy: uid,
    members: {
      [uid]: {
        uid,
        email: safeEmail,
        name: safeDisplayName,
        role: 'Founder'
      }
    }
  };

  // Save workspace directly
  await set(wsRef, workspaceData);

  // Index under user_workspaces for rapid lookup
  try {
    await set(ref(db, `user_workspaces/${uid}/${key}`), {
      workspaceId: key,
      name: safeName,
      joinedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not write user_workspaces index:', err);
  }

  return workspaceData;
}

export async function getUserWorkspaces(uid) {
  if (!uid) return [];
  // 1. Try reading directly from /workspaces
  try {
    const snapshot = await get(ref(db, 'workspaces'));
    if (snapshot.exists()) {
      const all = snapshot.val();
      const list = Object.keys(all)
        .filter(key => all[key]?.members && all[key].members[uid])
        .map(key => ({
          _id: key,
          id: key,
          ...all[key],
          membersList: all[key].members ? Object.values(all[key].members) : []
        }));
      if (list.length > 0) return list;
    }
  } catch (err) {
    console.warn('Direct workspaces read failed, falling back to user index:', err);
  }

  // 2. Fallback to /user_workspaces/{uid}
  try {
    const indexSnap = await get(ref(db, `user_workspaces/${uid}`));
    if (indexSnap.exists()) {
      const indexData = indexSnap.val();
      const wsIds = Object.keys(indexData);
      const promises = wsIds.map(async (wsId) => {
        const snap = await get(ref(db, `workspaces/${wsId}`));
        if (snap.exists()) {
          const val = snap.val();
          return {
            _id: wsId,
            id: wsId,
            ...val,
            membersList: val.members ? Object.values(val.members) : []
          };
        }
        return null;
      });
      return (await Promise.all(promises)).filter(Boolean);
    }
  } catch (err) {
    console.error('Error fetching user_workspaces index:', err);
  }

  return [];
}

export function subscribeToUserWorkspaces(uid, callback) {
  if (!uid) return () => {};

  let isSubscribed = true;

  // Function to load workspaces from index
  const loadFromIndex = async () => {
    try {
      const indexSnap = await get(ref(db, `user_workspaces/${uid}`));
      if (indexSnap.exists() && isSubscribed) {
        const indexData = indexSnap.val();
        const wsIds = Object.keys(indexData);
        const promises = wsIds.map(async (wsId) => {
          const snap = await get(ref(db, `workspaces/${wsId}`));
          if (snap.exists()) {
            const val = snap.val();
            return {
              _id: wsId,
              id: wsId,
              ...val,
              membersList: val.members ? Object.values(val.members) : []
            };
          }
          return null;
        });
        const list = (await Promise.all(promises)).filter(Boolean);
        if (isSubscribed) callback(list);
      } else if (isSubscribed) {
        callback([]);
      }
    } catch (e) {
      if (isSubscribed) callback([]);
    }
  };

  const wsRef = ref(db, 'workspaces');
  const unsubscribeAll = onValue(wsRef, (snapshot) => {
    if (!isSubscribed) return;
    if (!snapshot.exists()) {
      loadFromIndex();
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
    if (userWorkspaces.length > 0) {
      callback(userWorkspaces);
    } else {
      loadFromIndex();
    }
  }, (err) => {
    console.warn("Workspaces listener warning:", err);
    loadFromIndex();
  });

  // Also listen to changes on user_workspaces index
  const indexRef = ref(db, `user_workspaces/${uid}`);
  const unsubscribeIndex = onValue(indexRef, () => {
    if (isSubscribed) loadFromIndex();
  }, () => {});

  return () => {
    isSubscribed = false;
    unsubscribeAll();
    unsubscribeIndex();
  };
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
  let memberRole = role || 'Member';
  try {
    const existingSnap = await get(ref(db, `workspaces/${workspaceId}/members/${uid}`));
    if (existingSnap.exists()) {
      const existing = existingSnap.val();
      if (existing?.role && (existing.role === 'Founder' || existing.role === 'Admin')) {
        memberRole = existing.role;
      }
    }
  } catch (e) {}

  const memberData = {
    uid,
    name: name || (email ? email.split('@')[0] : 'User'),
    email: email || '',
    role: memberRole
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
  const safeTitle = title.trim();
  const safeStatus = status || 'Active';
  const safeCategory = category || 'General';
  const safeDays = parseInt(dueDays || 7) || 7;
  const safeDueDate = dueDate || new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
  const safeEmail = email || '';
  const safeName = displayName || (safeEmail ? safeEmail.split('@')[0] : 'User');

  const projectData = {
    id: key,
    _id: key,
    title: safeTitle,
    status: safeStatus,
    category: safeCategory,
    workspaceId,
    createdAt: new Date().toISOString(),
    dueDate: safeDueDate,
    members: {}
  };

  if (uid) {
    projectData.members[uid] = {
      uid,
      email: safeEmail,
      name: safeName,
      role: 'Founder',
      joinedAt: new Date().toISOString()
    };
  }

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
  }, (err) => {
    console.warn("subscribeToProjects error:", err);
    callback([]);
  });
}

export async function getProject(param1, param2) {
  if (!param1 && !param2) return null;

  // Case 1: Both workspaceId and projectId provided
  if (param1 && param2) {
    // Try param1 as workspaceId, param2 as projectId
    try {
      const snap1 = await get(ref(db, `workspaces/${param1}/projects/${param2}`));
      if (snap1.exists()) {
        const data = snap1.val();
        return { 
          _id: param2, 
          id: param2, 
          workspaceId: param1,
          ...data, 
          members: data.members ? Object.values(data.members) : [],
          invites: data.invites ? Object.values(data.invites) : []
        };
      }
    } catch (e) {}

    // Try reverse: param2 as workspaceId, param1 as projectId
    try {
      const snap2 = await get(ref(db, `workspaces/${param2}/projects/${param1}`));
      if (snap2.exists()) {
        const data = snap2.val();
        return { 
          _id: param1, 
          id: param1, 
          workspaceId: param2,
          ...data, 
          members: data.members ? Object.values(data.members) : [],
          invites: data.invites ? Object.values(data.invites) : []
        };
      }
    } catch (e) {}
  }

  // Case 2: Only 1 parameter or not found directly -> search all workspaces
  const targetProjectId = param2 || param1;
  try {
    const wsSnap = await get(ref(db, 'workspaces'));
    if (wsSnap.exists()) {
      const allWs = wsSnap.val();
      for (const wsKey of Object.keys(allWs)) {
        if (allWs[wsKey]?.projects && allWs[wsKey].projects[targetProjectId]) {
          const data = allWs[wsKey].projects[targetProjectId];
          return { 
            _id: targetProjectId, 
            id: targetProjectId, 
            workspaceId: wsKey,
            ...data, 
            members: data.members ? Object.values(data.members) : [],
            invites: data.invites ? Object.values(data.invites) : []
          };
        }
      }
    }
  } catch (e) {
    console.error("Workspace scan project lookup failed:", e);
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

  // Check if member already exists to preserve elevated role
  let memberRole = mData.role || 'Member';
  try {
    const existingSnap = await get(ref(db, `workspaces/${wId}/projects/${pId}/members/${mData.uid}`));
    if (existingSnap.exists()) {
      const existing = existingSnap.val();
      if (existing?.role && (existing.role === 'Founder' || existing.role === 'Admin')) {
        memberRole = existing.role;
      }
    }
  } catch (e) {}

  const data = {
    uid: mData.uid,
    name: mData.name || (mData.email ? mData.email.split('@')[0] : 'User'),
    email: mData.email || '',
    role: memberRole,
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
  if (!workspaceId || !projectId || !user?.uid) {
    throw new Error("workspaceId, projectId, and user are required to accept invite");
  }

  // 1. Inherit role from invite record if available
  let assignedRole = 'Member';
  const userEmail = (user.email || '').toLowerCase().trim();
  try {
    const invitesSnap = await get(ref(db, `workspaces/${workspaceId}/projects/${projectId}/invites`));
    if (invitesSnap.exists()) {
      const invites = invitesSnap.val();
      for (const [key, inv] of Object.entries(invites)) {
        if (inv.email && inv.email.toLowerCase().trim() === userEmail) {
          if (inv.role) assignedRole = inv.role;
          await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/invites/${key}`), {
            status: 'Accepted',
            acceptedAt: new Date().toISOString(),
            acceptedUid: user.uid
          });
        }
      }
    }
  } catch (e) {
    console.warn("Could not check/update invite status:", e);
  }

  const memberPayload = {
    uid: user.uid,
    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
    email: user.email || '',
    role: assignedRole,
    joinedAt: new Date().toISOString()
  };

  // 2. Add to workspace
  await addWorkspaceMember(workspaceId, memberPayload);

  // 3. Add to project
  await addProjectMember(workspaceId, projectId, memberPayload);

  // 4. Log activity
  try {
    await logActivity({
      user: memberPayload.name,
      action: 'joined project via invite link',
      target: 'Project',
      workspaceId,
      projectId,
      type: 'member_joined'
    });
  } catch (e) {
    console.warn("Could not log activity:", e);
  }

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
