// ============================================
// supabase.js — Client setup & API helpers
// ============================================
// Install: npm install @supabase/supabase-js
//
// Add these to your .env file:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── AUTH ────────────────────────────────────
export const auth = {
  // Sign up with email + password
  async signUp({ email, password, name, role, institution, biobankName, location }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, institution, biobankName, location }
      }
    });
    if (error) throw error;

    // If biobank role, create biobank record
    if (role === 'biobank' && data.user) {
      await supabase.from('biobanks').insert({
        owner_id: data.user.id,
        name: biobankName || name,
        location: location || '',
        specialties: [],
        certifications: [],
      });
    }
    return data;
  },

  // Sign in
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user profile
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile;
  },

  // Update profile
  async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Listen to auth state changes
  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ── SAMPLES ────────────────────────────────
export const samples = {
  // List all samples with biobank info
  async list({ type, search, minPrice, maxPrice, preservation, dataTypes } = {}) {
    let query = supabase
      .from('samples')
      .select(`
        *,
        biobanks (
          id, name, location, verified, specialties,
          owner_id
        )
      `)
      .order('created_at', { ascending: false });

    if (type && type !== 'All') query = query.eq('type', type);
    if (search) query = query.or(`disease.ilike.%${search}%,organ.ilike.%${search}%,subtype.ilike.%${search}%`);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (preservation?.length) query = query.in('preservation', preservation);
    if (dataTypes?.length) query = query.overlaps('matched_data', dataTypes);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get single sample
  async get(id) {
    const { data, error } = await supabase
      .from('samples')
      .select('*, biobanks(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create sample (biobank owner)
  async create(sample) {
    const { data, error } = await supabase
      .from('samples')
      .insert(sample)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update sample
  async update(id, updates) {
    const { data, error } = await supabase
      .from('samples')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete sample
  async remove(id) {
    const { error } = await supabase.from('samples').delete().eq('id', id);
    if (error) throw error;
  }
};

// ── BIOBANKS ───────────────────────────────
export const biobanks = {
  // List all biobanks with ratings
  async list() {
    const { data, error } = await supabase
      .from('biobanks')
      .select(`
        *,
        biobank_ratings (avg_rating, review_count),
        samples (count)
      `);
    if (error) throw error;
    return data;
  },

  // Get biobank with its samples
  async get(id) {
    const { data, error } = await supabase
      .from('biobanks')
      .select(`
        *,
        biobank_ratings (avg_rating, review_count),
        samples (*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Get biobank owned by current user
  async getMine() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('biobanks')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    if (error) throw error;
    return data;
  },

  // Update biobank
  async update(id, updates) {
    const { data, error } = await supabase
      .from('biobanks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// ── REQUESTS ───────────────────────────────
export const requests = {
  // Create a sample request
  async create({ sampleId, biobankId, quantity, message }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('requests')
      .insert({
        researcher_id: user.id,
        sample_id: sampleId,
        biobank_id: biobankId,
        quantity,
        message,
        status: 'pending'
      })
      .select()
      .maybeSingle();
    if (error) throw error;

    // Auto-create a thread (non-blocking, don't fail if this errors)
    try {
      await threads.create({
        biobankId,
        sampleId,
        requestId: data?.id,
        firstMessage: message
      });
    } catch (e) { console.log("Thread creation skipped:", e); }

    return data;
  },

  // Get researcher's requests
  async listMine() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('requests')
      .select('*, samples(*), biobanks(name, location)')
      .eq('researcher_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get requests for a biobank
  async listForBiobank(biobankId) {
    const { data, error } = await supabase
      .from('requests')
      .select('*, samples(*), profiles!researcher_id(name, institution)')
      .eq('biobank_id', biobankId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Update request status (biobank)
  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Subscribe to request updates (realtime)
  subscribeToUpdates(callback) {
    return supabase
      .channel('request-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, callback)
      .subscribe();
  }
};

// ── THREADS & MESSAGES ─────────────────────
export const threads = {
  // Create a thread
  async create({ biobankId, sampleId, requestId, firstMessage }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: thread, error } = await supabase
      .from('threads')
      .insert({
        researcher_id: user.id,
        biobank_id: biobankId,
        sample_id: sampleId,
        request_id: requestId,
        last_message: firstMessage?.slice(0, 100),
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;

    // Send first message if provided
    if (firstMessage) {
      const profile = await auth.getProfile();
      await messages.send({
        threadId: thread.id,
        text: firstMessage,
        senderName: profile.name
      });
    }
    return thread;
  },

  // List user's threads
  async listMine() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = await auth.getProfile();

    let query;
    if (profile.role === 'researcher') {
      query = supabase
        .from('threads')
        .select('*, biobanks(name), samples(disease, subtype)')
        .eq('researcher_id', user.id);
    } else {
      const biobank = await biobanks.getMine();
      query = supabase
        .from('threads')
        .select('*, profiles!researcher_id(name), samples(disease, subtype)')
        .eq('biobank_id', biobank.id);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

export const messages = {
  // Send a message
  async send({ threadId, text, senderName }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_name: senderName,
        text
      })
      .select()
      .single();
    if (error) throw error;

    // Update thread's last message
    await supabase
      .from('threads')
      .update({ last_message: text.slice(0, 100), last_message_at: new Date().toISOString() })
      .eq('id', threadId);

    return data;
  },

  // Get messages for a thread
  async listByThread(threadId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  // Subscribe to new messages (realtime)
  subscribeToThread(threadId, callback) {
    return supabase
      .channel(`messages:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, callback)
      .subscribe();
  }
};

// ── FAVORITES ──────────────────────────────
export const favorites = {
  // Get user's favorites
  async list() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('favorites')
      .select('*, samples(*, biobanks(name, location, verified))')
      .eq('user_id', user.id);
    if (error) throw error;
    return data;
  },

  // Toggle favorite
  async toggle(sampleId) {
    const { data: { user } } = await supabase.auth.getUser();

    // Check if already favorited
    const { data: rows } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('sample_id', sampleId);

    if (rows && rows.length > 0) {
      await supabase.from('favorites').delete().eq('id', rows[0].id);
      return false; // removed
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, sample_id: sampleId });
      return true; // added
    }
  }
};
