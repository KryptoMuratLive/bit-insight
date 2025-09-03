import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VolumeNode {
  price: number;
  volume: number;
  percentage: number;
  classification: string;
}

interface VolumeProfileAnalysis {
  volumeProfile: VolumeNode[];
  pocLevel: VolumeNode;
  valueAreaHigh: number;
  valueAreaLow: number;
  valueAreaVolume: number;
  highVolumeNodes: VolumeNode[];
  lowVolumeNodes: VolumeNode[];
  analysis: {
    marketStructure: string;
    supportResistance: string[];
    recommendation: string;
    confidence: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe } = await req.json();
    
    console.log('Volume Profile Analysis request:', { symbol, timeframe });

    // Fetch kline data from Binance
    const interval = timeframe || '1h';
    const limit = 500; // More data for better volume analysis
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const klines = await response.json();
    const candles = klines.map((k: any) => ({
      t: parseInt(k[0]),
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5])
    }));

    // Enhanced Volume Profile Analysis
    const maxPrice = Math.max(...candles.map((c: any) => c.h));
    const minPrice = Math.min(...candles.map((c: any) => c.l));
    const priceStep = (maxPrice - minPrice) / 100; // More granular analysis
    
    const volumeByPrice: Record<number, number> = {};
    
    // More sophisticated volume distribution
    candles.forEach((candle: any) => {
      const priceRange = candle.h - candle.l;
      const volumePerTick = candle.v / (priceRange / priceStep || 1);
      
      // Distribute volume across price range using OHLC weighting
      const prices = [
        candle.o * 0.25,
        candle.h * 0.15,
        candle.l * 0.15,
        candle.c * 0.45 // Close price gets highest weight
      ];
      
      prices.forEach(weightedPrice => {
        const priceLevel = Math.floor((weightedPrice - minPrice) / priceStep) * priceStep + minPrice;
        volumeByPrice[priceLevel] = (volumeByPrice[priceLevel] || 0) + (volumePerTick * 0.25);
      });
    });
    
    const totalVolume = Object.values(volumeByPrice).reduce((sum, vol) => sum + vol, 0);
    
    const volumeProfile: VolumeNode[] = Object.entries(volumeByPrice)
      .map(([price, volume]) => {
        const percentage = (volume / totalVolume) * 100;
        let classification = 'Normal';
        
        if (percentage > 3) classification = 'High Volume Node (HVN)';
        else if (percentage < 0.5) classification = 'Low Volume Node (LVN)';
        
        return {
          price: parseFloat(price),
          volume,
          percentage,
          classification
        };
      })
      .sort((a, b) => b.price - a.price);

    // Find Point of Control (POC)
    const pocLevel = volumeProfile.reduce((max, curr) => 
      curr.volume > max.volume ? curr : max, volumeProfile[0]);

    // Calculate Value Area (70% of volume)
    const sortedByVolume = [...volumeProfile].sort((a, b) => b.volume - a.volume);
    let valueAreaVolume = 0;
    const valueAreaNodes = [];
    const targetVolume = totalVolume * 0.7;
    
    for (const node of sortedByVolume) {
      if (valueAreaVolume < targetVolume) {
        valueAreaNodes.push(node);
        valueAreaVolume += node.volume;
      }
    }
    
    const valueAreaPrices = valueAreaNodes.map(n => n.price);
    const valueAreaHigh = Math.max(...valueAreaPrices);
    const valueAreaLow = Math.min(...valueAreaPrices);

    // Identify HVNs and LVNs
    const highVolumeNodes = volumeProfile.filter(n => n.percentage > 2.5);
    const lowVolumeNodes = volumeProfile.filter(n => n.percentage < 0.8);

    // Current price analysis
    const currentPrice = candles[candles.length - 1].c;
    const priceRelativeToVA = currentPrice > valueAreaHigh ? 'above' : 
                             currentPrice < valueAreaLow ? 'below' : 'within';

    // Market structure analysis
    let marketStructure = 'Balanced';
    if (priceRelativeToVA === 'above') {
      marketStructure = 'Bullish - Price above Value Area';
    } else if (priceRelativeToVA === 'below') {
      marketStructure = 'Bearish - Price below Value Area';
    }

    // Support/Resistance levels
    const supportResistance = [];
    supportResistance.push(`POC Level: $${pocLevel.price.toFixed(2)} (Strong S/R)`);
    supportResistance.push(`Value Area High: $${valueAreaHigh.toFixed(2)}`);
    supportResistance.push(`Value Area Low: $${valueAreaLow.toFixed(2)}`);
    
    highVolumeNodes.slice(0, 3).forEach(hvn => {
      supportResistance.push(`HVN: $${hvn.price.toFixed(2)} (${hvn.percentage.toFixed(1)}% volume)`);
    });

    // Trading recommendation
    let recommendation = '';
    let confidence = 50;
    
    if (priceRelativeToVA === 'above' && currentPrice > pocLevel.price) {
      recommendation = 'Bullish bias - Price above POC and Value Area. Look for pullbacks to Value Area for long entries.';
      confidence = 75;
    } else if (priceRelativeToVA === 'below' && currentPrice < pocLevel.price) {
      recommendation = 'Bearish bias - Price below POC and Value Area. Look for rallies to Value Area for short entries.';
      confidence = 75;
    } else if (priceRelativeToVA === 'within') {
      recommendation = 'Range-bound - Price within Value Area. Trade between VA High and VA Low.';
      confidence = 60;
    }

    const analysis: VolumeProfileAnalysis = {
      volumeProfile: volumeProfile.slice(0, 30), // Top 30 levels
      pocLevel,
      valueAreaHigh,
      valueAreaLow,
      valueAreaVolume,
      highVolumeNodes,
      lowVolumeNodes,
      analysis: {
        marketStructure,
        supportResistance,
        recommendation,
        confidence
      }
    };

    console.log('Volume Profile Analysis completed:', {
      symbol,
      pocPrice: pocLevel.price,
      valueArea: `${valueAreaLow.toFixed(2)} - ${valueAreaHigh.toFixed(2)}`,
      confidence
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in volume-profile-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      volumeProfile: [],
      analysis: {
        marketStructure: 'Error',
        supportResistance: [],
        recommendation: 'Unable to analyze due to error',
        confidence: 0
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});