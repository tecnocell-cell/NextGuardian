"""Validate the OpenAPI contract and reject oversized/private heartbeat payloads."""
import json
from pathlib import Path
from openapi_spec_validator import validate
from jsonschema import Draft202012Validator, FormatChecker

spec = json.loads(Path(__file__).with_name("openapi.json").read_text(encoding="utf-8"))
validate(spec)
schema = spec["components"]["schemas"]["HeartbeatRequest"]
validator = Draft202012Validator(schema, format_checker=FormatChecker())
sample = {
    "deviceId": "f790b44f-3c84-4da5-9c65-0467b38c4b25",
    "appVersion": "0.1.0-demo", "androidVersion": "17",
    "manufacturer": "Demo", "model": "Demo",
    "batteryLevel": None, "networkType": "UNKNOWN",
    "timestamp": "2026-09-11T12:00:00Z",
}
validator.validate(sample)
assert not validator.is_valid(dict(sample, location={"lat": 0, "lon": 0}))
assert not validator.is_valid(dict(sample, batteryLevel=101))
assert not validator.is_valid(dict(sample, deviceId="hardware-serial"))
assert len(spec["paths"]) == 25

# Location is consented data on its own endpoint, never a heartbeat field: a sample
# without consentVersion must be rejected at the contract boundary (doc 16 §3).
# Rooted at the whole document so the schema's internal $refs resolve.
location = Draft202012Validator(
    dict(spec, **{"$ref": "#/components/schemas/LocationSampleInput"}), format_checker=FormatChecker()
)
consented = {
    "latitude": -23.5505, "longitude": -46.6333, "accuracyMeters": 8.0,
    "source": "GPS", "observedAt": "2026-09-15T12:00:00Z", "consentVersion": "2026-09-01",
}
location.validate(consented)
assert not location.is_valid({k: v for k, v in consented.items() if k != "consentVersion"})
assert not location.is_valid(dict(consented, latitude=91))
print("PASS: OpenAPI 3.1 + 4 heartbeat cases + 3 location cases (25 paths).")
