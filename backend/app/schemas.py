"""Request schemas and the OpenRouter JSON schema for structured graph output.

The shapes here mirror `src/lib/graphSchema.ts` and the inline types in
`netlify/functions/generate.ts`. We intentionally accept the inbound graph
blobs as `dict` rather than validating their shape — they are echoed back
into the prompt as JSON, not operated on — which keeps the backend tolerant
of any frontend schema drift.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: Literal["user", "assistant"]
    content: str


class AthleteContext(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    firstName: Optional[str] = None
    position: Optional[str] = None
    schoolYear: Optional[str] = None
    age: Optional[int] = None
    tagline: Optional[str] = None
    masteredIds: Optional[list[str]] = None
    readiness: Optional[int] = None


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mode: Optional[Literal["sport", "athlete"]] = None
    sport: str
    requirements: str = ""
    history: list[ChatMessage] = Field(default_factory=list)
    currentGraph: Optional[list[dict[str, Any]]] = None
    baseGraph: Optional[list[dict[str, Any]]] = None
    athleteContext: Optional[AthleteContext] = None


GRAPH_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "chatReply": {"type": "string"},
        "graph": {
            "type": "object",
            "properties": {
                "skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "level": {"type": "integer", "minimum": 1, "maximum": 6},
                            "prereqs": {"type": "array", "items": {"type": "string"}},
                            "sport": {"type": "string"},
                            "summary": {"type": "string"},
                            "diagnosticPrompt": {"type": "string"},
                        },
                        "required": [
                            "id",
                            "label",
                            "level",
                            "prereqs",
                            "sport",
                            "summary",
                            "diagnosticPrompt",
                        ],
                        "additionalProperties": False,
                    },
                },
                "athletes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "displayName": {"type": "string"},
                            "firstName": {"type": "string"},
                            "age": {"type": "integer", "minimum": 14, "maximum": 17},
                            "position": {"type": "string"},
                            "schoolYear": {"type": "string"},
                            "sport": {"type": "string"},
                            "avatarColor": {"type": "string"},
                            "tagline": {"type": "string"},
                            "mastery": {"type": "array", "items": {"type": "string"}},
                            "readiness": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                            },
                        },
                        "required": [
                            "id",
                            "displayName",
                            "firstName",
                            "age",
                            "position",
                            "schoolYear",
                            "sport",
                            "avatarColor",
                            "tagline",
                            "mastery",
                            "readiness",
                        ],
                        "additionalProperties": False,
                    },
                },
                "tasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "shortLabel": {"type": "string"},
                            "title": {"type": "string"},
                            "detail": {"type": "string"},
                            "sport": {"type": "string"},
                            "technique": {
                                "type": "string",
                                "enum": [
                                    "Knowledge graph",
                                    "Physical frontier",
                                    "Expert tutor / autoregulation",
                                    "Objective readiness",
                                    "Spaced repetition",
                                    "Interleaving",
                                    "Testing effect",
                                    "Non-interference",
                                    "Automaticity",
                                    "Encompassings",
                                ],
                            },
                            "skillId": {"type": "string"},
                            "xp": {"type": "integer", "minimum": 1, "maximum": 100},
                            "rationale": {"type": "string"},
                        },
                        "required": [
                            "id",
                            "shortLabel",
                            "title",
                            "detail",
                            "sport",
                            "technique",
                            "skillId",
                            "xp",
                            "rationale",
                        ],
                        "additionalProperties": False,
                    },
                },
                "skillShortLabels": {
                    "type": "object",
                    "additionalProperties": {"type": "string"},
                },
            },
            "required": ["skills", "athletes", "tasks", "skillShortLabels"],
            "additionalProperties": False,
        },
    },
    "required": ["chatReply", "graph"],
    "additionalProperties": False,
}
