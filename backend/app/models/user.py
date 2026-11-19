"""User account model."""

from __future__ import annotations

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.base import iso_utc, utcnow


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(190), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    student_id = db.Column(db.String(40))
    faculty = db.Column(db.String(120))
    study_year = db.Column(db.String(40))
    plan = db.Column(db.String(60), nullable=False, default="Tài khoản sinh viên")
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    assessments = db.relationship(
        "Assessment",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Assessment.created_at.desc()",
    )
    recommendation_states = db.relationship(
        "UserRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # -- password helpers -------------------------------------------------
    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    # -- presentation -----------------------------------------------------
    @property
    def first_name(self) -> str:
        parts = [part for part in self.full_name.split() if part]
        if not parts:
            return self.full_name
        return " ".join(parts[-2:])

    @property
    def initials(self) -> str:
        parts = [part for part in self.full_name.split() if part]
        if not parts:
            return "SV"
        picked = parts[-2:] if len(parts) > 1 else parts
        return "".join(part[0].upper() for part in picked)

    def to_dict(self, stats: dict | None = None) -> dict:
        data = {
            "id": self.id,
            "fullName": self.full_name,
            "firstName": self.first_name,
            "initials": self.initials,
            "email": self.email,
            "studentId": self.student_id or "",
            "faculty": self.faculty or "",
            "year": self.study_year or "",
            "plan": self.plan,
            "joinedAt": self.created_at.date().isoformat() if self.created_at else None,
            "createdAt": iso_utc(self.created_at),
        }
        if stats:
            data.update(stats)
        return data
