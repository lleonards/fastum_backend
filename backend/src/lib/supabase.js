const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias!')
  process.exit(1)
}

// Cliente base (NÃO usa service_role). Para queries, use um cliente "por request"
// com Authorization: Bearer <access_token> para o RLS funcionar.
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  }
})

// Helper: cria um client que aplica RLS via JWT do usuário
function createSupabaseForRequest(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  })
}

module.exports = { supabase, createSupabaseForRequest }
