
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET_NAME = 'sitemaps'
const SITEMAP_PATH = 'sitemap.xml'

serve(async (req) => {
  const { method } = req

  if (method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    if (method === 'POST') {
      const { data: { user } } = await supabaseAdmin.auth.getUser()
      if (!user) {
        return new Response('Unauthorized', { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } })
      }

      const sitemapContent = await req.text()

      const { error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(SITEMAP_PATH, sitemapContent, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/xml; charset=utf-8',
        })

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ message: 'Sitemap actualizado con éxito.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      })
    }

    if (method === 'GET') {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(SITEMAP_PATH)
      if (error) {
        return new Response('Sitemap not found.', { status: 404 })
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        status: 200,
      })
    }

    return new Response('Method Not Allowed', { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    })
  }
})
