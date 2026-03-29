import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── AUTH ────────────────────────────────────
export const auth = {
  async signUp({ email, password, name, role, institution, biobankName, location }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role, institution, biobankName, location } }
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async getProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data;
  },

  async updateProfile(userId, updates) {
    const { data } = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle();
    return data;
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ── SAMPLES ────────────────────────────────
export const samples = {
  async list() {
    const { data, error } = await supabase
      .from('samples')
      .select('*, biobanks(id, name, location, verified, specialties)')
      .order('created_at', { ascending: false });
    if (error) { console.error("SAMPLES LIST ERROR:", error); return []; }
    return data || [];
  },

  async create(sample) {
    console.log("SAMPLE CREATE:", sample);
    const { data, error } = await supabase.from('samples').insert(sample).select().maybeSingle();
    console.log("SAMPLE CREATE RESULT:", data, "ERROR:", error);
    if (error) throw error;
    return data;
  }
};

// ── BIOBANKS ───────────────────────────────
export const biobanks = {
  async list() {
    const { data, error } = await supabase.from('biobanks').select('*');
    if (error) { console.error("BIOBANKS LIST ERROR:", error); return []; }
    return data || [];
  },

  async getMine(userId) {
    if (!userId) return null;
    const { data } = await supabase.from('biobanks').select('*').eq('owner_id', userId);
    return data && data.length > 0 ? data[0] : null;
  },

  async get(id) {
    const { data } = await supabase.from('biobanks').select('*').eq('id', id).maybeSingle();
    return data;
  }
};

// ── REQUESTS ───────────────────────────────
export const requests = {
  async create(userId, { sampleId, biobankId, quantity, message }) {
    console.log("REQUEST CREATE:", { userId, sampleId, biobankId });
    const { data, error } = await supabase
      .from('requests')
      .insert({ researcher_id: userId, sample_id: sampleId, biobank_id: biobankId, quantity, message, status: 'pending' })
      .select()
      .maybeSingle();
    console.log("REQUEST RESULT:", data, "ERROR:", error);
    if (error) throw error;
    return data;
  },

  async listMine(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('requests')
      .select('*, samples(disease, subtype), biobanks(name, location)')
      .eq('researcher_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error("MY REQUESTS ERROR:", error); return []; }
    return data || [];
  },

  async listForBiobank(biobankId) {
    if (!biobankId) return [];
    const { data, error } = await supabase
      .from('requests')
      .select('*, samples(disease, subtype), profiles!researcher_id(name, institution)')
      .eq('biobank_id', biobankId)
      .order('created_at', { ascending: false });
    if (error) { console.error("BIOBANK REQUESTS ERROR:", error); return []; }
    return data || [];
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase.from('requests').update({ status }).eq('id', id).select().maybeSingle();
    if (error) console.error("STATUS UPDATE ERROR:", error);
    return data;
  },

  subscribeToUpdates(callback) {
    return supabase.channel('request-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, callback)
      .subscribe();
  }
};

// ── FAVORITES ──────────────────────────────
export const favorites = {
  async list(userId) {
    if (!userId) return [];
    const { data, error } = await supabase.from('favorites').select('sample_id').eq('user_id', userId);
    if (error) { console.error("FAV LIST ERROR:", error); return []; }
    return data || [];
  },

  async add(userId, sampleId) {
    console.log("FAV ADD:", userId, sampleId);
    const { data, error } = await supabase.from('favorites').insert({ user_id: userId, sample_id: sampleId }).select().maybeSingle();
    console.log("FAV ADD RESULT:", data, "ERROR:", error);
    return data;
  },

  async remove(userId, sampleId) {
    console.log("FAV REMOVE:", userId, sampleId);
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('sample_id', sampleId);
    console.log("FAV REMOVE ERROR:", error);
  }
};

// ── THREADS ────────────────────────────────
export const threads = {
  async create(userId, { biobankId, sampleId, message }) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('threads')
      .insert({ researcher_id: userId, biobank_id: biobankId, sample_id: sampleId, last_message: message?.slice(0, 100), last_message_at: new Date().toISOString() })
      .select()
      .maybeSingle();
    if (error) { console.error("THREAD CREATE ERROR:", error); return null; }
    return data;
  },

  async listForResearcher(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('threads')
      .select('*, biobanks(name), samples(disease, subtype)')
      .eq('researcher_id', userId)
      .order('last_message_at', { ascending: false });
    if (error) { console.error("THREADS ERROR:", error); return []; }
    return data || [];
  },

  async listForBiobank(biobankId) {
    if (!biobankId) return [];
    const { data, error } = await supabase
      .from('threads')
      .select('*, profiles!researcher_id(name), samples(disease, subtype)')
      .eq('biobank_id', biobankId)
      .order('last_message_at', { ascending: false });
    if (error) { console.error("THREADS ERROR:", error); return []; }
    return data || [];
  }
};

// ── MESSAGES ───────────────────────────────
export const messages = {
  async send(userId, { threadId, text, senderName }) {
    if (!userId || !threadId) return null;
    const { data, error } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, sender_id: userId, sender_name: senderName, text })
      .select()
      .maybeSingle();
    if (error) { console.error("MSG SEND ERROR:", error); return null; }

    // Update thread last message
    supabase.from('threads').update({ last_message: text.slice(0, 100), last_message_at: new Date().toISOString() }).eq('id', threadId).then(() => {});
    return data;
  },

  async listByThread(threadId) {
    if (!threadId) return [];
    const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) { console.error("MSG LIST ERROR:", error); return []; }
    return data || [];
  },

  subscribeToThread(threadId, callback) {
    return supabase.channel(`messages:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, callback)
      .subscribe();
  }
};
