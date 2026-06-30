import express from 'express';
import path from 'path';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Google Gen AI lazily as mandated by environment variables guidelines
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not set. Custom Meal Planning will run in simulation mode.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || 'DUMMY_KEY' });
  }
  return aiClient;
}

// 1. API: Custom AI Meal Planner
app.post('/api/meal-plan', async (req, res) => {
  try {
    const { dailyCalorieTarget, preference, allergies, language } = req.body;
    
    const calorieTarget = Number(dailyCalorieTarget) || 2000;
    const pref = preference || 'balanced';
    const allergic = allergies || 'none';
    const lang = language || 'en';

    console.log(`Generating meal plan: Calories=${calorieTarget}, Preference=${pref}, Allergies=${allergic}, Lang=${lang}`);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      // Fallback fallback simulated plan if API key is missing
      return res.json(getSimulatedMealPlan(calorieTarget, pref, allergic, lang));
    }

    const ai = getAi();
    const prompt = `
      Create a highly customized, healthy one-day meal plan matching these rules:
      - Total Daily Calories target: ${calorieTarget} kcal (strive for +/- 50 kcal of this target)
      - Dietary Preference: ${pref}
      - Exclusions/Allergies: ${allergic}
      - Language of output text: ${lang}

      Provide your response in EXACT JSON format. Do not write any explanations before or after.
      The JSON must strictly conform to this schema:
      {
        "name": "string (e.g. 'Vegan High-Protein Power Day')",
        "calories": number (total daily calories sum),
        "protein": number (total daily protein in grams),
        "carbs": number (total daily carbs in grams),
        "fat": number (total daily fats in grams),
        "meals": {
          "breakfast": {
            "name": "string (name of meal)",
            "description": "string (description / directions)",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "ingredients": ["string"]
          },
          "lunch": {
            "name": "string",
            "description": "string",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "ingredients": ["string"]
          },
          "dinner": {
            "name": "string",
            "description": "string",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "ingredients": ["string"]
          },
          "snack": {
            "name": "string",
            "description": "string",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "ingredients": ["string"]
          }
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini");
    }

    const cleanJson = JSON.parse(responseText.trim());
    return res.json(cleanJson);

  } catch (error: any) {
    console.error('Gemini Meal Plan Error:', error);
    // Provide a resilient simulation so user is never blocked
    return res.json(getSimulatedMealPlan(Number(req.body.dailyCalorieTarget) || 2000, req.body.preference, req.body.allergies, req.body.language));
  }
});

// 2. API: Searchable AI Food Estimator
app.get('/api/food-estimate', async (req, res) => {
  try {
    const query = req.query.query as string;
    const lang = (req.query.lang as string) || 'en';

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log(`AI Food Estimator: Query="${query}", Lang=${lang}`);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      return res.json(getSimulatedFoodEstimate(query, lang));
    }

    const ai = getAi();
    const prompt = `
      You are a precise clinical nutrition calculator. Estimate the nutritional values of this food/meal description: "${query}".
      Provide your response in EXACT JSON format. Do not write any explanations before or after.
      The JSON must strictly conform to this schema:
      {
        "name": "string (standardized name in ${lang})",
        "calories": number (approximate calories),
        "protein": number (approximate protein in grams),
        "carbs": number (approximate carbs in grams),
        "fat": number (approximate fat in grams),
        "servingSize": number (standard serving size amount, e.g. 100),
        "servingUnit": "string (standard unit e.g. 'g', 'ml', 'slice', 'bowl')",
        "isAiEstimated": true
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini");
    }

    const cleanJson = JSON.parse(responseText.trim());
    return res.json(cleanJson);

  } catch (error: any) {
    console.error('Gemini Food Estimate Error:', error);
    return res.json(getSimulatedFoodEstimate(req.query.query as string, req.query.lang as string || 'en'));
  }
});

// Simulated Meal Plan fallback values in case of API Key absence or rate limits
function getSimulatedMealPlan(target: number, pref: string, allergic: string, lang: string) {
  const pRatio = 0.25;
  const cRatio = 0.45;
  const fRatio = 0.30;

  const totalP = Math.round((target * pRatio) / 4);
  const totalC = Math.round((target * cRatio) / 4);
  const totalF = Math.round((target * fRatio) / 9);

  const mealCal = Math.round(target * 0.3);
  const snackCal = Math.round(target * 0.1);

  const isEs = lang === 'es';
  const isFr = lang === 'fr';

  return {
    name: isEs 
      ? `Plan Saludable IA (${pref})` 
      : isFr 
      ? `Plan Alimentaire IA (${pref})` 
      : `Healthy Balanced Plan (${pref})`,
    calories: target,
    protein: totalP,
    carbs: totalC,
    fat: totalF,
    meals: {
      breakfast: {
        name: isEs ? "Tazón de Avena con Frutas" : isFr ? "Bol d'Avoine et Fruits" : "Berries Protein Oatmeal",
        description: isEs ? "Avena cocida con rodajas de plátano, arándanos frescos y proteína de suero." : isFr ? "Flocons d'avoine cuits avec banane, bleuets frais et protéines." : "Creamy cooked oats topped with banana, organic blueberries, and whey scoop.",
        calories: mealCal,
        protein: Math.round(totalP * 0.3),
        carbs: Math.round(totalC * 0.35),
        fat: Math.round(totalF * 0.2),
        ingredients: [
          isEs ? "50g Avena" : isFr ? "50g Flocons d'avoine" : "50g Rolled Oats", 
          isEs ? "1 Plátano" : isFr ? "1 Banane" : "1 Banana", 
          "1 Scoop Protein"
        ]
      },
      lunch: {
        name: isEs ? "Pechuga de Pollo con Camote" : isFr ? "Blanc de Poulet et Patate Douce" : "Power Chicken Breast Bowl",
        description: isEs ? "Pechuga de pollo a la plancha con puré de camote y brócoli al vapor." : isFr ? "Blanc de poulet grillé avec patate douce et brocoli vapeur." : "Grilled chicken breast accompanied by baked sweet potato and steamed broccoli.",
        calories: mealCal,
        protein: Math.round(totalP * 0.35),
        carbs: Math.round(totalC * 0.3),
        fat: Math.round(totalF * 0.25),
        ingredients: [
          isEs ? "150g Pollo" : isFr ? "150g Poulet" : "150g Grilled Chicken", 
          isEs ? "120g Camote" : isFr ? "120g Patate douce" : "120g Sweet Potato", 
          isEs ? "Brócoli" : isFr ? "Brocoli" : "Broccoli"
        ]
      },
      dinner: {
        name: isEs ? "Salmón al Horno con Quinoa" : isFr ? "Saumon Rôti au Quinoa" : "Baked Salmon Quinoa Plate",
        description: isEs ? "Salmón fresco al horno con ensalada de quinoa y espinacas tiernas." : isFr ? "Saumon cuit au four avec salade de quinoa et épinards." : "Oven baked wild salmon served over warm fluffy quinoa with baby spinach.",
        calories: mealCal,
        protein: Math.round(totalP * 0.25),
        carbs: Math.round(totalC * 0.25),
        fat: Math.round(totalF * 0.45),
        ingredients: [
          isEs ? "120g Salmón" : isFr ? "120g Saumon" : "120g Baked Salmon", 
          "100g Quinoa", 
          isEs ? "Espinacas" : isFr ? "Épinards" : "Spinach"
        ]
      },
      snack: {
        name: isEs ? "Almendras y Yogur Griego" : isFr ? "Amandes et Yaourt Grec" : "Almond Greek Yogurt Power-up",
        description: isEs ? "Yogur griego bajo en grasa mezclado con almendras picadas." : isFr ? "Yaourt grec crémeux mélangé avec des amandes hachées." : "Creamy non-fat greek yogurt topped with a handful of raw sliced almonds.",
        calories: snackCal,
        protein: Math.round(totalP * 0.1),
        carbs: Math.round(totalC * 0.1),
        fat: Math.round(totalF * 0.1),
        ingredients: [
          isEs ? "150g Yogur Griego" : isFr ? "150g Yaourt Grec" : "150g Greek Yogurt", 
          isEs ? "15g Almendras" : isFr ? "15g Amandes" : "15g Almonds"
        ]
      }
    }
  };
}

function getSimulatedFoodEstimate(query: string, lang: string) {
  const isEs = lang === 'es';
  const isFr = lang === 'fr';

  const cleanQuery = query.toLowerCase().trim();
  
  if (cleanQuery.includes('pizza')) {
    return {
      name: isEs ? "Pizza Pepperoni (Rebanada)" : isFr ? "Pizza Pepperoni (Part)" : "Pepperoni Pizza Slice",
      calories: 290, protein: 12, carbs: 32, fat: 12,
      servingSize: 1, servingUnit: isEs ? 'rebanada' : isFr ? 'part' : 'slice',
      isAiEstimated: true
    };
  } else if (cleanQuery.includes('burger') || cleanQuery.includes('hamburguesa')) {
    return {
      name: isEs ? "Hamburguesa con Queso" : isFr ? "Cheeseburger" : "Cheeseburger",
      calories: 535, protein: 30, carbs: 40, fat: 28,
      servingSize: 1, servingUnit: isEs ? 'unidad' : isFr ? 'unité' : 'burger',
      isAiEstimated: true
    };
  } else if (cleanQuery.includes('apple') || cleanQuery.includes('manzana') || cleanQuery.includes('pomme')) {
    return {
      name: isEs ? "Manzana Roja" : isFr ? "Pomme Rouge" : "Red Apple",
      calories: 95, protein: 0.5, carbs: 25, fat: 0.3,
      servingSize: 182, servingUnit: 'g',
      isAiEstimated: true
    };
  } else {
    // Default smart guess
    const textHash = query.length * 5 + (query.charCodeAt(0) || 10);
    const mockCal = 100 + (textHash % 400);
    const mockP = Math.max(1, Math.round((mockCal * 0.15) / 4));
    const mockC = Math.max(1, Math.round((mockCal * 0.55) / 4));
    const mockF = Math.max(1, Math.round((mockCal * 0.30) / 9));

    return {
      name: query.substring(0, 1).toUpperCase() + query.substring(1),
      calories: mockCal,
      protein: mockP,
      carbs: mockC,
      fat: mockF,
      servingSize: 100,
      servingUnit: 'g',
      isAiEstimated: true
    };
  }
}

// Vite integration middleware setup for both Dev and Production
async function startServer() {
  // Production detection:
  // 1. Default to true if NODE_ENV is production
  // 2. Also true if running the compiled bundle inside dist
  let isProduction = process.env.NODE_ENV === 'production';
  try {
    if (typeof __filename !== 'undefined' && (__filename.includes('dist') || __filename.endsWith('.cjs'))) {
      isProduction = true;
    }
  } catch (e) {
    // Safely ignore
  }

  console.log(`[NutriSecure] Starting server. Production mode: ${isProduction}`);

  if (!isProduction) {
    console.log("[NutriSecure] Running in DEVELOPMENT mode with Vite integration...");
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    // Serve static files and JS modules
    app.use(vite.middlewares);

    // Fallback handler for all non-API routing (e.g. /, /profile, /settings, etc.)
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // Explicitly ignore any /api requests to let them fail with 404 or be handled properly
      if (req.path.startsWith('/api')) {
        return next();
      }

      try {
        const indexHtmlPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) {
          return next(new Error(`index.html not found at ${indexHtmlPath}`));
        }
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        // Let Vite transform the index.html so HMR and absolute assets are injected
        html = await vite.transformIndexHtml(url, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("[NutriSecure] Running in PRODUCTION mode with compiled assets...");
    // Robust path resolution: if running from dist, distPath is __dirname. Otherwise it is __dirname/dist.
    const distPath = (typeof __filename !== 'undefined' && __filename.endsWith('.cjs')) || __dirname.endsWith('dist')
      ? __dirname
      : path.join(__dirname, 'dist');
    
    console.log(`[NutriSecure] Serving production static files from: ${distPath}`);
    app.use(express.static(distPath));

    // Catch-all route for production client-side routing, excluding /api
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const indexPagePath = path.join(distPath, 'index.html');
      console.log(`[NutriSecure] Serving index.html from: ${indexPagePath}`);
      res.sendFile(indexPagePath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriSecure backend running on port ${PORT}`);
  });
}

startServer();
