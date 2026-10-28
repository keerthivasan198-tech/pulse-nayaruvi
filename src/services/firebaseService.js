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

  await set(wsRef, workspaceData);

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
// 2. PROJECTS (Hierarchical per Workspace)
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

  // Write to hierarchical location
  await set(projRef, projectData);

  // Backward-compatibility mirror to top-level /projects
  try {
    await set(ref(db, `projects/${key}`), projectData);
  } catch (e) {}

  return projectData;
}

export async function getProjects(workspaceId, uid) {
  if (!workspaceId) return [];
  // 1. Check workspace branch
  const snapshot = await get(ref(db, `workspaces/${workspaceId}/projects`));
  if (snapshot.exists()) {
    const all = snapshot.val();
    return Object.keys(all)
      .filter(key => !uid || (all[key].members && all[key].members[uid]))
      .map(key => ({
        _id: key,
        id: key,
        ...all[key],
        membersList: all[key].members ? Object.values(all[key].members) : []
      }));
  }

  // 2. Fallback to top-level /projects
  const legacySnap = await get(ref(db, 'projects'));
  if (legacySnap.exists()) {
    const all = legacySnap.val();
    return Object.keys(all)
      .filter(key => all[key].workspaceId === workspaceId && (!uid || (all[key].members && all[key].members[uid])))
      .map(key => ({
        _id: key,
        id: key,
        ...all[key],
        membersList: all[key].members ? Object.values(all[key].members) : []
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
          membersList: all[key].members ? Object.values(all[key].members) : []
        }));
      callback(list);
    } else {
      // Fallback check top-level /projects
      get(ref(db, 'projects')).then((legSnap) => {
        if (legSnap.exists()) {
          const all = legSnap.val();
          const list = Object.keys(all)
            .filter(key => all[key].workspaceId === workspaceId && (!uid || (all[key].members && all[key].members[uid])))
            .map(key => ({
              _id: key,
              id: key,
              ...all[key],
              membersList: all[key].members ? Object.values(all[key].members) : []
            }));
          callback(list);
        } else {
          callback([]);
        }
      }).catch(() => callback([]));
    }
  });
}

export async function getProject(workspaceId, projectId) {
  // If only 1 argument provided as projectId
  const pId = projectId || workspaceId;
  const wId = projectId ? workspaceId : null;

  if (wId) {
    const snap = await get(ref(db, `workspaces/${wId}/projects/${pId}`));
    if (snap.exists()) {
      const data = snap.val();
      return { _id: pId, id: pId, ...data, members: data.members ? Object.values(data.members) : [] };
    }
  }

  // Fallback to top-level /projects
  const legacySnap = await get(ref(db, `projects/${pId}`));
  if (legacySnap.exists()) {
    const data = legacySnap.val();
    return { _id: pId, id: pId, ...data, members: data.members ? Object.values(data.members) : [] };
  }

  return null;
}

export async function updateProject(workspaceId, projectId, updates) {
  if (!projectId) return;
  if (workspaceId) {
    await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}`), updates);
  }
  await update(ref(db, `projects/${projectId}`), updates).catch(() => {});
}

export async function deleteProject(workspaceId, projectId) {
  if (!projectId) return;
  if (workspaceId) {
    await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}`));
  }
  await remove(ref(db, `projects/${projectId}`)).catch(() => {});
}

export async function addProjectMember(workspaceId, projectId, { uid, name, email, role }) {
  if (!projectId || !uid) return;
  const memberData = {
    uid,
    name: name || (email ? email.split('@')[0] : 'User'),
    email: email || '',
    role: role || 'Member'
  };
  if (workspaceId) {
    await set(ref(db, `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`), memberData);
  }
  await set(ref(db, `projects/${projectId}/members/${uid}`), memberData).catch(() => {});
}

export async function updateProjectMemberRole(workspaceId, projectId, uid, role) {
  if (!projectId || !uid) return;
  if (workspaceId) {
    await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`), { role });
  }
  await update(ref(db, `projects/${projectId}/members/${uid}`), { role }).catch(() => {});
}

export async function removeProjectMember(workspaceId, projectId, uid) {
  if (!projectId || !uid) return;
  if (workspaceId) {
    await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/members/${uid}`));
  }
  await remove(ref(db, `projects/${projectId}/members/${uid}`)).catch(() => {});
}

// ==========================================
// 3. TASKS (Hierarchical per Project in Workspace)
// Path: /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}
// ==========================================

export async function createTask(workspaceId, projectId, taskData) {
  if (!projectId) throw new Error('projectId is required to create a task');

  const baseRef = workspaceId 
    ? ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks`)
    : ref(db, 'dashboard_tasks');
    
  const newTaskRef = push(baseRef);
  const key = newTaskRef.key;

  const fullTask = {
    ...taskData,
    id: key,
    _id: key,
    projectId,
    workspaceId: workspaceId || taskData.workspaceId || null,
    createdAt: taskData.createdAt || new Date().toISOString()
  };

  await set(newTaskRef, fullTask);

  // Keep mirrored copy in /dashboard_tasks so existing views and notification managers continue working seamlessly
  try {
    await set(ref(db, `dashboard_tasks/${key}`), fullTask);
  } catch (e) {}

  return fullTask;
}

export async function updateTask(workspaceId, projectId, taskId, updates) {
  if (!taskId) return;
  if (workspaceId && projectId) {
    await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`), updates).catch(() => {});
  }
  await update(ref(db, `dashboard_tasks/${taskId}`), updates).catch(() => {});
}

export async function deleteTask(workspaceId, projectId, taskId) {
  if (!taskId) return;
  if (workspaceId && projectId) {
    await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)).catch(() => {});
  }
  await remove(ref(db, `dashboard_tasks/${taskId}`)).catch(() => {});
}

export function subscribeToTasks(workspaceId, projectId, callback) {
  if (!workspaceId && !projectId) return () => {};

  if (workspaceId && projectId) {
    // Listen to specific project's tasks branch
    const tasksRef = ref(db, `workspaces/${workspaceId}/projects/${projectId}/tasks`);
    return onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        callback(list);
      } else {
        // Fallback to /dashboard_tasks filtered by projectId
        get(ref(db, 'dashboard_tasks')).then((legacySnap) => {
          if (legacySnap.exists()) {
            const data = legacySnap.val();
            const list = Object.keys(data)
              .map(key => ({ id: key, ...data[key] }))
              .filter(t => t.projectId === projectId);
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(list);
          } else {
            callback([]);
          }
        }).catch(() => callback([]));
      }
    });
  }

  // If only workspaceId is provided, listen to all tasks in dashboard_tasks for this workspace
  const legacyRef = ref(db, 'dashboard_tasks');
  return onValue(legacyRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ id: key, ...data[key] }))
        .filter(t => !workspaceId || t.workspaceId === workspaceId);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(list);
    } else {
      callback([]);
    }
  });
}

// ==========================================
// 4. CHECKLIST (Hierarchical per Project in Workspace)
// Path: /workspaces/{workspaceId}/projects/{projectId}/checklist/{itemId}
// ==========================================

export async function createChecklistItem(workspaceId, projectId, itemData) {
  const path = workspaceId 
    ? `workspaces/${workspaceId}/projects/${projectId}/checklist`
    : `dashboard_projects/${projectId}/checklist`;

  const itemRef = push(ref(db, path));
  const key = itemRef.key;
  const fullItem = {
    ...itemData,
    id: key,
    _id: key,
    projectId,
    workspaceId: workspaceId || null,
    createdAt: new Date().toISOString()
  };

  await set(itemRef, fullItem);

  // Mirror to legacy path for compatibility
  try {
    await set(ref(db, `dashboard_projects/${projectId}/checklist/${key}`), fullItem);
  } catch (e) {}

  return fullItem;
}

export async function updateChecklistItem(workspaceId, projectId, itemId, updates) {
  if (workspaceId) {
    await update(ref(db, `workspaces/${workspaceId}/projects/${projectId}/checklist/${itemId}`), updates).catch(() => {});
  }
  await update(ref(db, `dashboard_projects/${projectId}/checklist/${itemId}`), updates).catch(() => {});
}

export async function deleteChecklistItem(workspaceId, projectId, itemId) {
  if (workspaceId) {
    await remove(ref(db, `workspaces/${workspaceId}/projects/${projectId}/checklist/${itemId}`)).catch(() => {});
  }
  await remove(ref(db, `dashboard_projects/${projectId}/checklist/${itemId}`)).catch(() => {});
}

export function subscribeToChecklist(workspaceId, projectId, callback) {
  if (!projectId) return () => {};

  const path = workspaceId 
    ? `workspaces/${workspaceId}/projects/${projectId}/checklist`
    : `dashboard_projects/${projectId}/checklist`;

  const listRef = ref(db, path);
  return onValue(listRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(list);
    } else {
      // Fallback to legacy path
      get(ref(db, `dashboard_projects/${projectId}/checklist`)).then(snap => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list);
        } else {
          callback([]);
        }
      }).catch(() => callback([]));
    }
  });
}

// ==========================================
// 5. ACTIVITY (Hierarchical per Workspace)
// Path: /workspaces/{workspaceId}/activity/{activityId}
// ==========================================

export async function logActivity(activityData) {
  const wsId = activityData.workspaceId;
  const path = wsId ? `workspaces/${wsId}/activity` : 'dashboard_activity';

  const actRef = push(ref(db, path));
  const key = actRef.key;
  const data = {
    ...activityData,
    id: key,
    _id: key,
    timestamp: activityData.timestamp || new Date().toISOString()
  };

  await set(actRef, data);

  // Mirror to top-level dashboard_activity for cross-workspace feeds
  try {
    await set(ref(db, `dashboard_activity/${key}`), data);
  } catch (e) {}

  return data;
}

export function subscribeToActivities(workspaceId, callback, limit = 50) {
  if (!workspaceId) {
    // Listen to top-level
    const actRef = ref(db, 'dashboard_activity');
    return onValue(actRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const all = snapshot.val();
      const list = Object.keys(all).map(key => ({ _id: key, id: key, ...all[key] }));
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      callback(list.slice(0, limit));
    });
  }

  const wsActRef = ref(db, `workspaces/${workspaceId}/activity`);
  return onValue(wsActRef, (snapshot) => {
    if (snapshot.exists()) {
      const all = snapshot.val();
      const list = Object.keys(all).map(key => ({ _id: key, id: key, ...all[key] }));
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      callback(list.slice(0, limit));
    } else {
      // Fallback to dashboard_activity filtered by workspaceId
      get(ref(db, 'dashboard_activity')).then(snap => {
        if (snap.exists()) {
          const all = snap.val();
          const list = Object.keys(all)
            .filter(key => all[key].workspaceId === workspaceId)
            .map(key => ({ _id: key, id: key, ...all[key] }));
          list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          callback(list.slice(0, limit));
        } else {
          callback([]);
        }
      }).catch(() => callback([]));
    }
  });
}
