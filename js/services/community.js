/**
 * Community Service - Experimental
 * Handles mock data for articles, modules, and custom exercises.
 */

const MOCK_DATA = {
  articles: [
    {
      id: "art-01",
      title: "The Vagal Bridge: Science of Connection",
      author: "Dr. Aris",
      category: "Science",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400",
      excerpt: "Understanding the social engagement system through polyvagal lens.",
      content: "Full article content here..."
    },
    {
      id: "art-02",
      title: "Micro-Breathing in High Stress",
      author: "Sarah J.",
      category: "Practice",
      image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=400",
      excerpt: "How to use 4-second holds to reset your sympathetic drive.",
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
    },
    {
      id: "mod-sound-pack-01",
      name: "Deep Earth Drones",
      author: "Sonic Wellness",
      price: "Free",
      type: "Audio",
      description: "Low-frequency resonance patterns for dorsal grounding.",
      installed: false
    }
  ],
  customExercises: [
    {
      id: "deep-vagal-01",
      author: "UserX",
      name: "Midnight Calm",
      pattern: { inhale: 4, hold: 4, exhale: 6, pause: 2 },
      visuals: {
        primaryColor: "rgba(100, 200, 255, 0.3)",
        blurIntensity: "15px",
        glowType: "liquid-pulse"
      },
      audio: "theta-waves-432hz"
    }
  ]
};

export const communityService = {
  getCommunityData: async () => {
    return new Promise(resolve => {
      setTimeout(() => resolve(MOCK_DATA), 800);
    });
  },

  publishExercise: async (exerciseData) => {
    return new Promise(resolve => {
      console.log("[Community Service] Publishing exercise:", exerciseData);
      MOCK_DATA.customExercises.push(exerciseData);
      setTimeout(() => resolve({ success: true, id: exerciseData.id }), 500);
    });
  }
};
