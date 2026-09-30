import time
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

from model import predictor

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("emergencyai-ai-service")

# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EmergencyAI Severity Prediction Service...")
    predictor.initialize()
    logger.info("AI Service ready")
    yield
    logger.info("Shutting down AI Service")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EmergencyAI Severity Prediction Service",
    description="AI-powered emergency severity prediction using Random Forest classifier. Predicts severity level (low/medium/high/critical) based on incident characteristics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request/Response Models ──────────────────────────────────────────────────
class PredictRequest(BaseModel):
    incident_type: str = Field(..., description="Type of incident", example="medical")
    victim_count: int = Field(default=1, ge=1, le=500, description="Number of victims")
    age: int = Field(default=30, ge=1, le=120, description="Age of primary victim")
    is_highway: bool = Field(default=False, description="Whether incident is on a highway")
    hour_of_day: int = Field(default=12, ge=0, le=23, description="Hour of day (0-23)")

    @validator("incident_type")
    def validate_incident_type(cls, v):
        valid_types = ["medical", "accident", "fire", "natural_disaster", "crime"]
        v = v.lower().strip()
        if v not in valid_types:
            raise ValueError(f"incident_type must be one of: {', '.join(valid_types)}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "incident_type": "accident",
                "victim_count": 3,
                "age": 35,
                "is_highway": True,
                "hour_of_day": 23,
            }
        }


class Probabilities(BaseModel):
    low: float
    medium: float
    high: float
    critical: float


class PredictResponse(BaseModel):
    severity: str
    confidence: float
    recommendation: str
    probabilities: Probabilities
    processing_time_ms: float
    model_version: str = "1.0.0"


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
    uptime_seconds: float


# ─── Startup time ─────────────────────────────────────────────────────────────
_start_time = time.time()

# ─── Request logging middleware ───────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} [{duration:.1f}ms]")
    return response

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check service health and model status."""
    return HealthResponse(
        status="ok",
        model_loaded=predictor.is_loaded,
        version="1.0.0",
        uptime_seconds=round(time.time() - _start_time, 2),
    )


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_severity(request: PredictRequest):
    """
    Predict emergency severity level based on incident characteristics.
    
    Returns severity (low/medium/high/critical), confidence score, 
    recommendation text, and probability distribution across all levels.
    """
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="AI model not loaded. Service initializing.")

    start_time = time.time()

    try:
        result = predictor.predict(
            incident_type=request.incident_type,
            victim_count=request.victim_count,
            age=request.age,
            is_highway=request.is_highway,
            hour_of_day=request.hour_of_day,
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    processing_time_ms = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"Prediction: {request.incident_type} | victims={request.victim_count} | "
        f"age={request.age} | highway={request.is_highway} | hour={request.hour_of_day} "
        f"→ {result['severity']} ({result['confidence']:.1%}) [{processing_time_ms}ms]"
    )

    return PredictResponse(
        severity=result["severity"],
        confidence=result["confidence"],
        recommendation=result["recommendation"],
        probabilities=Probabilities(**result["probabilities"]),
        processing_time_ms=processing_time_ms,
    )


@app.get("/model/info", tags=["Model"])
async def model_info():
    """Get model metadata including feature importances and accuracy."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    return {
        "model_type": "RandomForestClassifier",
        "accuracy": round(predictor.accuracy, 4) if predictor.accuracy else "Not available (loaded from cache)",
        "feature_importances": predictor.feature_importances,
        "classes": ["low", "medium", "high", "critical"],
        "features": predictor.feature_names,
        "training_report": predictor.report or "Not available (loaded from cache)",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "EmergencyAI Severity Prediction Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


# ─── Exception Handlers ───────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": f"Endpoint {request.url.path} not found"})


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
