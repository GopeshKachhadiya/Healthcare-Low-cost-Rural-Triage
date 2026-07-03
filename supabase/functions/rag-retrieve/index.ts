// Supabase Edge Function: rag-retrieve
// Called by: n8n Vector Store node OR patient/doctor RAG chat
// Performs: pgvector cosine similarity search on rag_documents

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

serve(async (req) => {
  try {
    const { query, language_code, top_k = 5 } = await req.json();

    // ─── Step 1: Embed query via OpenRouter (text-embedding-3-small) ─────────
    const embeddingResp = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: query
      })
    });

    const embeddingData = await embeddingResp.json();
    const queryEmbedding = embeddingData?.data?.[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("Failed to generate embedding for query");
    }

    // ─── Step 2: pgvector similarity search ──────────────────────────────────
    const { data: passages, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: top_k * 4,  // retrieve extra for reranking
      filter_language: language_code || null
    });

    if (error) throw error;

    // ─── Step 3: Return top passages ─────────────────────────────────────────
    const topPassages = (passages || []).slice(0, top_k).map((p: Record<string, unknown>) => ({
      id: p.id,
      source: p.source,
      content: p.content,
      similarity: p.similarity,
      language_code: p.language_code
    }));

    return new Response(JSON.stringify({
      success: true,
      passages: topPassages,
      query,
      count: topPassages.length
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
