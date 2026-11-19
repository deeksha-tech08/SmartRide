import google.generativeai as genai
import logging
from app.config import settings

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

async def generate_fare_explanation(distance: float, total_fare: float, base_fare: float, rate_per_km: float) -> str:
    """Generate a natural language explanation of the fare using Gemini, with a deterministic fallback."""
    fallback_msg = f"Your fare is ₹{total_fare}. This includes a base fare of ₹{base_fare} plus ₹{rate_per_km}/km for the {distance}km distance."
    
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured. Using fallback fare explanation.")
        return fallback_msg
        
    prompt = (
        "You are the SmartRide AI assistant. A passenger is booking a ride. "
        f"The total distance is {distance} km. The calculated total fare is ₹{total_fare}. "
        f"(This includes a base fare of ₹{base_fare} and a rate of ₹{rate_per_km}/km). "
        "Explain this fare breakdown to the passenger in 2-3 friendly, concise sentences. Do not use markdown."
    )
    
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return fallback_msg
