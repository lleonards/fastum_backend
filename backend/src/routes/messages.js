const express = require('express')
const router = express.Router()
const { supabase: supabasePublic } = require('../lib/supabase')
const authMiddleware = require('../middleware/auth')
const { nanoid } = require('nanoid')

// GET /api/messages — Lista mensagens do usuário logado
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Com RLS, não precisa filtrar por user_id; o banco já garante.
    const { data, error } = await req.supabase
      .from('messages')
      .select('*, message_photos(id, photo_url, order_index)')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ messages: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/view/:slug — Pega mensagem pública por slug (sem auth)
router.get('/view/:slug', async (req, res) => {
  try {
    const { slug } = req.params

    // RPC SECURITY DEFINER (retorna apenas os campos necessários)
    const { data, error } = await supabasePublic
      .rpc('get_message_by_slug', { p_slug: slug })

    if (error || !data?.message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' })
    }

    res.json({ message: data.message, photos: data.photos || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/:id — Pega uma mensagem do usuário
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('messages')
      .select('*, message_photos(id, photo_url, order_index)')
      .eq('id', req.params.id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Mensagem não encontrada' })
    res.json({ message: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/messages — Cria nova mensagem
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      theme,
      message_text,
      font_family,
      font_size,
      text_color,
      paper_color,
      paper_design,
      ribbon_color,
      box_color,
      envelope_color,
    } = req.body

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ error: 'O texto da mensagem é obrigatório' })
    }

    const unique_slug = nanoid(10)

    const { data, error } = await req.supabase
      .from('messages')
      .insert({
        user_id: req.user.id,
        title: title || 'Minha Mensagem',
        theme: theme || 'parchment',
        message_text: message_text.trim(),
        font_family: font_family || '"Dancing Script", cursive',
        font_size: font_size || 18,
        text_color: text_color || '#2c1810',
        paper_color: paper_color || 'parchment',
        paper_design: paper_design || 'none',
        ribbon_color: ribbon_color || '#c0392b',
        box_color: box_color || '#c0392b',
        envelope_color: envelope_color || '#d4a0b8',
        unique_slug,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      message: data,
      link: `${process.env.FRONTEND_URL}/m/${unique_slug}`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/messages/:id — Atualiza mensagem
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      title, theme, message_text, font_family,
      font_size, text_color, paper_color, paper_design,
      ribbon_color, box_color, envelope_color
    } = req.body

    const { data, error } = await req.supabase
      .from('messages')
      .update({
        title,
        theme,
        message_text,
        font_family,
        font_size,
        text_color,
        paper_color,
        paper_design,
        ribbon_color,
        box_color,
        envelope_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ message: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/messages/:id — Deleta mensagem
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Primeiro deleta fotos associadas
    const { data: photos } = await req.supabase
      .from('message_photos')
      .select('photo_url')
      .eq('message_id', req.params.id)

    if (photos && photos.length > 0) {
      const paths = photos.map(p => {
        const url = new URL(p.photo_url)
        return url.pathname.split('/message-photos/')[1]
      }).filter(Boolean)

      if (paths.length > 0) {
        await req.supabase.storage.from('message-photos').remove(paths)
      }
    }

    await req.supabase.from('message_photos').delete().eq('message_id', req.params.id)

    const { error } = await req.supabase
      .from('messages')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
