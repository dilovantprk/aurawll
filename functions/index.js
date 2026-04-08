const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.dailyAuraNudges = functions.pubsub.schedule("0 * * * *").onRun(async (context) => {
  // We use UTC hours for global synchronization. The client saves `nudgeHourUTC`.
  const currentUTCHour = new Date().getUTCHours();
  
  const usersSnapshot = await db.collection("users")
    .where("notificationsEnabled", "==", true)
    .where("nudgeHourUTC", "==", currentUTCHour)
    .get();

  if (usersSnapshot.empty) {
    console.log(`No users scheduled for hour UTC ${currentUTCHour}`);
    return null;
  }

  const messages = [];

  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (!userData.fcmToken) return;

    // Pick a tone randomly: 0=curious, 1=warm, 2=observational
    const toneChoice = Math.floor(Math.random() * 3);
    const lang = userData.language || "en";
    
    const copy = {
      en: {
        curious: "How's your system today?",
        warm: "Aura is here when you're ready.",
        obs: "Yesterday you felt {emotion}. Today's a new check-in."
      },
      tr: {
        curious: "Bugün bedenin ve zihnin nasıl hissediyor?",
        warm: "Hazır hissettiğinde Aura burada.",
        obs: "Dün {emotion} hissediyordun. Bugün yeni bir sayfa."
      }
    };
    
    const localizedAppEmotions = {
      en: {
        se_anxious: "anxious", se_overwhelmed: "overwhelmed", se_scattered: "scattered", se_frustrated: "frustrated", 
        se_racing_thoughts: "like you had racing thoughts", se_on_edge: "on edge",
        se_exhausted: "exhausted", se_numb: "numb", se_disconnected: "disconnected", se_bored: "bored",
        se_heavy: "heavy", se_spaced_out: "spaced out",
        se_calm: "calm", se_focused: "focused", se_content: "content", se_grateful: "grateful",
        se_neutral: "neutral", se_grounded: "grounded"
      },
      tr: {
        se_anxious: "endişeli", se_overwhelmed: "bunalmış", se_scattered: "dağınık", se_frustrated: "öfkeli", 
        se_racing_thoughts: "düşüncelere boğulmuş", se_on_edge: "diken üstünde",
        se_exhausted: "bitkin", se_numb: "hissiz", se_disconnected: "kopuk", se_bored: "sıkkın",
        se_heavy: "ağırlaşmış", se_spaced_out: "kopmuş",
        se_calm: "sakin", se_focused: "odaklanmış", se_content: "hoşnut", se_grateful: "minnettar",
        se_neutral: "nötr", se_grounded: "dengeli"
      }
    };

    let title = "Aura.";
    let body = "";

    const userDict = copy[lang] || copy["en"];
    
    if (toneChoice === 0) {
      body = userDict.curious;
    } else if (toneChoice === 1) {
      body = userDict.warm;
    } else {
      const eKey = userData.lastEmotion || "se_neutral";
      const eText = (localizedAppEmotions[lang] || localizedAppEmotions["en"])[eKey] || "different";
      body = userDict.obs.replace("{emotion}", eText);
    }

    messages.push({
      token: userData.fcmToken,
      notification: {
        title: title,
        body: body
      }
    });
  });

  if (messages.length > 0) {
    const response = await admin.messaging().sendAll(messages);
    console.log(`Successfully sent ${response.successCount} messages; failed ${response.failureCount}`);
  }

  return null;
});
