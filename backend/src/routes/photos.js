const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const authMiddleware = require('../middleware/auth')
const { nanoid } = require('nanoid')

// POST /api/photos — Adiciona foto a uma mensagem (registra na tabela após upload no frontend)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message_id, photo_url, order_index } = req.body

    if (!message_id || !photo_url) {
      return res.status(400).json({ error: 'message_id e photo_url são obrigatórios' })
    }

    // Verifica se a mensagem pertence ao usuário
    const { data: msg } = await supabase
      .from('messages')
      .select('id')
      .eq('id', message_id)
      .eq('user_id', req.user.id)
      .single()

    if (!msg) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { data, error } = await supabase
      .from('message_photos')
      .insert({ message_id, photo_url, order_index: order_index || 0 })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ photo: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/photos/:id — Remove foto
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Verifica propriedade via join
    const { data: photo } = await supabase
      .from('message_photos')
      .select('id, photo_url, message_id, messages(user_id)')
      .eq('id', req.params.id)
      .single()

    if (!photo || photo.messages?.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Remove do storage
    try {
      const url = new URL(photo.photo_url)
      const path = url.pathname.split('/message-photos/')[1]
      if (path) await supabase.storage.from('message-photos').remove([path])
    } catch (_) { /* ignora erro de URL inválida */ }

    const { error } = await supabase
      .from('message_photos')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/photos/reorder — Reordena fotos
router.put('/reorder', authMiddleware, async (req, res) => {
  try {
    const { photos } = req.body // Array de { id, order_index }
    if (!Array.isArray(photos)) {
      return res.status(400).json({ error: 'Formato inválido' })
    }

    for (const photo of photos) {
      await supabase
        .from('message_photos')
        .update({ order_index: photo.order_index })
        .eq('id', photo.id)
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
