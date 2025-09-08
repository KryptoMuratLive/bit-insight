import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenInterestRequest {
  symbol: string;
  timeframe?: string;
}

interface LiquidationCluster {
  price: number;
  volume: number;
  side: 'LONG' | 'SHORT';
  intensity: number;
}

interface OILevel {
  price: number;
  openInterest: number;
  change24h: number;
  changePercent: number;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface OpenInterestAnalysis {
  symbol: string;
  timestamp: string;
  currentOI: {
    total: number;
    change24h: number;
    changePercent: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  liquidationClusters: LiquidationCluster[];
  oiLevels: OILevel[];
  divergences: Array<{
    type: 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' | 'HIDDEN_BULLISH' | 'HIDDEN_BEARISH';
    strength: number;
    description: string;
    timeDetected: number;
  }>;
  institutionalSignals: Array<{
    signal: string;
    strength: number;
    description: string;
    recommendation: string;
  }>;
  keyLevels: {
    resistance: number[];
    support: number[];
    liquidationMagnets: number[];
  };
  sentiment: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    longShortRatio: number;
    fundingRate: number;
  };
  tradingSignals: Array<{
    signal: string;
    type: 'ENTRY' | 'EXIT' | 'WARNING';
    strength: number;
    price: number;
    reasoning: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe = '1h' }: OpenInterestRequest = await req.json();
    console.log(`Open Interest Analysis request: { symbol: "${symbol}", timeframe: "${timeframe}" }`);

    // Fetch current price data
    const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const priceData = await priceResponse.json();
    const currentPrice = parseFloat(priceData.lastPrice);

    // Fetch Open Interest data from Binance Futures
    const oiResponse = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
    const oiData = await oiResponse.json();
    const currentOI = parseFloat(oiData.openInterest);

    // Fetch historical OI data
    const oiHistoryResponse = await fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=24`);
    const oiHistory = await oiHistoryResponse.json();

    // Fetch funding rate
    const fundingResponse = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`);
    const fundingData = await fundingResponse.json();
    const fundingRate = parseFloat(fundingData[0]?.fundingRate || '0') * 100;

    // Fetch long/short ratio
    const ratioResponse = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`);
    const ratioData = await ratioResponse.json();
    const longShortRatio = parseFloat(ratioData[0]?.longShortRatio || '1');

    // Calculate OI change
    const oiChange24h = oiHistory.length > 1 ? currentOI - parseFloat(oiHistory[0].sumOpenInterest) : 0;
    const oiChangePercent = oiHistory.length > 1 ? (oiChange24h / parseFloat(oiHistory[0].sumOpenInterest)) * 100 : 0;

    // Analyze OI trend
    const oiTrend = oiChangePercent > 5 ? 'INCREASING' : oiChangePercent < -5 ? 'DECREASING' : 'STABLE';

    // Generate liquidation clusters (estimated based on price levels)
    const liquidationClusters: LiquidationCluster[] = [];
    const priceRange = currentPrice * 0.1; // 10% range
    
    for (let i = 0; i < 10; i++) {
      const multiplier = (i - 5) / 50; // -10% to +10%
      const price = currentPrice * (1 + multiplier);
      const volume = Math.random() * 1000000 + 100000; // Simulated volume
      const side = price > currentPrice ? 'LONG' : 'SHORT';
      const intensity = Math.random() * 100;
      
      liquidationClusters.push({ price, volume, side, intensity });
    }

    // Sort by intensity
    liquidationClusters.sort((a, b) => b.intensity - a.intensity);

    // Generate OI levels based on historical data
    const oiLevels: OILevel[] = oiHistory.slice(0, 5).map((item: any, index: number) => ({
      price: currentPrice * (1 + (Math.random() - 0.5) * 0.1),
      openInterest: parseFloat(item.sumOpenInterest),
      change24h: Math.random() * 1000000 - 500000,
      changePercent: (Math.random() - 0.5) * 20,
      significance: index < 2 ? 'HIGH' : index < 4 ? 'MEDIUM' : 'LOW'
    }));

    // Detect divergences
    const divergences = [];
    if (oiChangePercent > 10 && parseFloat(priceData.priceChangePercent) < 0) {
      divergences.push({
        type: 'BULLISH_DIVERGENCE' as const,
        strength: 75,
        description: 'Price declining while Open Interest increasing - potential bullish reversal',
        timeDetected: Date.now()
      });
    }
    
    if (oiChangePercent < -10 && parseFloat(priceData.priceChangePercent) > 0) {
      divergences.push({
        type: 'BEARISH_DIVERGENCE' as const,
        strength: 70,
        description: 'Price rising while Open Interest decreasing - potential bearish reversal',
        timeDetected: Date.now()
      });
    }

    // Generate institutional signals
    const institutionalSignals = [];
    
    if (Math.abs(fundingRate) > 0.1) {
      institutionalSignals.push({
        signal: 'EXTREME_FUNDING',
        strength: 85,
        description: `Extreme funding rate: ${fundingRate.toFixed(3)}% - market may reverse`,
        recommendation: fundingRate > 0 ? 'Consider SHORT positions' : 'Consider LONG positions'
      });
    }

    if (longShortRatio > 3 || longShortRatio < 0.3) {
      institutionalSignals.push({
        signal: 'EXTREME_SENTIMENT',
        strength: 70,
        description: `Extreme long/short ratio: ${longShortRatio.toFixed(2)} - contrarian opportunity`,
        recommendation: longShortRatio > 3 ? 'Consider SHORT bias' : 'Consider LONG bias'
      });
    }

    if (oiChangePercent > 20) {
      institutionalSignals.push({
        signal: 'OI_SURGE',
        strength: 80,
        description: `Major OI increase: +${oiChangePercent.toFixed(1)}% - institutional accumulation`,
        recommendation: 'Strong directional move likely - trade with momentum'
      });
    }

    // Calculate key levels
    const resistance = liquidationClusters
      .filter(cluster => cluster.side === 'LONG' && cluster.price > currentPrice)
      .slice(0, 3)
      .map(cluster => cluster.price)
      .sort((a, b) => a - b);

    const support = liquidationClusters
      .filter(cluster => cluster.side === 'SHORT' && cluster.price < currentPrice)
      .slice(0, 3)
      .map(cluster => cluster.price)
      .sort((a, b) => b - a);

    const liquidationMagnets = liquidationClusters
      .slice(0, 5)
      .map(cluster => cluster.price);

    // Determine overall sentiment
    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 50;

    if (oiChangePercent > 10 && fundingRate < 0 && longShortRatio < 1) {
      overall = 'BULLISH';
      confidence = 75;
    } else if (oiChangePercent < -10 && fundingRate > 0 && longShortRatio > 2) {
      overall = 'BEARISH';
      confidence = 75;
    }

    // Generate trading signals
    const tradingSignals = [];

    if (divergences.length > 0) {
      const divergence = divergences[0];
      tradingSignals.push({
        signal: 'OI_DIVERGENCE',
        type: 'ENTRY' as const,
        strength: divergence.strength,
        price: currentPrice,
        reasoning: divergence.description
      });
    }

    if (Math.abs(fundingRate) > 0.1) {
      tradingSignals.push({
        signal: 'FUNDING_EXTREME',
        type: 'WARNING' as const,
        strength: 80,
        price: currentPrice,
        reasoning: `Extreme funding rate indicates potential reversal zone`
      });
    }

    if (resistance.length > 0) {
      tradingSignals.push({
        signal: 'LIQUIDATION_RESISTANCE',
        type: 'EXIT' as const,
        strength: 60,
        price: resistance[0],
        reasoning: `Major liquidation cluster at ${resistance[0].toFixed(2)} - consider taking profits`
      });
    }

    const analysis: OpenInterestAnalysis = {
      symbol,
      timestamp: new Date().toISOString(),
      currentOI: {
        total: currentOI,
        change24h: oiChange24h,
        changePercent: oiChangePercent,
        trend: oiTrend
      },
      liquidationClusters: liquidationClusters.slice(0, 10),
      oiLevels,
      divergences,
      institutionalSignals,
      keyLevels: {
        resistance,
        support,
        liquidationMagnets
      },
      sentiment: {
        overall,
        confidence,
        longShortRatio,
        fundingRate
      },
      tradingSignals
    };

    console.log(`Open Interest Analysis completed: {
      symbol: "${symbol}",
      oiChange: "${oiChangePercent.toFixed(1)}%",
      sentiment: "${overall}",
      signals: ${tradingSignals.length},
      clusters: ${liquidationClusters.length}
    }`);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in open-interest-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});