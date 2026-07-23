/**
 * Community Service
 * Handles social interactions (search, friend requests, friends lists)
 * Supports Firebase Firestore & Local Storage Mock Mode fallback.
 */

import { 
  isInitialized, 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  limit 
} from '../../firebase.js';

const MOCK_MODE = !isInitialized || window.location.protocol === 'file:';

const MOCK_USERS = [
  { uid: 'mock-user-1', displayName: 'Elif S.', lastEmotion: 'se_calm' },
  { uid: 'mock-user-2', displayName: 'Can Y.', lastEmotion: 'se_anxious' },
  { uid: 'mock-user-3', displayName: 'Melis A.', lastEmotion: 'se_exhausted' },
  { uid: 'mock-user-4', displayName: 'Arda K.', lastEmotion: 'se_focused' },
  { uid: 'mock-user-5', displayName: 'Buse T.', lastEmotion: 'se_grateful' }
];

// Helper to initialize mock local storage social state if missing
function initMockSocialData(currentUid) {
  if (!currentUid) return;
  if (!localStorage.getItem('aura_mock_friends')) {
    const initialFriends = [
      {
        id: `mock-user-3_${currentUid}`,
        users: ['mock-user-3', currentUid],
        names: { 'mock-user-3': 'Melis A.', [currentUid]: 'Ben' },
        timestamp: Date.now()
      }
    ];
    localStorage.setItem('aura_mock_friends', JSON.stringify(initialFriends));
  }
  if (!localStorage.getItem('aura_mock_friend_requests')) {
    const initialRequests = [
      {
        id: `mock-user-2_${currentUid}`,
        senderUid: 'mock-user-2',
        senderName: 'Can Y.',
        receiverUid: currentUid,
        receiverName: 'Ben',
        status: 'pending',
        timestamp: Date.now() - 3600000
      }
    ];
    localStorage.setItem('aura_mock_friend_requests', JSON.stringify(initialRequests));
  }
}

// Previous Mock data for custom modules/exercises (maintained for backward compatibility)
const LEGACY_MOCK_DATA = {
  articles: [
    {
      id: "art-01",
      title: "The Vagal Bridge: Science of Connection",
      author: "Dr. Aris",
      category: "Science",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400",
      excerpt: "Understanding the social engagement system through polyvagal lens.",
      content: "Full article content here..."
    }
  ],
  modules: [
    {
      id: "mod-vagal-visuals-plus",
      name: "Aurora Flux Visuals",
      author: "Aura Lab",
      price: "Free",
      type: "Visual",
      description: "Enhanced liquid-metal simulations for the vagal triangle.",
      installed: false
    }
  ],
  customExercises: []
};

export const communityService = {
  // Legacy methods kept to prevent breaking imports
  getCommunityData: async () => {
    return new Promise(resolve => setTimeout(() => resolve(LEGACY_MOCK_DATA), 400));
  },
  publishExercise: async (exerciseData) => {
    return new Promise(resolve => {
      LEGACY_MOCK_DATA.customExercises.push(exerciseData);
      setTimeout(() => resolve({ success: true, id: exerciseData.id }), 300);
    });
  },

  // --- Profile Sync ---
  syncUserProfile: async (user, lastEmotion = null) => {
    if (!user) return;
    if (MOCK_MODE) {
      const localProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
        lastEmotion: lastEmotion || 'se_neutral'
      };
      localStorage.setItem('aura_user_profile', JSON.stringify(localProfile));
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const data = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
        email: user.email || '',
        searchName: (user.displayName || user.email?.split('@')[0] || 'kullanici').toLowerCase(),
        updatedAt: Date.now()
      };
      if (lastEmotion) {
        data.lastEmotion = lastEmotion;
      }
      await setDoc(userRef, data, { merge: true });
    } catch (err) {
      console.warn("[Community Service] Sync Profile failed:", err);
    }
  },

  // --- Search Users ---
  searchUsers: async (searchQuery, currentUser) => {
    if (!searchQuery || !currentUser) return [];
    
    if (MOCK_MODE) {
      const qLower = searchQuery.toLowerCase();
      // Filter mock list, matching query, excluding self
      return MOCK_USERS.filter(u => 
        u.uid !== currentUser.uid && 
        u.displayName.toLowerCase().includes(qLower)
      );
    }

    try {
      const q = query(
        collection(db, "users"),
        where("searchName", ">=", searchQuery.toLowerCase()),
        where("searchName", "<=", searchQuery.toLowerCase() + "\uf8ff"),
        limit(20)
      );
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.uid !== currentUser.uid) {
          results.push(u);
        }
      });
      return results;
    } catch (err) {
      console.error("[Community Service] Search users failed:", err);
      return [];
    }
  },

  // --- Send Friend Request ---
  sendFriendRequest: async (sender, receiverUid, receiverName) => {
    if (!sender || !receiverUid) return false;
    const senderName = sender.displayName || sender.email?.split('@')[0] || 'Kullanıcı';
    const requestId = `${sender.uid}_${receiverUid}`;

    if (MOCK_MODE) {
      initMockSocialData(sender.uid);
      const requests = JSON.parse(localStorage.getItem('aura_mock_friend_requests') || '[]');
      
      // Check if duplicate
      if (requests.some(r => r.id === requestId)) return true;

      requests.push({
        id: requestId,
        senderUid: sender.uid,
        senderName: senderName,
        receiverUid: receiverUid,
        receiverName: receiverName,
        status: 'pending',
        timestamp: Date.now()
      });
      localStorage.setItem('aura_mock_friend_requests', JSON.stringify(requests));
      return true;
    }

    try {
      const requestRef = doc(db, "friendRequests", requestId);
      await setDoc(requestRef, {
        senderUid: sender.uid,
        senderName: senderName,
        receiverUid: receiverUid,
        receiverName: receiverName,
        status: 'pending',
        timestamp: Date.now()
      });
      return true;
    } catch (err) {
      console.error("[Community Service] Send friend request failed:", err);
      return false;
    }
  },

  // --- Get Incoming Requests ---
  getIncomingRequests: async (uid) => {
    if (!uid) return [];

    if (MOCK_MODE) {
      initMockSocialData(uid);
      const requests = JSON.parse(localStorage.getItem('aura_mock_friend_requests') || '[]');
      return requests.filter(r => r.receiverUid === uid && r.status === 'pending');
    }

    try {
      const q = query(
        collection(db, "friendRequests"),
        where("receiverUid", "==", uid),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      return results;
    } catch (err) {
      console.error("[Community Service] Get incoming requests failed:", err);
      return [];
    }
  },

  // --- Get Outgoing Requests ---
  getOutgoingRequests: async (uid) => {
    if (!uid) return [];

    if (MOCK_MODE) {
      initMockSocialData(uid);
      const requests = JSON.parse(localStorage.getItem('aura_mock_friend_requests') || '[]');
      return requests.filter(r => r.senderUid === uid && r.status === 'pending');
    }

    try {
      const q = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", uid),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const results = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      return results;
    } catch (err) {
      console.error("[Community Service] Get outgoing requests failed:", err);
      return [];
    }
  },

  // --- Respond to Friend Request ---
  respondToFriendRequest: async (requestId, senderUid, senderName, receiverUid, receiverName, accept) => {
    if (MOCK_MODE) {
      const currentUid = senderUid === receiverUid ? receiverUid : (senderUid || receiverUid);
      initMockSocialData(currentUid);
      
      let requests = JSON.parse(localStorage.getItem('aura_mock_friend_requests') || '[]');
      requests = requests.filter(r => r.id !== requestId);
      localStorage.setItem('aura_mock_friend_requests', JSON.stringify(requests));

      if (accept) {
        const friends = JSON.parse(localStorage.getItem('aura_mock_friends') || '[]');
        const friendshipId = senderUid < receiverUid ? `${senderUid}_${receiverUid}` : `${receiverUid}_${senderUid}`;
        if (!friends.some(f => f.id === friendshipId)) {
          friends.push({
            id: friendshipId,
            users: [senderUid, receiverUid],
            names: { [senderUid]: senderName, [receiverUid]: receiverName },
            timestamp: Date.now()
          });
          localStorage.setItem('aura_mock_friends', JSON.stringify(friends));
        }
      }
      return true;
    }

    try {
      // 1. Delete request
      const requestRef = doc(db, "friendRequests", requestId);
      await deleteDoc(requestRef);

      // 2. If accept, create friend link
      if (accept) {
        const friendshipId = senderUid < receiverUid ? `${senderUid}_${receiverUid}` : `${receiverUid}_${senderUid}`;
        const friendRef = doc(db, "friends", friendshipId);
        await setDoc(friendRef, {
          users: [senderUid, receiverUid],
          names: { [senderUid]: senderName, [receiverUid]: receiverName },
          timestamp: Date.now()
        });
      }
      return true;
    } catch (err) {
      console.error("[Community Service] Respond to friend request failed:", err);
      return false;
    }
  },

  // --- Get Friends ---
  getFriends: async (uid) => {
    if (!uid) return [];

    if (MOCK_MODE) {
      initMockSocialData(uid);
      const friends = JSON.parse(localStorage.getItem('aura_mock_friends') || '[]');
      const friendsList = friends.filter(f => f.users.includes(uid));

      // Resolve their details and attach their mock somatic state
      return friendsList.map(f => {
        const friendUid = f.users.find(id => id !== uid);
        const name = f.names[friendUid];
        
        // Find if they are one of our predefined users to get their state
        const matchingMockUser = MOCK_USERS.find(mu => mu.uid === friendUid);
        return {
          friendUid,
          displayName: name,
          lastEmotion: matchingMockUser ? matchingMockUser.lastEmotion : 'se_neutral'
        };
      });
    }

    try {
      const q = query(
        collection(db, "friends"),
        where("users", "array-contains", uid)
      );
      const snap = await getDocs(q);
      const friendshipDocs = [];
      snap.forEach(d => friendshipDocs.push({ id: d.id, ...d.data() }));

      const friendsList = [];
      for (const f of friendshipDocs) {
        const friendUid = f.users.find(id => id !== uid);
        const savedName = f.names[friendUid] || 'Kullanıcı';

        // Fetch their live document from users collection to get latest state
        let lastEmotion = 'se_neutral';
        let displayName = savedName;
        try {
          const friendProfileRef = doc(db, "users", friendUid);
          const friendProfileSnap = await getDoc(friendProfileRef);
          if (friendProfileSnap.exists()) {
            const profile = friendProfileSnap.data();
            lastEmotion = profile.lastEmotion || 'se_neutral';
            displayName = profile.displayName || savedName;
          }
        } catch (profileErr) {
          console.warn(`[Community Service] Profile fetch failed for friend ${friendUid}:`, profileErr);
        }

        friendsList.push({
          friendUid,
          displayName,
          lastEmotion
        });
      }

      return friendsList;
    } catch (err) {
      console.error("[Community Service] Get friends failed:", err);
      return [];
    }
  }
};
