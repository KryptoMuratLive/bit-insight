import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe, features } = await req.json();
    
    console.log('AI Inference request:', { symbol, timeframe, features });

    // Prepare the prompt for OpenAI to analyze trading signals
    const prompt = `
You are an advanced trading AI that analyzes market conditions and provides trading scores.

Analyze these market features for ${symbol} on ${timeframe} timeframe:
- Last Price: ${features.lastPrice}
- ATR (Average True Range): ${features.atr}
- ADX (Average Directional Index): ${features.adx}
- Order Book Imbalance: ${features.obImb}
- Liquidity Near Price: ${features.liqNear}

Based on these technical indicators, provide a trading confidence score between 0-100 where:
- 0-20: Very bearish/avoid trading
- 21-40: Bearish lean
- 41-60: Neutral/sideways
- 61-80: Bullish lean  
- 81-100: Very bullish/strong signal

Consider:
- ADX > 25 indicates strong trend
- ATR shows volatility levels
- Order book imbalance shows buying/selling pressure
- Liquidity near price affects slippage

Respond ONLY with a JSON object in this exact format:
{
  "score": [number between 0-100],
  "confidence": "[low/medium/high]",
  "signal": "[bearish/neutral/bullish]",
  "reasoning": "[brief explanation max 2 sentences]"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise trading analysis AI. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    const aiResponse = data.choices[0].message.content;
    console.log('AI analysis:', aiResponse);

    // Parse the JSON response from OpenAI
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback analysis based on technical indicators
      const atrPercent = (features.atr / features.lastPrice) * 100;
      const score = Math.max(0, Math.min(100, 
        (features.adx > 25 ? 25 : features.adx) + 
        (Math.abs(features.obImb) * 30) + 
        (atrPercent > 1 ? 25 : atrPercent * 25) + 
        (features.liqNear > 0 ? 20 : 0)
      ));
      
      analysisResult = {
        score: Math.round(score),
        confidence: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
        signal: score > 60 ? 'bullish' : score < 40 ? 'bearish' : 'neutral',
        reasoning: 'Technical analysis based on ADX, ATR, and order flow indicators.'
      };
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-inference function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      score: 50,
      confidence: 'low',
      signal: 'neutral',
      reasoning: 'Error occurred during analysis'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});