const { supabase, createSupabaseForRequest } = require('../lib/supabase')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    // user + client com RLS aplicado
    req.user = user
    req.accessToken = token
    req.supabase = createSupabaseForRequest(token)

    next()
  } catch (_err) {
    return res.status(401).json({ error: 'Erro na autenticação' })
  }
}

module.exports = authMiddleware
