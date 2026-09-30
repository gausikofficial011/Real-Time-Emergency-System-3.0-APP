import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from typing import Tuple, Dict

MODEL_PATH = "severity_model.pkl"

INCIDENT_TYPE_MAP = {
    "medical": 0,
    "accident": 1,
    "fire": 2,
    "natural_disaster": 3,
    "crime": 4,
}

SEVERITY_MAP = {0: "low", 1: "medium", 2: "high", 3: "critical"}
SEVERITY_REVERSE_MAP = {"low": 0, "medium": 1, "high": 2, "critical": 3}

RECOMMENDATIONS = {
    "critical": "🚨 CRITICAL: Dispatch critical care unit immediately. Alert Level-1 trauma center. Activate mass casualty protocol if needed.",
    "high": "⚠️ HIGH: Dispatch advanced life support unit urgently. Prepare emergency room. Notify on-call specialists.",
    "medium": "🔶 MEDIUM: Dispatch standard ambulance with basic life support. Monitor vital signs en route.",
    "low": "✅ LOW: Schedule transport when available. Basic first aid advice provided. Monitor patient status.",
}


def generate_training_data() -> Tuple[np.ndarray, np.ndarray]:
    """Generate synthetic training data covering all incident types and edge cases."""
    np.random.seed(42)
    n_samples = 2000
    X, y = [], []

    for _ in range(n_samples):
        incident_type = np.random.choice(list(INCIDENT_TYPE_MAP.values()))
        victim_count = np.random.randint(1, 51)
        age = np.random.randint(1, 91)
        is_highway = int(np.random.random() > 0.6)
        hour_of_day = np.random.randint(0, 24)
        hour_sin = np.sin(2 * np.pi * hour_of_day / 24)
        hour_cos = np.cos(2 * np.pi * hour_of_day / 24)

        # Rule-based severity with noise
        severity_score = 0.0

        # Incident type base scores
        base_scores = {0: 1.5, 1: 2.0, 2: 2.5, 3: 2.0, 4: 1.0}  # medical, accident, fire, disaster, crime
        severity_score += base_scores.get(incident_type, 1.0)

        # Victim count
        if victim_count >= 10:
            severity_score += 1.5
        elif victim_count >= 5:
            severity_score += 1.0
        elif victim_count >= 3:
            severity_score += 0.5

        # Age (very young or very old are more vulnerable)
        if age < 5 or age > 75:
            severity_score += 0.8
        elif age < 12 or age > 60:
            severity_score += 0.4

        # Highway incidents
        if is_highway:
            severity_score += 0.8

        # Night time (22:00 - 05:00) is more dangerous
        if hour_of_day >= 22 or hour_of_day <= 5:
            severity_score += 0.4

        # Add noise
        severity_score += np.random.normal(0, 0.5)

        # Map to severity label
        if severity_score < 1.5:
            label = 0  # low
        elif severity_score < 2.5:
            label = 1  # medium
        elif severity_score < 3.5:
            label = 2  # high
        else:
            label = 3  # critical

        label = max(0, min(3, label))

        X.append([incident_type, victim_count, age, is_highway, hour_of_day, hour_sin, hour_cos])
        y.append(label)

    # Add specific edge cases
    # Mass casualty events -> critical
    for _ in range(100):
        X.append([np.random.randint(0, 5), np.random.randint(20, 51), np.random.randint(20, 60), 1, 23, np.sin(2*np.pi*23/24), np.cos(2*np.pi*23/24)])
        y.append(3)

    # Minor crime incidents -> low
    for _ in range(100):
        X.append([4, 1, np.random.randint(20, 45), 0, np.random.randint(9, 18), 0, 1])
        y.append(0)

    # Child emergencies -> high/critical
    for _ in range(80):
        X.append([0, 1, np.random.randint(1, 10), 0, np.random.randint(0, 24), 0, 1])
        y.append(np.random.choice([2, 3]))

    return np.array(X), np.array(y)


class SeverityPredictor:
    def __init__(self):
        self.model: RandomForestClassifier = None
        self.feature_names = ["incident_type", "victim_count", "age", "is_highway", "hour_of_day", "hour_sin", "hour_cos"]
        self.accuracy: float = 0.0
        self.report: str = ""
        self.is_loaded = False

    def train(self):
        """Train the Random Forest model on synthetic data."""
        print("Training severity prediction model...")
        X, y = generate_training_data()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=4,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        self.accuracy = accuracy_score(y_test, y_pred)
        self.report = classification_report(y_test, y_pred, target_names=["low", "medium", "high", "critical"])
        self.is_loaded = True

        print(f"Model trained. Accuracy: {self.accuracy:.2%}")
        print(self.report)

        # Save model
        joblib.dump(self.model, MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")

    def load(self):
        """Load pre-trained model from disk."""
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.is_loaded = True
            print(f"Model loaded from {MODEL_PATH}")
            return True
        return False

    def initialize(self):
        """Load model from disk or train new one."""
        if not self.load():
            self.train()

    def predict(self, incident_type: str, victim_count: int, age: int, is_highway: bool, hour_of_day: int) -> Dict:
        """Predict severity for an incident."""
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model not initialized")

        incident_type_encoded = INCIDENT_TYPE_MAP.get(incident_type.lower(), 0)
        hour_sin = np.sin(2 * np.pi * hour_of_day / 24)
        hour_cos = np.cos(2 * np.pi * hour_of_day / 24)

        features = np.array([[
            incident_type_encoded,
            max(1, min(500, victim_count)),
            max(1, min(120, age)),
            int(is_highway),
            max(0, min(23, hour_of_day)),
            hour_sin,
            hour_cos,
        ]])

        probabilities = self.model.predict_proba(features)[0]
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])
        severity = SEVERITY_MAP[predicted_class]

        return {
            "severity": severity,
            "confidence": round(confidence, 4),
            "recommendation": RECOMMENDATIONS[severity],
            "probabilities": {
                "low": round(float(probabilities[0]), 4),
                "medium": round(float(probabilities[1]), 4),
                "high": round(float(probabilities[2]), 4),
                "critical": round(float(probabilities[3]), 4),
            },
        }

    @property
    def feature_importances(self) -> Dict:
        if not self.is_loaded:
            return {}
        importances = self.model.feature_importances_
        return dict(zip(self.feature_names, [round(float(imp), 4) for imp in importances]))


# Singleton predictor instance
predictor = SeverityPredictor()
