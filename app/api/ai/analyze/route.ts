/**
 * API Route: Analyze Face
 * Converted from Supabase Edge Function: analyze-face
 * 
 * Handles face/dental analysis and smile validation using Google Gemini API.
 * Modes: 'validate' (pre-check) and 'analyze' (full analysis with prompts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image_base64, image_path, mode = 'analyze' } = body;

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        // Get image data
        let imageBase64 = image_base64;

        if (!imageBase64 && image_path) {
            // Download from storage
            const buffer = await storage.downloadFileAsBuffer('uploads', image_path);
            imageBase64 = buffer.toString('base64');
        }

        if (!imageBase64) {
            throw new Error('No image data provided');
        }

        // Choose prompt based on mode
        const prompt = mode === 'validate'
            ? getValidationPrompt()
            : getAnalysisPrompt();

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: imageBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error:', errText);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();

        // Extract text from response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('No response from Gemini');
        }

        // Parse JSON response
        const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

        // If analysis mode, store result
        if (mode === 'analyze') {
            const analysisRow = await db.insertReturning(
                `INSERT INTO analysis_results (lead_id, result)
                 VALUES ($1, $2)
                 RETURNING id`,
                [null, JSON.stringify(result)]
            );
            result.analysis_id = analysisRow.id;
        }

        return NextResponse.json(result, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[analyze-face] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 400 }
        );
    }
}

function getValidationPrompt(): string {
    return `You are a dental imaging pre-validator. Analyze this image and respond with JSON:
{
  "is_valid": boolean,
  "rejection_reason": string (empty if valid)
}

Rules:
- Image must contain a clear human face
- Face must be reasonably well-lit
- Mouth/teeth should be at least partially visible
- No cartoon/AI-generated faces
- Reject blurry, dark, or non-face images`;
}

function getAnalysisPrompt(): string {
    return `You are an expert dental aesthetics AI. Analyze this dental/smile photo and provide a comprehensive analysis.

Return a JSON object with this structure:
{
  "dental_analysis": {
    "overall_score": number (1-10),
    "symmetry": string,
    "color": string,
    "alignment": string,
    "gum_health": string,
    "missing_teeth": boolean,
    "recommendations": [string]
  },
  "variations": [
    {
      "type": "original_bg",
      "name": "Natural Enhancement", 
      "description": "Subtle, natural-looking smile improvement",
      "prompt_data": {
        "Subject": "A detailed description of the ideal smile enhancement for this specific face, maintaining the same background and lighting. Focus on natural tooth alignment, whitening, and proportional adjustments."
      }
    }
  ]
}

Be specific about the dental observations and provide actionable improvement suggestions.`;
}
